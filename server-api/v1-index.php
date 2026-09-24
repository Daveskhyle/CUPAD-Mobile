<?php
declare(strict_types=1);
require_once __DIR__ . '/bootstrap.php';

$path = trim(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH), '/');
$method = $_SERVER['REQUEST_METHOD'];
$parts = $path === '' ? [] : explode('/', $path);
while ($parts && ($parts[0] === 'api' || $parts[0] === 'v1')) array_shift($parts);
$route = implode('/', $parts);

/** Accept either JWT or API key */
function requireAuth(): array {
    $token = getBearerToken();
    if ($token) {
        $jwt = jwtDecode($token);
        if ($jwt) return ['type' => 'jwt', 'payload' => $jwt];
        // Bearer might be API key
        if (defined('API_KEY') && hash_equals(API_KEY, $token)) {
            return ['type' => 'key', 'payload' => []];
        }
    }
    $key = $_SERVER['HTTP_X_API_KEY'] ?? '';
    if ($key !== '' && defined('API_KEY') && hash_equals(API_KEY, $key)) {
        return ['type' => 'key', 'payload' => []];
    }
    respond(['success' => false, 'error' => 'Authentication required'], 401);
}

function currentUser(array $auth): ?array {
    if (($auth['type'] ?? '') !== 'jwt') return null;
    $id = (int)($auth['payload']['sub'] ?? 0);
    if ($id <= 0) return null;
    $s = db()->prepare('SELECT id, username, name, full_name, email, phone, role, branch_id, area_id, zone_id, status FROM users WHERE id=? LIMIT 1');
    $s->execute([$id]);
    return $s->fetch() ?: null;
}

function genTxnId(string $prefix = 'TX'): string {
    return $prefix . date('YmdHis') . substr((string)mt_rand(1000, 9999), 0, 4);
}

// ---------- Health ----------
if ($method === 'GET' && $route === 'health') {
    try {
        db()->query('SELECT 1');
        respond(['success' => true, 'service' => 'CUPAD API', 'version' => '1.2.0', 'database' => 'ok']);
    } catch (Throwable $e) {
        respond(['success' => false, 'database' => 'error'], 503);
    }
}

if ($method === 'GET' && $route === 'test') {
    requireAuth();
    try {
        db()->query('SELECT 1');
        respond(['success' => true, 'authenticated' => true, 'service' => 'CUPAD API', 'version' => '1.2.0', 'database' => 'ok', 'time' => date('c')]);
    } catch (Throwable $e) {
        respond(['success' => false, 'authenticated' => true, 'database' => 'error'], 503);
    }
}

if ($method === 'GET' && $route === 'openapi.json') {
    requireAuth();
    header('Content-Type: application/json; charset=utf-8');
    echo file_get_contents(dirname(__DIR__) . '/openapi.json');
    exit;
}

// ---------- Auth ----------
if ($method === 'POST' && $route === 'auth/login') {
    $b = jsonBody();
    $username = trim((string)($b['username'] ?? ''));
    $password = (string)($b['password'] ?? '');
    if ($username === '' || $password === '') respond(['success' => false, 'error' => 'username and password are required'], 422);
    $s = db()->prepare("SELECT id,username,password,name,full_name,email,phone,role,branch_id,area_id,zone_id,status FROM users WHERE username=? LIMIT 1");
    $s->execute([$username]);
    $u = $s->fetch();
    if (!$u || $u['status'] !== 'active' || !(password_verify($password, (string)$u['password']) || hash_equals((string)$u['password'], $password)))
        respond(['success' => false, 'error' => 'Invalid credentials'], 401);
    $now = time();
    $token = jwtEncode(['sub' => (int)$u['id'], 'username' => $u['username'], 'role' => $u['role'], 'iat' => $now, 'exp' => $now + 86400]);
    unset($u['password']);
    respond(['success' => true, 'token' => $token, 'expires_at' => date('c', $now + 86400), 'user' => $u]);
}

if ($method === 'GET' && $route === 'me') {
    $auth = requireJwt();
    $s = db()->prepare('SELECT id,username,name,full_name,email,phone,role,branch_id,area_id,zone_id,profile_pic,status,last_login FROM users WHERE id=?');
    $s->execute([(int)$auth['sub']]);
    respond(['success' => true, 'data' => $s->fetch() ?: null]);
}

// ---------- Clients (JWT or API key) ----------
if ($method === 'GET' && $route === 'clients') {
    $auth = requireAuth();
    $user = currentUser($auth);
    $q = trim((string)($_GET['q'] ?? ''));
    $limit = min(100, max(1, (int)($_GET['limit'] ?? 20)));
    $offset = max(0, (int)($_GET['offset'] ?? 0));

    $where = 'deleted_at IS NULL';
    $params = [];

    // Scope by officer role when JWT
    if ($user) {
        $role = strtolower((string)$user['role']);
        if ($role === 'co') {
            $where .= ' AND officer_username = ?';
            $params[] = $user['username'];
        } elseif ($role === 'bm' && !empty($user['branch_id'])) {
            $where .= ' AND branch_id = ?';
            $params[] = $user['branch_id'];
        } elseif ($role === 'am' && !empty($user['area_id'])) {
            $where .= ' AND branch_id IN (SELECT id FROM branches WHERE area_id = ?)';
            $params[] = $user['area_id'];
        } elseif (in_array($role, ['zm', 'dzm', 'tm'], true) && !empty($user['zone_id'])) {
            $where .= ' AND branch_id IN (SELECT id FROM branches WHERE zone_id = ? OR area_id IN (SELECT id FROM areas WHERE zone_id = ?))';
            $params[] = $user['zone_id'];
            $params[] = $user['zone_id'];
        }
        // admin: no extra scope
    }

    if ($q !== '') {
        $where .= ' AND (id LIKE ? OR name LIKE ? OR phone LIKE ?)';
        $like = '%' . $q . '%';
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
    }

    $count = db()->prepare("SELECT COUNT(*) FROM clients WHERE $where");
    $count->execute($params);
    $total = (int)$count->fetchColumn();

    $sql = "SELECT id, name, phone, email, `union`, branch_id, officer_username, client_type, plan_id, status, date_registered
            FROM clients WHERE $where ORDER BY name LIMIT $limit OFFSET $offset";
    $s = db()->prepare($sql);
    $s->execute($params);
    respond([
        'success' => true,
        'data' => $s->fetchAll(),
        'pagination' => [
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset,
            'has_more' => $offset + $limit < $total,
        ],
    ]);
}

if ($method === 'GET' && preg_match('#^clients/([^/]+)/portfolio$#', $route, $m)) {
    requireAuth();
    respond(['success' => true, 'data' => portfolioData($m[1])]);
}

if ($method === 'GET' && preg_match('#^clients/([^/]+)/savings$#', $route, $m)) {
    requireAuth();
    $id = $m[1];
    if (!clientExists($id)) respond(['success' => false, 'error' => 'Client not found'], 404);
    $s = db()->prepare('SELECT * FROM savings WHERE client_id=? ORDER BY created_at DESC');
    $s->execute([$id]);
    respond(['success' => true, 'data' => $s->fetchAll()]);
}

if ($method === 'GET' && preg_match('#^clients/([^/]+)/loans$#', $route, $m)) {
    requireAuth();
    $id = $m[1];
    if (!clientExists($id)) respond(['success' => false, 'error' => 'Client not found'], 404);
    $s = db()->prepare('SELECT id, principal, interest_rate, total_payable, remaining_balance, num_installments, loan_term_type, date, due_date, payoff_date, status FROM disbursements WHERE client_id=? ORDER BY date DESC');
    $s->execute([$id]);
    respond(['success' => true, 'data' => $s->fetchAll()]);
}

if ($method === 'GET' && preg_match('#^clients/([^/]+)/transactions$#', $route, $m)) {
    requireAuth();
    $id = $m[1];
    if (!clientExists($id)) respond(['success' => false, 'error' => 'Client not found'], 404);
    $s = db()->prepare("SELECT transaction_id, 'savings' source, amount, type, date, balance_after, notes FROM saving_collections WHERE client_id=?
                        UNION ALL
                        SELECT transaction_id, 'loan' source, amount_collected amount, type, date, remaining_balance balance_after, notes FROM loan_collections WHERE client_id=?
                        ORDER BY date DESC LIMIT 200");
    $s->execute([$id, $id]);
    respond(['success' => true, 'data' => $s->fetchAll()]);
}

if ($method === 'GET' && preg_match('#^portfolio/([^/]+)$#', $route, $m)) {
    requireAuth();
    respond(['success' => true, 'data' => portfolioData($m[1])]);
}

// ---------- Dashboard stats (JWT) – matches CO PHP dashboard ----------
if ($method === 'GET' && $route === 'dashboard/stats') {
    $auth = requireJwt();
    $user = currentUser(['type' => 'jwt', 'payload' => $auth]);
    if (!$user) respond(['success' => false, 'error' => 'User not found'], 404);

    $pdo = db();
    $role = strtolower((string)$user['role']);
    $officer = $user['username'];
    $today = date('Y-m-d');
    $monthStart = date('Y-m-01');
    $currentMonth = date('Y-m');

    // Location names
    $branch_name = $area_name = $zone_name = null;
    try {
        $s = $pdo->prepare("SELECT b.name as branch_name, a.name as area_name, z.name as zone_name
            FROM users u
            LEFT JOIN branches b ON u.branch_id = b.id
            LEFT JOIN areas a ON u.area_id = a.id
            LEFT JOIN zones z ON u.zone_id = z.id
            WHERE u.id = ?");
        $s->execute([(int)$user['id']]);
        $loc = $s->fetch() ?: [];
        $branch_name = $loc['branch_name'] ?? null;
        $area_name = $loc['area_name'] ?? null;
        $zone_name = $loc['zone_name'] ?? null;
    } catch (Throwable $e) { /* ignore */ }

    // Officer-scoped stats (CO-style) when role is co; broader scope for managers
    $isCo = ($role === 'co');

    $monthly_savings = 0.0;
    $monthly_disbursed = 0.0;
    $active_loans_count = 0;
    $grand_savings = 0.0;
    $grand_loans = 0.0;
    $clients_count = 0;
    $savings_today = 0.0;
    $collected_today = 0.0;
    $collected_month = 0.0;
    $unions = [];

    try {
        if ($isCo) {
            $s = $pdo->prepare("SELECT COALESCE(SUM(CASE WHEN amount < 0 OR LOWER(COALESCE(type,'')) IN ('withdrawal','return','adjust') THEN -ABS(amount) ELSE amount END), 0)
                FROM saving_collections WHERE officer = ? AND DATE_FORMAT(date, '%Y-%m') = ?");
            $s->execute([$officer, $currentMonth]);
            $monthly_savings = (float)$s->fetchColumn();
        } else {
            // broader handled below via client filter
        }
    } catch (Throwable $e) { /* ignore */ }

    try {
        if ($isCo) {
            $s = $pdo->prepare("SELECT COALESCE(SUM(principal),0) FROM disbursements WHERE officer = ? AND DATE_FORMAT(date, '%Y-%m') = ?");
            $s->execute([$officer, $currentMonth]);
            $monthly_disbursed = (float)$s->fetchColumn();
        }
    } catch (Throwable $e) { /* ignore */ }

    try {
        if ($isCo) {
            $s = $pdo->prepare("SELECT COUNT(DISTINCT client_id) FROM disbursements WHERE officer = ? AND (status IS NULL OR status != 'completed') AND remaining_balance > 0");
            $s->execute([$officer]);
            $active_loans_count = (int)$s->fetchColumn();
        }
    } catch (Throwable $e) { /* ignore */ }

    // Portfolio totals + unions (CO uses officer_username on clients)
    try {
        if ($isCo) {
            // Prefer saving_balances table like PHP dashboard
            $sql = "SELECT c.id, c.`union`,
                    COALESCE((SELECT balance FROM saving_balances WHERE client_id = c.id LIMIT 1), 0) as total_savings,
                    COALESCE(l.active_balance, 0) as loan_balance
                FROM clients c
                LEFT JOIN (
                    SELECT client_id, SUM(remaining_balance) as active_balance
                    FROM disbursements
                    WHERE (status IS NULL OR status != 'completed') AND remaining_balance > 0
                    GROUP BY client_id
                ) l ON c.id = l.client_id
                WHERE c.officer_username = ? AND (c.status = 'active' OR c.status IS NULL) AND (c.deleted_at IS NULL OR c.deleted_at = '')";
            try {
                $s = $pdo->prepare($sql);
                $s->execute([$officer]);
            } catch (Throwable $e) {
                // fallback without saving_balances
                $sql = "SELECT c.id, c.`union`,
                        COALESCE((SELECT SUM(CASE WHEN amount < 0 OR LOWER(COALESCE(type,'')) IN ('withdrawal','return','adjust') THEN -ABS(amount) ELSE amount END) FROM saving_collections WHERE client_id = c.id), 0) as total_savings,
                        COALESCE(l.active_balance, 0) as loan_balance
                    FROM clients c
                    LEFT JOIN (
                        SELECT client_id, SUM(remaining_balance) as active_balance
                        FROM disbursements WHERE remaining_balance > 0 GROUP BY client_id
                    ) l ON c.id = l.client_id
                    WHERE c.officer_username = ? AND (c.deleted_at IS NULL OR c.deleted_at = '')";
                $s = $pdo->prepare($sql);
                $s->execute([$officer]);
            }
            $union_raw = [];
            while ($row = $s->fetch()) {
                $sav = (float)($row['total_savings'] ?? 0);
                $loan = (float)($row['loan_balance'] ?? 0);
                $grand_savings += $sav;
                $grand_loans += $loan;
                $clients_count++;
                $u_name = trim((string)($row['union'] ?? ''));
                if ($u_name === '') $u_name = 'Unassigned';
                else $u_name = ucwords(strtolower($u_name));
                if (!isset($union_raw[$u_name])) {
                    $union_raw[$u_name] = ['name' => $u_name, 'clients' => 0, 'savings' => 0, 'loans' => 0];
                }
                $union_raw[$u_name]['clients']++;
                $union_raw[$u_name]['savings'] += $sav;
                $union_raw[$u_name]['loans'] += $loan;
            }
            ksort($union_raw);
            $unions = array_values($union_raw);
        }
    } catch (Throwable $e) { /* ignore */ }

    // Today savings / loan collections for CO
    try {
        if ($isCo) {
            $s = $pdo->prepare("SELECT COALESCE(SUM(CASE WHEN amount > 0 AND LOWER(COALESCE(type,'')) NOT IN ('withdrawal','return','adjust') THEN amount ELSE 0 END),0)
                FROM saving_collections WHERE officer = ? AND CAST(date AS DATE) = ?");
            $s->execute([$officer, $today]);
            $savings_today = (float)$s->fetchColumn();
            $s = $pdo->prepare("SELECT COALESCE(SUM(amount_collected),0) FROM loan_collections WHERE officer = ? AND CAST(date AS DATE) = ?");
            $s->execute([$officer, $today]);
            $collected_today = (float)$s->fetchColumn();
            $s = $pdo->prepare("SELECT COALESCE(SUM(amount_collected),0) FROM loan_collections WHERE officer = ? AND DATE_FORMAT(date, '%Y-%m') = ?");
            $s->execute([$officer, $currentMonth]);
            $collected_month = (float)$s->fetchColumn();
        }
    } catch (Throwable $e) { /* ignore */ }

    // Non-CO / manager scope (existing logic expanded)
    if (!$isCo) {
        $clientFilter = '1=1';
        $params = [];
        if ($role === 'bm' && !empty($user['branch_id'])) {
            $clientFilter = 'c.branch_id = ?';
            $params[] = $user['branch_id'];
        } elseif ($role === 'am' && !empty($user['area_id'])) {
            $clientFilter = 'c.branch_id IN (SELECT id FROM branches WHERE area_id = ?)';
            $params[] = $user['area_id'];
        } elseif (in_array($role, ['zm', 'dzm', 'tm'], true) && !empty($user['zone_id'])) {
            $clientFilter = 'c.branch_id IN (SELECT id FROM branches WHERE zone_id = ? OR area_id IN (SELECT id FROM areas WHERE zone_id = ?))';
            $params[] = $user['zone_id'];
            $params[] = $user['zone_id'];
        }
        try {
            $s = $pdo->prepare("SELECT COUNT(*) FROM clients c WHERE (c.deleted_at IS NULL OR c.deleted_at = '') AND $clientFilter");
            $s->execute($params);
            $clients_count = (int)$s->fetchColumn();
        } catch (Throwable $e) {}
        try {
            $s = $pdo->prepare("SELECT COALESCE(SUM(sc.amount),0) FROM saving_collections sc JOIN clients c ON sc.client_id=c.id
                WHERE CAST(sc.date AS DATE) BETWEEN ? AND ? AND $clientFilter
                AND sc.amount > 0 AND LOWER(COALESCE(sc.type,'')) NOT IN ('withdrawal','return','adjust')");
            $s->execute(array_merge([$monthStart, $today], $params));
            $monthly_savings = (float)$s->fetchColumn();
        } catch (Throwable $e) {}
        try {
            $s = $pdo->prepare("SELECT COALESCE(SUM(d.principal),0) FROM disbursements d JOIN clients c ON d.client_id=c.id
                WHERE DATE_FORMAT(d.date,'%Y-%m') = ? AND $clientFilter");
            $s->execute(array_merge([$currentMonth], $params));
            $monthly_disbursed = (float)$s->fetchColumn();
        } catch (Throwable $e) {}
        try {
            $s = $pdo->prepare("SELECT COUNT(DISTINCT d.client_id) FROM disbursements d JOIN clients c ON d.client_id=c.id
                WHERE d.remaining_balance > 0 AND $clientFilter");
            $s->execute($params);
            $active_loans_count = (int)$s->fetchColumn();
        } catch (Throwable $e) {}
        try {
            $s = $pdo->prepare("SELECT COALESCE(SUM(d.remaining_balance),0) FROM disbursements d JOIN clients c ON d.client_id=c.id
                WHERE d.remaining_balance > 0 AND $clientFilter");
            $s->execute($params);
            $grand_loans = (float)$s->fetchColumn();
        } catch (Throwable $e) {}
        try {
            $s = $pdo->prepare("SELECT COALESCE(SUM(amount_collected),0) FROM loan_collections lc JOIN clients c ON lc.client_id=c.id
                WHERE CAST(lc.date AS DATE) = ? AND $clientFilter");
            $s->execute(array_merge([$today], $params));
            $collected_today = (float)$s->fetchColumn();
        } catch (Throwable $e) {}
        try {
            $s = $pdo->prepare("SELECT COALESCE(SUM(CASE WHEN sc.amount > 0 AND LOWER(COALESCE(sc.type,'')) NOT IN ('withdrawal','return','adjust') THEN sc.amount ELSE 0 END),0)
                FROM saving_collections sc JOIN clients c ON sc.client_id=c.id WHERE CAST(sc.date AS DATE)=? AND $clientFilter");
            $s->execute(array_merge([$today], $params));
            $savings_today = (float)$s->fetchColumn();
        } catch (Throwable $e) {}
    }

    $grand_net = $grand_savings - $grand_loans;

    respond([
        'success' => true,
        'data' => [
            // CO PHP dashboard parity
            'monthly_net_savings' => $monthly_savings,
            'monthly_disbursed' => $monthly_disbursed,
            'active_loans' => $active_loans_count,
            'total_savings' => $grand_savings,
            'total_loans_outstanding' => $grand_loans,
            'portfolio_net' => $grand_net,
            'clients' => $clients_count,
            'savings_today' => $savings_today,
            'collected_today' => $collected_today,
            'collected_month' => $collected_month,
            // aliases used by older mobile code
            'net_savings_month' => $monthly_savings,
            'outstanding' => $grand_loans,
            // location
            'branch_name' => $branch_name,
            'area_name' => $area_name,
            'zone_name' => $zone_name,
            'unions' => $unions,
            'as_of' => date('c'),
        ],
    ]);
}

// ---------- Officer activity history ----------
if ($method === 'GET' && $route === 'activities') {
    $auth = requireJwt();
    $user = currentUser(['type' => 'jwt', 'payload' => $auth]);
    if (!$user) respond(['success' => false, 'error' => 'User not found'], 404);
    $officer = $user['username'];
    $limit = min(100, max(1, (int)($_GET['limit'] ?? 30)));

    $sql = "SELECT * FROM (
                SELECT 'Saving' as type, c.name as client_name, ABS(sc.amount) as amount, sc.date, sc.officer, sc.transaction_id
                FROM saving_collections sc JOIN clients c ON sc.client_id = c.id
                WHERE sc.officer = ? AND (sc.amount > 0 AND LOWER(COALESCE(sc.type,'')) NOT IN ('withdrawal','return','adjust'))
                UNION ALL
                SELECT 'Withdrawal' as type, c.name, ABS(sc.amount), sc.date, sc.officer, sc.transaction_id
                FROM saving_collections sc JOIN clients c ON sc.client_id = c.id
                WHERE sc.officer = ? AND (sc.amount < 0 OR LOWER(COALESCE(sc.type,'')) IN ('withdrawal','return','adjust'))
                UNION ALL
                SELECT 'Payment' as type, c.name, lc.amount_collected, lc.date, lc.officer, lc.transaction_id
                FROM loan_collections lc JOIN clients c ON lc.client_id = c.id
                WHERE lc.officer = ?
                UNION ALL
                SELECT 'Disbursement' as type, c.name, d.principal, d.date, d.officer, CAST(d.id AS CHAR)
                FROM disbursements d JOIN clients c ON d.client_id = c.id
                WHERE d.officer = ?
            ) t ORDER BY date DESC LIMIT $limit";
    try {
        $s = db()->prepare($sql);
        $s->execute([$officer, $officer, $officer, $officer]);
        respond(['success' => true, 'data' => $s->fetchAll()]);
    } catch (Throwable $e) {
        respond(['success' => true, 'data' => [], 'warning' => $e->getMessage()]);
    }
}

// ---------- WRITE: Savings collection ----------
if ($method === 'POST' && $route === 'savings/collect') {
    $auth = requireJwt();
    $user = currentUser(['type' => 'jwt', 'payload' => $auth]);
    if (!$user) respond(['success' => false, 'error' => 'User not found'], 404);
    $b = jsonBody();
    $clientId = trim((string)($b['client_id'] ?? ''));
    $amount = (float)($b['amount'] ?? 0);
    $notes = trim((string)($b['notes'] ?? ''));
    if ($clientId === '' || $amount <= 0) respond(['success' => false, 'error' => 'client_id and positive amount required'], 422);
    if (!clientExists($clientId)) respond(['success' => false, 'error' => 'Client not found'], 404);

    $txn = genTxnId('SV');
    $pdo = db();
    try {
        $pdo->beginTransaction();
        $s = $pdo->prepare("INSERT INTO saving_collections (client_id, amount, type, date, officer, notes, transaction_id)
                            VALUES (?, ?, 'deposit', NOW(), ?, ?, ?)");
        $s->execute([$clientId, $amount, $user['username'], $notes, $txn]);
        // Update savings balance if table supports it
        try {
            $pdo->prepare("UPDATE savings SET balance = balance + ? WHERE client_id = ? AND status <> 'closed'")
                ->execute([$amount, $clientId]);
        } catch (Throwable $e) { /* optional */ }
        $pdo->commit();
        respond(['success' => true, 'transaction_id' => $txn, 'message' => 'Savings collected']);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        respond(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

// ---------- WRITE: Savings withdrawal ----------
if ($method === 'POST' && $route === 'savings/withdraw') {
    $auth = requireJwt();
    $user = currentUser(['type' => 'jwt', 'payload' => $auth]);
    if (!$user) respond(['success' => false, 'error' => 'User not found'], 404);
    $b = jsonBody();
    $clientId = trim((string)($b['client_id'] ?? ''));
    $amount = (float)($b['amount'] ?? 0);
    $notes = trim((string)($b['notes'] ?? $b['reason'] ?? ''));
    if ($clientId === '' || $amount <= 0) respond(['success' => false, 'error' => 'client_id and positive amount required'], 422);
    if (!clientExists($clientId)) respond(['success' => false, 'error' => 'Client not found'], 404);

    $txn = genTxnId('WD');
    $pdo = db();
    try {
        $pdo->beginTransaction();
        $s = $pdo->prepare("INSERT INTO saving_collections (client_id, amount, type, date, officer, notes, transaction_id)
                            VALUES (?, ?, 'withdrawal', NOW(), ?, ?, ?)");
        $s->execute([$clientId, -abs($amount), $user['username'], $notes, $txn]);
        try {
            $pdo->prepare("UPDATE savings SET balance = balance - ? WHERE client_id = ? AND status <> 'closed'")
                ->execute([abs($amount), $clientId]);
        } catch (Throwable $e) { /* optional */ }
        $pdo->commit();
        respond(['success' => true, 'transaction_id' => $txn, 'message' => 'Withdrawal recorded']);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        respond(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

// ---------- WRITE: Loan collection ----------
if ($method === 'POST' && $route === 'loans/collect') {
    $auth = requireJwt();
    $user = currentUser(['type' => 'jwt', 'payload' => $auth]);
    if (!$user) respond(['success' => false, 'error' => 'User not found'], 404);
    $b = jsonBody();
    $clientId = trim((string)($b['client_id'] ?? ''));
    $amount = (float)($b['amount'] ?? 0);
    $notes = trim((string)($b['notes'] ?? ''));
    $loanId = $b['loan_id'] ?? null;
    if ($clientId === '' || $amount <= 0) respond(['success' => false, 'error' => 'client_id and positive amount required'], 422);
    if (!clientExists($clientId)) respond(['success' => false, 'error' => 'Client not found'], 404);

    $txn = genTxnId('LP');
    $pdo = db();
    try {
        $pdo->beginTransaction();
        // Find active loan if not specified
        if (!$loanId) {
            $s = $pdo->prepare("SELECT id, remaining_balance FROM disbursements WHERE client_id=? AND remaining_balance > 0 ORDER BY date DESC LIMIT 1");
            $s->execute([$clientId]);
            $loan = $s->fetch();
            $loanId = $loan['id'] ?? null;
            $remaining = (float)($loan['remaining_balance'] ?? 0);
        } else {
            $s = $pdo->prepare("SELECT remaining_balance FROM disbursements WHERE id=? AND client_id=?");
            $s->execute([$loanId, $clientId]);
            $remaining = (float)$s->fetchColumn();
        }
        $newBal = max(0, $remaining - $amount);
        $s = $pdo->prepare("INSERT INTO loan_collections (client_id, amount_collected, type, date, officer, notes, transaction_id, remaining_balance)
                            VALUES (?, ?, 'repayment', NOW(), ?, ?, ?, ?)");
        $s->execute([$clientId, $amount, $user['username'], $notes, $txn, $newBal]);
        if ($loanId) {
            $pdo->prepare("UPDATE disbursements SET remaining_balance = ? WHERE id = ?")->execute([$newBal, $loanId]);
        }
        $pdo->commit();
        respond(['success' => true, 'transaction_id' => $txn, 'remaining_balance' => $newBal, 'message' => 'Loan payment recorded']);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        respond(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

// ---------- WRITE: Disbursement ----------
if ($method === 'POST' && $route === 'loans/disburse') {
    $auth = requireJwt();
    $user = currentUser(['type' => 'jwt', 'payload' => $auth]);
    if (!$user) respond(['success' => false, 'error' => 'User not found'], 404);
    $b = jsonBody();
    $clientId = trim((string)($b['client_id'] ?? ''));
    $principal = (float)($b['principal'] ?? 0);
    $interest = (float)($b['interest_rate'] ?? 0);
    $installments = max(1, (int)($b['num_installments'] ?? 12));
    $termType = in_array($b['loan_term_type'] ?? '', ['daily', 'weekly', 'monthly'], true)
        ? $b['loan_term_type'] : 'weekly';
    if ($clientId === '' || $principal <= 0) respond(['success' => false, 'error' => 'client_id and principal required'], 422);
    if (!clientExists($clientId)) respond(['success' => false, 'error' => 'Client not found'], 404);

    $total = $principal * (1 + $interest / 100);
    $pdo = db();
    try {
        $s = $pdo->prepare("INSERT INTO disbursements
            (client_id, principal, interest_rate, total_payable, remaining_balance, num_installments, loan_term_type, date, officer, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, 'active')");
        $s->execute([$clientId, $principal, $interest, $total, $total, $installments, $termType, $user['username']]);
        $id = (int)$pdo->lastInsertId();
        respond(['success' => true, 'disbursement_id' => $id, 'total_payable' => $total, 'message' => 'Loan disbursed']);
    } catch (Throwable $e) {
        respond(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

// ---------- WRITE: Register client ----------
if ($method === 'POST' && $route === 'clients/register') {
    $auth = requireJwt();
    $user = currentUser(['type' => 'jwt', 'payload' => $auth]);
    if (!$user) respond(['success' => false, 'error' => 'User not found'], 404);
    $b = jsonBody();
    $name = trim((string)($b['name'] ?? ''));
    $phone = trim((string)($b['phone'] ?? ''));
    $email = trim((string)($b['email'] ?? ''));
    $address = trim((string)($b['address'] ?? ''));
    $clientType = in_array($b['client_type'] ?? '', ['individual', 'group'], true) ? $b['client_type'] : 'individual';
    $regFee = (float)($b['registration_fee'] ?? 0);
    if ($name === '' || $phone === '') respond(['success' => false, 'error' => 'name and phone required'], 422);

    $id = 'C' . date('ymd') . substr((string)mt_rand(10000, 99999), 0, 5);
    $pdo = db();
    try {
        $s = $pdo->prepare("INSERT INTO clients (id, name, phone, email, branch_id, officer_username, client_type, status, date_registered)
                            VALUES (?, ?, ?, ?, ?, ?, ?, 'active', CURDATE())");
        $s->execute([
            $id,
            $name,
            $phone,
            $email ?: null,
            $user['branch_id'] ?? null,
            $user['username'],
            $clientType,
        ]);
        if ($regFee > 0) {
            try {
                $txn = genTxnId('RG');
                $pdo->prepare("INSERT INTO registrations (client_id, client_name, amount, date, officer) VALUES (?, ?, ?, NOW(), ?)")
                    ->execute([$id, $name, $regFee, $user['username']]);
            } catch (Throwable $e) { /* optional table */ }
        }
        respond(['success' => true, 'client_id' => $id, 'message' => 'Client registered']);
    } catch (Throwable $e) {
        respond(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

respond(['success' => false, 'error' => 'Not found'], 404);

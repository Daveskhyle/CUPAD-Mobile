# CUPAD Mobile API

This API is the compatibility layer between the Expo/React Native application and the existing CUPAD PHP/MySQL application.

## Required production deployment

Deploy `v1-index.php` to the CUPAD server as the mobile API entry point, or route `/api/v1/*` to it through the existing server configuration.

Before production:

1. Point the API at the same CUPAD database used by the existing PHP application.
2. Configure the JWT signing secret outside Git.
3. Enable HTTPS.
4. Verify CORS allows only the intended CUPAD mobile/web origins.
5. Verify every write endpoint against the existing CUPAD authorization and accounting rules.
6. Never expose database credentials or API secrets in the Expo application.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/login` | Authenticate a CUPAD user and issue JWT |
| GET | `/me` | Return the authenticated user |
| GET | `/health` | API health check |
| GET | `/clients` | Role-scoped client search/list |
| GET | `/clients/{id}/portfolio` | Client portfolio summary |
| GET | `/clients/{id}/savings` | Client savings records |
| GET | `/clients/{id}/loans` | Client loans |
| GET | `/clients/{id}/transactions` | Client transactions |
| GET | `/dashboard/stats` | Role-scoped dashboard statistics |
| GET | `/activities` | Officer activity history |
| POST | `/clients/register` | Register a client |
| POST | `/savings/collect` | Record savings collection |
| POST | `/savings/withdraw` | Record savings withdrawal |
| POST | `/loans/collect` | Record loan repayment |
| POST | `/loans/disburse` | Disburse a loan |

All financial write operations must remain subject to the server-side CUPAD authorization, validation and transaction rules. The mobile application is not trusted to enforce those rules by itself.

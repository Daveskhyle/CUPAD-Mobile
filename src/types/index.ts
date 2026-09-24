export interface User {
  id: number;
  username: string;
  name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  role: string;
  branch_id?: string;
  area_id?: string;
  zone_id?: string;
  branch_name?: string | null;
  area_name?: string | null;
  zone_name?: string | null;
  profile_pic?: string | null;
  status?: string;
  last_login?: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  expires_at?: string;
  user?: User;
  error?: string;
}

export interface Client {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  union?: string;
  branch_id?: string;
  officer_username?: string;
  client_type?: string;
  plan_id?: string;
  status?: string;
  date_registered?: string;
}

export interface Portfolio {
  client: Client;
  savings: {
    balance: number;
    total_deposits: number;
  };
  loans: {
    count: number;
    principal: number;
    outstanding: number;
    total_repaid: number;
  };
}

export interface Saving {
  id?: number;
  client_id: string;
  amount?: number;
  balance?: number;
  type?: string;
  status?: string;
  created_at?: string;
  [key: string]: any;
}

export interface Loan {
  id: string | number;
  principal: number;
  interest_rate?: number;
  total_payable?: number;
  remaining_balance: number;
  num_installments?: number;
  loan_term_type?: string;
  date?: string;
  due_date?: string;
  payoff_date?: string;
  status?: string;
}

export interface Transaction {
  transaction_id: string;
  source: 'savings' | 'loan';
  amount: number;
  type: string;
  date: string;
  balance_after?: number;
  notes?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}
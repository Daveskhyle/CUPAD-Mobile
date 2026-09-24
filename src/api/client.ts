import axios, { AxiosError, AxiosInstance } from 'axios';
import { storageDelete, storageGet, storageSet } from '../utils/storage';
import { API_BASE_URL, API_TIMEOUT_MS } from '../constants/config';
import type { ApiResponse, Client, Loan, LoginResponse, Portfolio, Saving, Transaction, User } from '../types';

const TOKEN_KEY = 'cupad_jwt';

export class ApiError extends Error {
  status?: number; code?: string; offline: boolean;
  constructor(message: string, options: { status?: number; code?: string; offline?: boolean } = {}) { super(message); this.name='ApiError'; this.status=options.status; this.code=options.code; this.offline=options.offline??false; }
}
function normalizeError(error: unknown): ApiError { const e=error as AxiosError<any>; const status=e?.response?.status; const serverMessage=e?.response?.data?.error||e?.response?.data?.message; if(!e?.response&&(e?.code==='ERR_NETWORK'||e?.code==='ECONNABORTED'||e?.message?.toLowerCase().includes('network')))return new ApiError('Unable to connect to CUPAD. Check your internet connection.',{code:e.code,offline:true});if(status===401)return new ApiError('Your session has expired. Please sign in again.',{status});if(status===403)return new ApiError(serverMessage||'You do not have permission to perform this action.',{status});if(status===404)return new ApiError(serverMessage||'The requested CUPAD resource was not found.',{status});if(status&&status>=500)return new ApiError('CUPAD server error. Please try again shortly.',{status});return new ApiError(serverMessage||e?.message||'Request failed.',{status,code:e?.code});}
class ApiClient {
  private client: AxiosInstance;
  constructor(){this.client=axios.create({baseURL:API_BASE_URL,timeout:API_TIMEOUT_MS,headers:{'Content-Type':'application/json',Accept:'application/json'}});this.client.interceptors.request.use(async config=>{const token=await storageGet(TOKEN_KEY);if(token)config.headers.Authorization=`Bearer ${token}`;return config;});this.client.interceptors.response.use(r=>r,async(error:AxiosError)=>{if(error.response?.status===401)await this.clearToken();return Promise.reject(normalizeError(error));});}
  async setToken(token:string){await storageSet(TOKEN_KEY,token)} async getToken(){return storageGet(TOKEN_KEY)} async clearToken(){await storageDelete(TOKEN_KEY)}
  async login(username:string,password:string):Promise<LoginResponse>{const{data}=await this.client.post<LoginResponse>('/auth/login',{username,password});if(data.success&&data.token)await this.setToken(data.token);return data}
  async me():Promise<User|null>{const{data}=await this.client.get<{success:boolean;data:User}>('/me');return data.success?data.data:null}
  async updateProfile(payload:{full_name?:string;email?:string;current_password?:string;new_password?:string;profile_pic?:string}):Promise<User>{const{data}=await this.client.post<{success:boolean;data:User;error?:string;message?:string}>('/profile',payload);if(!data.success||!data.data)throw new ApiError(data.error||data.message||'Profile update failed.');return data.data}
  async logout(){await this.clearToken()}
  async getClients(params?:{q?:string;limit?:number;offset?:number}):Promise<ApiResponse<Client[]>>{const{data}=await this.client.get<ApiResponse<Client[]>>('/clients',{params});return data}
  async getAllClients():Promise<Client[]> {
    const all: Client[] = [];
    const limit = 100;
    let offset = 0;
    while (true) {
      const response = await this.getClients({ limit, offset });
      const batch = Array.isArray(response.data) ? response.data : [];
      all.push(...batch);
      if (!response.pagination?.has_more || batch.length === 0) break;
      offset += batch.length;
    }
    return all.filter((client) => String(client.status || '').toLowerCase() === 'active');
  }
  async getPortfolio(clientId:string):Promise<Portfolio>{const{data}=await this.client.get<{success:boolean;data:Portfolio}>(`/clients/${encodeURIComponent(clientId)}/portfolio`);if(!data.success||!data.data)throw new ApiError('Failed to load client portfolio.');return data.data}
  async getSavings(clientId:string):Promise<Saving[]>{const{data}=await this.client.get<ApiResponse<Saving[]>>(`/clients/${encodeURIComponent(clientId)}/savings`);return data.data||[]}
  async getLoans(clientId:string):Promise<Loan[]>{const{data}=await this.client.get<ApiResponse<Loan[]>>(`/clients/${encodeURIComponent(clientId)}/loans`);return data.data||[]}
  async getTransactions(clientId:string):Promise<Transaction[]>{const{data}=await this.client.get<ApiResponse<Transaction[]>>(`/clients/${encodeURIComponent(clientId)}/transactions`);return data.data||[]}
  async getDashboardStats():Promise<any|null>{const{data}=await this.client.get<{success:boolean;data:any}>('/dashboard/stats');return data.success?data.data:null}
  async getActivities(limit=30):Promise<any[]>{const{data}=await this.client.get<ApiResponse<any[]>>('/activities',{params:{limit}});return data.data||[]}
  async getCombinedUnionData(union:string,date:string):Promise<any[]>{
    // The combined endpoint can apply a stricter union/assignment filter than /clients.
    // Load the authorized active client list first, request the combined register without
    // a union restriction, then apply the exact union selected by the mobile UI locally.
    const [response, authorizedClients] = await Promise.all([
      this.client.get<any>('/combined/union-data',{params:{union:'',date}}),
      this.getAllClients()
    ]);
    const data=response.data;
    const rows=Array.isArray(data?.data)?data.data:[];
    const normalizedUnion=String(union||'').trim().toLowerCase();
    const allowedIds=new Set(
      authorizedClients
        .filter(client=>{
          const clientUnion=String(client.union??'').trim().toLowerCase();
          return normalizedUnion==='' ? true : (normalizedUnion==='unassigned' ? clientUnion==='' : clientUnion===normalizedUnion);
        })
        .map(client=>String(client.id))
    );
    const filteredRows=normalizedUnion===''?rows:rows.filter(row=>allowedIds.has(String(row.id)));
    if(data?.settings)Object.defineProperty(filteredRows,'__settings',{value:data.settings,enumerable:false,configurable:true});
    return filteredRows;
  }
  async saveCombinedCollection(payload:{client_id:string;date:string;installment:number;savings_amount:number;withdrawal_type:string;withdrawal_amount:number;notes?:string}){const{data}=await this.client.post('/combined/save',payload);return data}
  async collectSavings(payload:{client_id:string;amount:number;date?:string;notes?:string}){const{data}=await this.client.post('/savings/collect',payload);return data}
  async withdrawSavings(payload:{client_id:string;amount:number;notes?:string;reason?:string}){const{data}=await this.client.post('/savings/withdraw',payload);return data}
  async collectLoan(payload:{client_id:string;amount:number;date?:string;notes?:string;loan_id?:string|number}){const{data}=await this.client.post('/loans/collect',payload);return data}
  async disburseLoan(payload:{client_id:string;principal:number;interest_rate:number;num_installments:number;loan_term_type:string}){const{data}=await this.client.post('/loans/disburse',payload);return data}
  async registerClient(payload:{name:string;phone:string;email?:string;address?:string;client_type?:string;registration_fee?:number}){const{data}=await this.client.post('/clients/register',payload);return data}
  async health():Promise<boolean>{try{const{data}=await this.client.get('/health');return data.success===true}catch{return false}}
}
export const api=new ApiClient();

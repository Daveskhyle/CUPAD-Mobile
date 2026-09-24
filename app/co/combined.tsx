import { useCallback,useEffect,useState } from 'react';
import { ActivityIndicator,Alert,KeyboardAvoidingView,Platform,Pressable,RefreshControl,ScrollView,StyleSheet,Text,TextInput,View } from 'react-native';
import DateTimePicker,{DateTimePickerEvent} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../src/store/auth';
import { useThemeStore } from '../../src/store/theme';
import { api } from '../../src/api/client';
import type { Client } from '../../src/types';

const money=(v:any)=>`₦${Number(v||0).toLocaleString('en-NG',{maximumFractionDigits:0})}`;
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const parseDate=(value:string)=>{const [y,m,d]=value.split('-').map(Number);const x=new Date();x.setHours(12,0,0,0);if(y&&m&&d)x.setFullYear(y,m-1,d);return x};
const formatDate=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

type Row={id:string;name:string;loan:any;savings_balance:number;existing:{loan_amt:number;sav_amt:number;wth_type:string;wth_amt:number}};
type Edit={savings:string;installment:string;installmentCount:string;withdrawalType:string;withdrawal:string};
type Settings={
 max_installments_per_payment:number;min_installments_per_payment:number;grace_period_days:number;allow_partial_payments:number;allow_overpayment:number;
 min_savings_amount:number;max_savings_amount:number;allow_weekend_collection:number;
 max_cash_withdrawal:number;require_image_for_cash:number;allow_weekend_withdrawals:number;max_withdrawals_per_day:number;blocked_withdrawal_types:string|string[];buffer_cash:number;buffer_withdrawal:number;buffer_return:number;
 date_readonly:number;
};
const defaultSettings:Settings={max_installments_per_payment:2,min_installments_per_payment:1,grace_period_days:2,allow_partial_payments:0,allow_overpayment:0,min_savings_amount:100,max_savings_amount:500000,allow_weekend_collection:0,max_cash_withdrawal:50000,require_image_for_cash:1,allow_weekend_withdrawals:0,max_withdrawals_per_day:1,blocked_withdrawal_types:'[]',buffer_cash:10,buffer_withdrawal:10,buffer_return:10,date_readonly:0};
const blank=():Edit=>({savings:'',installment:'',installmentCount:'',withdrawalType:'',withdrawal:''});
const num=(v:any)=>Number(String(v??'').replace(/,/g,''))||0;
const blockedTypes=(s:Settings)=>{try{const v=Array.isArray(s.blocked_withdrawal_types)?s.blocked_withdrawal_types:JSON.parse(String(s.blocked_withdrawal_types||'[]'));return Array.isArray(v)?v.map(x=>String(x).toLowerCase()):[]}catch{return[]}};

export default function CombinedCollectionScreen(){
 const user=useAuthStore(s=>s.user);const colors=useThemeStore(s=>s.colors);
 const [date,setDate]=useState(today());const [showDatePicker,setShowDatePicker]=useState(false);const [clients,setClients]=useState<Client[]>([]);const [unions,setUnions]=useState<string[]>([]);const [activeUnion,setActiveUnion]=useState('');const [rows,setRows]=useState<Row[]>([]);const [edits,setEdits]=useState<Record<string,Edit>>({});const [settings,setSettings]=useState<Settings>(defaultSettings);
const [loading,setLoading]=useState(true);
const [loadingRows,setLoadingRows]=useState(false);
const [saving,setSaving]=useState(false);
const [refreshing,setRefreshing]=useState(false);
 const dateLocked =
   settings.date_readonly === 1 ||
   String(settings.date_readonly).trim().toLowerCase() === '1' ||
   String(settings.date_readonly).trim().toLowerCase() === 'true';

 const loadUnions=useCallback(async()=>{setLoading(true);try{const a=await api.getAllClients();setClients(a);const n=Array.from(new Set(a.map((c:any)=>c.union===null||c.union===undefined||c.union===''?'Unassigned':String(c.union)))).sort((x,y)=>x.localeCompare(y));setUnions(n);setActiveUnion(p=>p&&n.includes(p)?p:(n[0]||''));}catch(e:any){Alert.alert('Unable to load clients',e?.message||'Please try again.')}finally{setLoading(false)}},[]);
 const loadUnion=useCallback(async()=>{if(!activeUnion){setRows([]);return}setLoadingRows(true);try{const d:any[]=await api.getCombinedUnionData(activeUnion==='Unassigned'?'':activeUnion,date);const apiSettings=(d as any).__settings;if(apiSettings)setSettings((p)=>({...p,...apiSettings}));setRows(d);setEdits(p=>{const n={...p};d.forEach((r:any)=>{if(!n[r.id]){const inst=Number(r.loan?.inst_amt||0);const existingAmount=Number(r.existing?.loan_amt||0);const existingCount=inst>0?Math.round(existingAmount/inst):0;n[r.id]={savings:r.existing?.sav_amt?String(r.existing.sav_amt):'',installment:existingAmount?String(existingAmount):'',installmentCount:existingCount?String(existingCount):'',withdrawalType:r.existing?.wth_type||'',withdrawal:r.existing?.wth_amt?String(r.existing.wth_amt):'',notes:''}}});return n})}catch(e:any){Alert.alert('Unable to load union',e?.message||'Please try again.')}finally{setLoadingRows(false)}},[activeUnion,date]);
 useFocusEffect(useCallback(()=>{loadUnions()},[loadUnions]));useEffect(()=>{loadUnion()},[loadUnion]);
 const refresh=async()=>{setRefreshing(true);await loadUnions();setRefreshing(false)};
 const filtered=rows;
 const setEdit=(id:string,key:keyof Edit,value:string)=>setEdits(p=>({...p,[id]:{...(p[id]||blank()),[key]:value}}));
 const installment=(r:Row)=>Number(r.loan?.inst_amt||0);
 const principal=(r:Row)=>Number(r.loan?.principal||r.loan?.loan_amount||r.loan?.disbursed_amount||r.loan?.amount||0);
 const remainingInstallments=(r:Row)=>{const i=installment(r);return i>0?Math.max(0,Math.ceil(Number(r.loan?.remaining_balance||0)/i)):0};
 const paid=(r:Row)=>{const i=installment(r);return i?Math.floor((Number(r.loan?.total_payable||0)-Number(r.loan?.remaining_balance||0))/i):0};
 const allowedMax=(r:Row)=>{const e=edits[r.id]||blank();const hasAdjustment=['withdrawal','return'].includes(e.withdrawalType);const cap=hasAdjustment?1:2;return Math.max(0,Math.min(cap,Number(settings.max_installments_per_payment)||2,remainingInstallments(r)||cap));};
 const allowedMin=()=>Math.max(1,Number(settings.min_installments_per_payment)||1);
 const amountForCount=(r:Row,count:number)=>Math.round(installment(r)*count*100)/100;
 const countForAmount=(r:Row,amount:number)=>{const i=installment(r);if(i<=0)return 0;return Math.round(amount/i)};
 const selectInstallments=(r:Row,count:number)=>{const min=allowedMin(),max=allowedMax(r);if(count<min||count>max){Alert.alert('Installment limit',`This client allows ${min} to ${max} installment(s) per payment.`);return}setEdits(p=>({...p,[r.id]:{...(p[r.id]||blank()),installment:String(amountForCount(r,count)),installmentCount:String(count)}}))};
 const selectAdjustment=(r:Row,type:'withdrawal'|'return')=>{const selectedInstallments=Number(edits[r.id]?.installmentCount)||0;if(selectedInstallments>=2){Alert.alert('Withdrawal not allowed','Withdrawal or Return cannot be processed when 2 installments are being repaid.');return}const blocked=blockedTypes(settings);if(blocked.includes(type)||blocked.includes(type==='withdrawal'?'deduct':'return')){Alert.alert('Adjustment disabled','This adjustment type is disabled by the administrator.');return}const pct=type==='withdrawal'?Number(settings.buffer_withdrawal||10):Number(settings.buffer_return||10);const amount=type==='return'?Math.min(Math.max(0,Number(r.savings_balance||0)),Math.max(0,Number(r.loan?.remaining_balance||0))):Math.round(principal(r)*(pct/100)*100)/100;setEdits(p=>{const current=p[r.id]||blank();const next={...current,withdrawalType:type,withdrawal:amount>0?String(amount):''};if(Number(next.installmentCount)>1){next.installmentCount='1';next.installment=String(amountForCount(r,1));}return {...p,[r.id]:next}})};
 const handleDateChange=(event:DateTimePickerEvent,selectedDate?:Date)=>{
  if(dateLocked)return;
  if(event.type==='set'&&selectedDate)setDate(formatDate(selectedDate));
  if(Platform.OS!=='ios'||event.type==='dismissed')setShowDatePicker(false);
};

const openDatePicker=()=>{
  if(dateLocked){
    Alert.alert(
      'Date locked',
      'The administrator has locked the collection date. Only today’s date can be used.'
    );
    return;
  }
  setShowDatePicker(true);
};

const autofill=()=>setEdits(p=>{const n={...p};rows.forEach(r=>{if(installment(r)>0&&!r.existing.loan_amt){const count=Math.min(allowedMax(r),Math.max(allowedMin(),1));n[r.id]={...(n[r.id]||blank()),installment:String(amountForCount(r,count)),installmentCount:String(count)}}});return n});
 const saveRow=async(r:Row)=>{const e=edits[r.id]||blank();let loanCount=Number(e.installmentCount)||0;const enteredAmount=num(e.installment);const sav=num(e.savings);const w=num(e.withdrawal);if(!loanCount&&enteredAmount>0)loanCount=countForAmount(r,enteredAmount);if(enteredAmount>0&&loanCount<=0)return Alert.alert('Invalid repayment','Enter an amount matching the client installment amount.');const min=allowedMin(),max=allowedMax(r);if(loanCount>0&&(loanCount<min||loanCount>max))return Alert.alert('Installment limit',`Allowed installments: ${min} to ${max}.`);if(loanCount>0&&!settings.allow_partial_payments&&enteredAmount!==amountForCount(r,loanCount))return Alert.alert('Invalid repayment','Repayment must match a complete installment amount.');if(['withdrawal','return'].includes(e.withdrawalType)&&loanCount>1){loanCount=1;}if(loanCount>0&&['withdrawal','return'].includes(e.withdrawalType))return Alert.alert('Invalid combination','Repayment and Deduct/Return cannot be processed together.');if(sav>0&&(sav<Number(settings.min_savings_amount)||sav>Number(settings.max_savings_amount)))return Alert.alert('Savings limit',`Savings must be between ${money(settings.min_savings_amount)} and ${money(settings.max_savings_amount)}.`);if(!loanCount&&!sav&&!w)return Alert.alert('No collection entered','Enter a loan repayment, savings collection or adjustment.');const day=parseDate(date).getDay();if(day===0||day===6){if((loanCount>0||sav>0)&&!Number(settings.allow_weekend_collection))return Alert.alert('Weekend collection disabled','The administrator has disabled weekend collections.');if(w>0&&!Number(settings.allow_weekend_withdrawals))return Alert.alert('Weekend adjustment disabled','The administrator has disabled weekend withdrawals.')}setSaving(true);try{const x=await api.saveCombinedCollection({client_id:r.id,date,installment:loanCount,savings_amount:sav,withdrawal_type:e.withdrawalType,withdrawal_amount:w});if(!x?.success)throw new Error(x?.error||x?.message||'Unable to save collection');Alert.alert('Collection saved',`${r.name}\n${x.message||'Transaction completed successfully.'}`);await loadUnion()}catch(e:any){Alert.alert('Collection failed',e?.message||'Unable to save collection')}finally{setSaving(false)}};
 const reset=(r:Row)=>setEdits(p=>({...p,[r.id]:blank()}));
 const loanTotal=filtered.reduce((s,r)=>s+Number(r.loan?.remaining_balance||0),0);const savingsTotal=filtered.reduce((s,r)=>s+Number(r.savings_balance||0),0);const totalLoan=filtered.reduce((s,r)=>s+num(edits[r.id]?.installment),0);const totalSavings=filtered.reduce((s,r)=>s+num(edits[r.id]?.savings),0);const totalWithdrawal=filtered.reduce((s,r)=>s+num(edits[r.id]?.withdrawal),0);const netTotal=totalLoan+totalSavings-totalWithdrawal;
 return <KeyboardAvoidingView style={{flex:1,backgroundColor:colors.background}} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView style={{flex:1}} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary}/> }>
  <View style={styles.pageSectionHeader}><View><Text style={[styles.pageSectionTitle,{color:colors.text}]}>Combined Collection</Text><Text style={[styles.pageSectionSubtitle,{color:colors.textSecondary}]}>Daily client collection register</Text></View><View style={[styles.pageSectionPill,{backgroundColor:colors.infoBg}]}><Text style={[styles.pageSectionPillText,{color:colors.primary}]}>COLLECTION</Text></View></View>
  <View style={[styles.summary,{backgroundColor:colors.card,borderColor:colors.border}]}><Summary icon="people-outline" label="CLIENTS" value={filtered.length} color={colors.primary} colors={colors}/><View style={[styles.divider,{backgroundColor:colors.border}]}/><Summary icon="wallet-outline" label="SAVINGS" value={money(savingsTotal)} color="#16A34A" colors={colors}/><View style={[styles.divider,{backgroundColor:colors.border}]}/><Summary icon="cash-outline" label="LOAN BALANCE" value={money(loanTotal)} color="#7C3AED" colors={colors}/></View>
  {Platform.OS==='web' ? (
    <View style={[styles.control,{backgroundColor:colors.card,borderColor:colors.border}]}>
      <View style={styles.dateIcon}>
        <Ionicons name="calendar-outline" size={18} color={colors.primary}/>
      </View>
      <View style={{flex:1}}>
        <Text style={[styles.caption,{color:colors.textMuted}]}>
          COLLECTION DATE{dateLocked?' • LOCKED':' • UNLOCKED'}
        </Text>
        <TextInput
          value={date}
          onChangeText={v=>{
            if(!dateLocked && /^\d{4}-\d{2}-\d{2}$/.test(v)){
              setDate(v);
            }
          }}
          editable={!dateLocked}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textMuted}
          style={[
            styles.dateInput,
            {
              color:colors.text,
              opacity:dateLocked?0.55:1
            }
          ]}
        />
      </View>
      <View style={[styles.auto,{backgroundColor:'rgba(59,130,246,.10)'}]}>
        <Ionicons name="calendar-outline" size={15} color={colors.primary}/>
      </View>
    </View>
  ) : (
    <>
      <Pressable
        onPress={openDatePicker}
        style={[
          styles.control,
          {
            backgroundColor:colors.card,
            borderColor:colors.border,
            opacity:dateLocked?0.65:1
          }
        ]}
      >
        <View style={styles.dateIcon}>
          <Ionicons name="calendar-outline" size={18} color={colors.primary}/>
        </View>
        <View style={{flex:1}}>
          <Text style={[styles.caption,{color:colors.textMuted}]}>
            COLLECTION DATE{dateLocked?' • LOCKED':' • UNLOCKED • TAP TO CHANGE'}
          </Text>
          <Text style={[styles.dateInput,{color:colors.text}]}>{date}</Text>
        </View>
        <Pressable
          onPress={e=>{
            e.stopPropagation();
            if(!dateLocked)autofill();
          }}
          style={[styles.auto,{backgroundColor:'rgba(59,130,246,.10)'}]}
        >
          <Ionicons name="flash-outline" size={15} color={colors.primary}/>
        </Pressable>
      </Pressable>

      {showDatePicker&&!dateLocked ? (
        <View
          style={{
            marginTop:8,
            padding:10,
            borderRadius:14,
            backgroundColor:colors.card,
            borderWidth:1,
            borderColor:colors.border
          }}
        >
          <DateTimePicker
            value={parseDate(date)}
            mode="date"
            display={Platform.OS==='ios'?'inline':'calendar'}
            onChange={handleDateChange}
          />

          {Platform.OS==='ios' ? (
            <Pressable
              onPress={()=>setShowDatePicker(false)}
              style={{
                marginTop:8,
                paddingVertical:11,
                borderRadius:10,
                alignItems:'center',
                backgroundColor:colors.primary
              }}
            >
              <Text style={{color:'#fff',fontWeight:'800'}}>DONE</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </>
  )}
  {Platform.OS==='ios'&&showDatePicker?<DateTimePicker value={parseDate(date)} mode="date" display="inline" onChange={handleDateChange}/>:null}
  <View style={styles.sectionHeader}><View><Text style={[styles.section,{color:colors.text}]}>UNION GROUPS</Text><Text style={[styles.hint,{color:colors.textMuted}]}>{unions.length} groups</Text></View></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingVertical:2,paddingRight:16,gap:8}}>{unions.map(u=>{const active=activeUnion===u;const count=clients.filter((c:any)=>(c.union===null||c.union===undefined||c.union===''?'Unassigned':String(c.union))===u).length;return <Pressable key={u} onPress={()=>{setActiveUnion(u)}} style={[styles.tab,{backgroundColor:active?colors.primary:colors.card,borderColor:active?colors.primary:colors.border,flexDirection:'row',alignItems:'center',paddingHorizontal:13,paddingVertical:9,borderRadius:12}]}><Ionicons name={active?'people':'people-outline'} size={15} color={active?'#fff':colors.textSecondary}/><Text style={[styles.tabText,{color:active?'#fff':colors.text,marginLeft:7,maxWidth:150}]} numberOfLines={1}>{u}</Text><View style={{marginLeft:7,minWidth:22,height:22,paddingHorizontal:6,borderRadius:11,alignItems:'center',justifyContent:'center',backgroundColor:active?'rgba(255,255,255,.2)':colors.infoBg}}><Text style={{fontSize:11,fontWeight:'800',color:active?'#fff':colors.primary}}>{count}</Text></View></Pressable>})}</ScrollView>
  
  {loading||loadingRows?<View style={[styles.state,{backgroundColor:colors.card,borderColor:colors.border}]}><ActivityIndicator color={colors.primary}/><Text style={[styles.stateText,{color:colors.textSecondary}]}>Loading collection register…</Text></View>:!activeUnion?<Empty icon="people-outline" title="No assigned union" text="No active clients are assigned to this CO." colors={colors}/>:filtered.length===0?<Empty icon="people-outline" title="No clients in this union" text="No active clients are available in this union group." colors={colors}/>:<ScrollView horizontal showsHorizontalScrollIndicator persistentScrollbar contentContainerStyle={{paddingBottom:8}}><View style={[styles.table,{backgroundColor:colors.card,borderColor:colors.border}]}>
   <View style={[styles.tableTitle,{backgroundColor:colors.primary}]}><View style={styles.tableTitleLeft}><Ionicons name="list-outline" size={17} color="#fff"/><Text style={styles.tableTitleText}>Combined Collection</Text></View><Text style={styles.tableDate}>{date}</Text></View>
   <View style={[styles.headerRow,{backgroundColor:colors.inputBg,borderBottomColor:colors.border}]}><Head title="CLIENT" width={235} color={colors.textSecondary}/><Head title="LOAN REPAYMENT" width={220} color="#7C3AED"/><Head title="SAVINGS COLLECTION" width={175} color="#15803D"/><Head title="SAVINGS ADJUSTMENT" width={250} color="#B91C1C"/><Head title="ACTION" width={125} color={colors.textSecondary}/></View>
   {filtered.map((r,i)=>{const e=edits[r.id]||blank(),inst=installment(r),max=allowedMax(r),min=allowedMin();return <View key={r.id} style={[styles.row,{backgroundColor:i%2?colors.inputBg:colors.card,borderBottomColor:colors.border}]}><View style={[styles.clientCell,{width:235}]}><View style={styles.clientTop}><View style={[styles.avatar,{backgroundColor:'rgba(59,130,246,.12)'}]}><Text style={[styles.avatarText,{color:colors.primary}]}>{r.name.slice(0,1).toUpperCase()}</Text></View><View style={{flex:1}}><Text style={[styles.clientName,{color:colors.text}]} numberOfLines={1}>{r.name}</Text><Text style={[styles.clientId,{color:colors.textMuted}]}>ID: {r.id}</Text></View></View><View style={styles.balanceBox}><Text style={[styles.balanceText,{color:colors.textSecondary}]}>Savings <Text style={styles.strong}>{money(r.savings_balance)}</Text></Text><Text style={[styles.balanceText,{color:'#2563EB'}]}>Disbursed <Text style={styles.strong}>{money(principal(r))}</Text></Text><Text style={[styles.balanceText,{color:'#7C3AED'}]}>Loan Balance <Text style={styles.strong}>{money(r.loan?.remaining_balance)}</Text></Text>{r.existing.sav_amt>0&&<Text style={[styles.today,{color:'#15803D'}]}>Today: +{money(r.existing.sav_amt)}</Text>}{r.existing.loan_amt>0&&<Text style={[styles.today,{color:'#7C3AED'}]}>Paid: {money(r.existing.loan_amt)}</Text>}</View></View>
   <View style={[styles.inputCell,{width:220}]}><Text style={[styles.cellHint,{color:colors.textMuted}]}>{money(inst)} / installment • {min}-{max} allowed</Text><View style={[styles.inputWrap,{backgroundColor:colors.inputBg,borderColor:colors.inputBorder}]}><TextInput value={e.installment} onChangeText={v=>{const amount=num(v);const count=countForAmount(r,amount);setEdits(p=>({...p,[r.id]:{...(p[r.id]||blank()),installment:v.replace(/[^0-9.]/g,''),installmentCount:count?String(count):''}}))}} keyboardType="numeric" placeholder="Amount" placeholderTextColor={colors.textMuted} style={[styles.cellInput,{color:colors.text}]}/></View><View style={styles.quickRow}>{Array.from({length:Math.max(0,Math.min(2,max-min+1))},(_,idx)=>min+idx).slice(0,Math.min(2,Math.max(0,max-min+1))).map(n=><Pressable key={n} onPress={()=>selectInstallments(r,n)} style={[styles.quick,{backgroundColor:colors.card,borderColor:colors.border}]}><Text style={[styles.quickText,{color:colors.primary}]}>{n}×</Text></Pressable>)}</View></View>
   <View style={[styles.inputCell,{width:175}]}><Text style={[styles.cellHint,{color:colors.textMuted}]}>Add savings</Text><View style={[styles.inputWrap,{backgroundColor:colors.inputBg,borderColor:colors.inputBorder}]}><TextInput value={e.savings} onChangeText={v=>setEdit(r.id,'savings',v)} keyboardType="numeric" placeholder="0.00" placeholderTextColor={colors.textMuted} style={[styles.cellInput,{color:colors.text}]}/></View><Text style={[styles.smallHelp,{color:colors.textMuted}]}>Min {money(settings.min_savings_amount)}</Text></View>
   <View style={[styles.inputCell,{width:250}]}><View style={styles.adjustButtons}>{(['withdrawal','return'] as const).map(t=><Pressable key={t} onPress={()=>selectAdjustment(r,t)} style={[styles.adjustButton,{backgroundColor:colors.inputBg,borderColor:colors.border},e.withdrawalType===t&&{backgroundColor:t==='withdrawal'?'#FEE2E2':'#DCFCE7',borderColor:t==='withdrawal'?'#FECACA':'#BBF7D0'}]}><Ionicons name={t==='withdrawal'?'arrow-down-outline':'arrow-up-outline'} size={14} color={t==='withdrawal'?'#B91C1C':'#15803D'}/><Text style={{fontSize:11,fontWeight:'800',color:t==='withdrawal'?'#B91C1C':'#15803D'}}>{t==='withdrawal'?'DEDUCT':'RETURN'}</Text></Pressable>)}</View><View style={[styles.inputWrap,{backgroundColor:colors.inputBg,borderColor:colors.inputBorder}]}><TextInput value={e.withdrawal} onChangeText={v=>setEdit(r.id,'withdrawal',v)} keyboardType="numeric" placeholder="Adjustment amount" placeholderTextColor={colors.textMuted} style={[styles.cellInput,{color:colors.text}]}/></View></View>
   <View style={[styles.actionCell,{width:125}]}><Pressable disabled={saving} onPress={()=>saveRow(r)} style={[styles.saveButton,{backgroundColor:colors.primary,opacity:saving?.6:1}]}><Ionicons name="checkmark-circle-outline" size={15} color="#fff"/><Text style={styles.saveText}>SAVE</Text></Pressable><Pressable onPress={()=>reset(r)} style={[styles.resetButton,{backgroundColor:colors.inputBg,borderColor:colors.border}]}><Text style={[styles.resetText,{color:colors.textSecondary}]}>RESET</Text></Pressable></View></View>})}
   <View style={[styles.totalRow,{backgroundColor:colors.inputBg,borderTopColor:colors.border}]}><View style={{width:235}}><Text style={[styles.totalLabel,{color:colors.text}]}>TOTAL</Text></View><View style={{width:220}}><Text style={[styles.totalValue,{color:'#7C3AED'}]}>{money(totalLoan)}</Text><Text style={[styles.totalCaption,{color:colors.textMuted}]}>Loan repayment</Text></View><View style={{width:175}}><Text style={[styles.totalValue,{color:'#15803D'}]}>{money(totalSavings)}</Text><Text style={[styles.totalCaption,{color:colors.textMuted}]}>Savings collection</Text></View><View style={{width:250}}><Text style={[styles.totalValue,{color:'#B91C1C'}]}>{money(totalWithdrawal)}</Text><Text style={[styles.totalCaption,{color:colors.textMuted}]}>Adjustment</Text></View><View style={{width:125}}><Text style={[styles.totalNet,{color:colors.primary}]}>{money(netTotal)}</Text><Text style={[styles.totalCaption,{color:colors.textMuted}]}>Net total</Text></View></View>
  </View></ScrollView>}
 </ScrollView></KeyboardAvoidingView>
}
function Summary({icon,label,value,color,colors}:any){return <View style={styles.summaryItem}><View style={[styles.summaryIcon,{backgroundColor:`${color}18`}]}><Ionicons name={icon} size={16} color={color}/></View><View><Text style={[styles.summaryLabel,{color:colors.textMuted}]}>{label}</Text><Text style={[styles.summaryValue,{color:colors.text}]}>{value}</Text></View></View>}
function Head({title,width,color}:{title:string;width:number;color:string}){return <View style={{width,paddingHorizontal:14,justifyContent:'center'}}><Text style={[styles.headText,{color}]}>{title}</Text></View>}
function Empty({icon,title,text,colors}:any){return <View style={[styles.state,{backgroundColor:colors.card,borderColor:colors.border}]}><View style={[styles.emptyIcon,{backgroundColor:colors.infoBg}]}><Ionicons name={icon} size={22} color={colors.primary}/></View><Text style={[styles.emptyTitle,{color:colors.text}]}>{title}</Text><Text style={[styles.stateText,{color:colors.textSecondary}]}>{text}</Text></View>}
const styles=StyleSheet.create({content:{padding:16,paddingBottom:40},hero:{borderRadius:24,padding:22,marginBottom:16,overflow:'hidden'},heroTop:{flexDirection:'row',alignItems:'flex-start',gap:12},heroEyebrow:{fontSize:11,fontWeight:'800',letterSpacing:1.5,color:'rgba(255,255,255,.72)'},heroName:{fontSize:25,fontWeight:'900',color:'#fff',marginTop:3},heroRole:{paddingHorizontal:10,paddingVertical:7,borderRadius:999,backgroundColor:'rgba(255,255,255,.16)'},heroRoleText:{fontSize:10,fontWeight:'900',color:'#fff'},heroDescription:{marginTop:12,fontSize:13,lineHeight:19,color:'rgba(255,255,255,.82)'},heroLocation:{marginTop:14,flexDirection:'row',alignItems:'center',gap:6},heroLocationLabel:{fontSize:9,fontWeight:'900',color:'rgba(255,255,255,.62)',letterSpacing:1},heroLocationValue:{flex:1,fontSize:11,fontWeight:'800',color:'#fff'},heroBottom:{marginTop:18,paddingTop:14,borderTopWidth:1,borderTopColor:'rgba(255,255,255,.14)',flexDirection:'row',alignItems:'center',justifyContent:'space-between'},statusText:{fontSize:10,fontWeight:'800',color:'rgba(255,255,255,.82)'},pageSectionHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:12},pageSectionTitle:{fontSize:20,fontWeight:'900'},pageSectionSubtitle:{fontSize:12,marginTop:2},pageSectionPill:{paddingHorizontal:9,paddingVertical:6,borderRadius:999},pageSectionPillText:{fontSize:9,fontWeight:'900',letterSpacing:.7},summary:{borderWidth:1,borderRadius:18,padding:13,flexDirection:'row',alignItems:'center',marginBottom:12},summaryItem:{flex:1,flexDirection:'row',alignItems:'center',gap:9},summaryIcon:{width:32,height:32,borderRadius:10,alignItems:'center',justifyContent:'center'},summaryLabel:{fontSize:9,fontWeight:'800',letterSpacing:.7},summaryValue:{fontSize:13,fontWeight:'900',marginTop:2},divider:{width:1,height:30},control:{minHeight:62,borderWidth:1,borderRadius:16,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:10,marginBottom:14},dateIcon:{width:36,height:36,borderRadius:11,backgroundColor:'rgba(59,130,246,.10)',alignItems:'center',justifyContent:'center'},caption:{fontSize:9,fontWeight:'800',letterSpacing:.7},dateInput:{fontSize:14,fontWeight:'700',marginTop:5},auto:{height:34,paddingHorizontal:10,borderRadius:10,flexDirection:'row',alignItems:'center',gap:5},autoText:{fontSize:9,fontWeight:'900'},sectionHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:4,marginBottom:8},section:{fontSize:11,fontWeight:'900',letterSpacing:1.1},hint:{fontSize:10},tabs:{gap:8,paddingBottom:12},tab:{borderWidth:1,borderRadius:999,paddingHorizontal:13,paddingVertical:9},tabText:{fontSize:11,fontWeight:'800'},toolbar:{borderWidth:1,borderRadius:18,padding:12,marginBottom:12},toolbarTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:9},activeText:{fontSize:9,fontWeight:'900',color:'#15803D',letterSpacing:.8},count:{fontSize:11,fontWeight:'800'},search:{height:40,borderWidth:1,borderRadius:12,paddingHorizontal:11,flexDirection:'row',alignItems:'center',gap:8},searchInput:{flex:1,fontSize:13},state:{minHeight:170,borderWidth:1,borderRadius:18,alignItems:'center',justifyContent:'center',padding:24,gap:9},stateText:{fontSize:12,textAlign:'center'},emptyIcon:{width:46,height:46,borderRadius:14,alignItems:'center',justifyContent:'center'},emptyTitle:{fontSize:15,fontWeight:'900'},table:{borderWidth:1,borderRadius:16,overflow:'hidden',minWidth:1005,elevation:2,shadowOpacity:.06,shadowRadius:8,shadowOffset:{width:0,height:2}},tableTitle:{height:50,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},tableTitleLeft:{flexDirection:'row',alignItems:'center',gap:8},tableTitleText:{fontSize:13,fontWeight:'900',color:'#fff'},tableDate:{fontSize:11,fontWeight:'800',color:'rgba(255,255,255,.85)'},headerRow:{height:46,flexDirection:'row',borderBottomWidth:1,alignItems:'center'},headText:{fontSize:9,fontWeight:'900',letterSpacing:.9,textTransform:'uppercase'},row:{minHeight:148,flexDirection:'row',borderBottomWidth:1},clientCell:{padding:14},clientTop:{flexDirection:'row',alignItems:'center',gap:9},avatar:{width:32,height:32,borderRadius:10,alignItems:'center',justifyContent:'center'},avatarText:{fontSize:13,fontWeight:'900'},clientName:{fontSize:12,fontWeight:'900'},clientId:{fontSize:9,marginTop:2},balanceBox:{marginTop:10,gap:3},balanceText:{fontSize:10},strong:{fontWeight:'900'},today:{fontSize:9,fontWeight:'800'},inputCell:{padding:13},cellHint:{fontSize:9,fontWeight:'700',marginBottom:5},inputWrap:{minHeight:38,borderWidth:1,borderRadius:10,flexDirection:'row',alignItems:'center',paddingHorizontal:8},cellInput:{flex:1,fontSize:12,fontWeight:'700',paddingVertical:7},quickRow:{flexDirection:'row',gap:4,marginTop:5},quick:{minWidth:34,height:30,borderWidth:1,borderRadius:7,alignItems:'center',justifyContent:'center'},quickText:{fontSize:10,fontWeight:'900'},smallHelp:{fontSize:8,marginTop:4},adjustButtons:{flexDirection:'row',gap:6,marginBottom:6},adjustButton:{flex:1,height:32,borderWidth:1,borderRadius:9,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:4},actionCell:{padding:12,gap:7},saveButton:{minHeight:38,borderRadius:10,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,height:38,borderRadius:10,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:5},saveText:{fontSize:10,fontWeight:'900',color:'#fff'},resetButton:{minHeight:34,borderRadius:9,alignItems:'center',justifyContent:'center',marginTop:6,height:34,borderWidth:1,borderRadius:10,alignItems:'center',justifyContent:'center'},resetText:{fontSize:9,fontWeight:'800'},totalRow:{minHeight:70,borderTopWidth:1,flexDirection:'row',alignItems:'center',paddingVertical:10},totalLabel:{paddingHorizontal:14,fontSize:12,fontWeight:'900'},totalValue:{paddingHorizontal:14,fontSize:12,fontWeight:'900'},totalCaption:{paddingHorizontal:14,fontSize:8,fontWeight:'700',marginTop:2},totalNet:{paddingHorizontal:14,fontSize:12,fontWeight:'900'}});

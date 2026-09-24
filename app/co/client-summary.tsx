import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { loadDashboardStats } from '../../src/services/data';
import { useThemeStore } from '../../src/store/theme';

export default function ClientSummaryScreen() {
  const colors = useThemeStore((s) => s.colors);
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => { const res = await loadDashboardStats(); setData(res.data); }, []);
  useEffect(() => { load(); }, [load]);
  const money = (v: unknown) => `₦${Number(v ?? 0).toLocaleString()}`;
  const cards = [
    ['Clients', String(data?.clients ?? 0), 'people-outline'],
    ['Total Savings', money(data?.total_savings), 'wallet-outline'],
    ['Outstanding Loans', money(data?.total_loans_outstanding ?? data?.outstanding), 'alert-circle-outline'],
    ['Active Loans', String(data?.active_loans ?? 0), 'document-text-outline'],
  ];
  return <ScrollView style={[styles.container,{backgroundColor:colors.background}]} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async()=>{setRefreshing(true);await load();setRefreshing(false)}} />}>
    <Text style={[styles.title,{color:colors.text}]}>Client Financial Summary</Text>
    <Text style={[styles.sub,{color:colors.textSecondary}]}>Portfolio summary matching the CO dashboard.</Text>
    <View style={styles.grid}>{cards.map(([label,value,icon])=><View key={label} style={[styles.card,{backgroundColor:colors.card,borderColor:colors.border}]}><Ionicons name={icon as any} size={22} color={colors.primary}/><Text style={[styles.value,{color:colors.text}]}>{value}</Text><Text style={[styles.label,{color:colors.textSecondary}]}>{label}</Text></View>)}</View>
    <View style={[styles.panel,{backgroundColor:colors.card,borderColor:colors.border}]}><Text style={[styles.panelTitle,{color:colors.text}]}>Union Summary</Text>{(data?.unions ?? []).map((u:any)=><View key={u.name} style={styles.row}><View style={{flex:1}}><Text style={[styles.union,{color:colors.text}]}>{u.name}</Text><Text style={[styles.meta,{color:colors.textSecondary}]}>{u.clients ?? 0} clients</Text></View><Text style={[styles.amount,{color:colors.primary}]}>{money(u.savings)}</Text></View>)}</View>
  </ScrollView>;
}
const styles=StyleSheet.create({container:{flex:1},content:{padding:16,paddingBottom:30},title:{fontSize:24,fontWeight:'800'},sub:{marginTop:5,marginBottom:18},grid:{flexDirection:'row',flexWrap:'wrap',gap:10},card:{width:'48%',minHeight:125,borderWidth:1,borderRadius:16,padding:15},value:{fontSize:20,fontWeight:'800',marginTop:12},label:{fontSize:12,marginTop:5},panel:{marginTop:16,borderWidth:1,borderRadius:16,padding:16},panelTitle:{fontSize:17,fontWeight:'800',marginBottom:10},row:{flexDirection:'row',alignItems:'center',paddingVertical:12,borderBottomWidth:1,borderBottomColor:'#e5e7eb'},union:{fontWeight:'700'},meta:{fontSize:12,marginTop:3},amount:{fontWeight:'800'}});

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../src/store/theme';

export default function CloseAccountScreen() {
  const colors = useThemeStore((s) => s.colors);
  return <View style={[styles.container,{backgroundColor:colors.background}]}><View style={[styles.card,{backgroundColor:colors.card,borderColor:colors.border}]}><View style={[styles.icon,{backgroundColor:'#EF444415'}]}><Ionicons name="person-remove-outline" size={32} color="#EF4444"/></View><Text style={[styles.title,{color:colors.text}]}>Close Client Account</Text><Text style={[styles.text,{color:colors.textSecondary}]}>Select the client from the Clients screen, review their financial position, then continue with the account-closing process.</Text><TouchableOpacity style={[styles.button,{backgroundColor:colors.primary}]} onPress={()=>router.push('/(tabs)/search')}><Ionicons name="people-outline" size={18} color="#fff"/><Text style={styles.buttonText}>Select Client</Text></TouchableOpacity></View></View>;
}
const styles=StyleSheet.create({container:{flex:1,padding:18,justifyContent:'center'},card:{borderWidth:1,borderRadius:20,padding:24,alignItems:'center'},icon:{width:68,height:68,borderRadius:34,alignItems:'center',justifyContent:'center',marginBottom:18},title:{fontSize:22,fontWeight:'800',textAlign:'center'},text:{fontSize:14,lineHeight:21,textAlign:'center',marginTop:10},button:{marginTop:22,minHeight:48,borderRadius:12,paddingHorizontal:22,flexDirection:'row',alignItems:'center',gap:8},buttonText:{color:'#fff',fontWeight:'800'}});

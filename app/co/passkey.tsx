import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../src/store/theme';

export default function PasskeyScreen() {
  const colors = useThemeStore((s) => s.colors);
  const [enabled, setEnabled] = useState(false);
  return <View style={[styles.container,{backgroundColor:colors.background}]}><View style={[styles.card,{backgroundColor:colors.card,borderColor:colors.border}]}><View style={[styles.icon,{backgroundColor:colors.infoBg}]}><Ionicons name="finger-print" size={42} color={colors.primary}/></View><Text style={[styles.title,{color:colors.text}]}>Passkey Setup</Text><Text style={[styles.text,{color:colors.textSecondary}]}>Configure the mobile security option for this device. The setting is kept locally until biometric/passkey authentication is connected to the account service.</Text><View style={[styles.status,{backgroundColor:enabled? '#22C55E15':colors.background}]}><Ionicons name={enabled?'checkmark-circle':'shield-checkmark-outline'} size={18} color={enabled?'#16A34A':colors.primary}/><Text style={[styles.statusText,{color:enabled?'#16A34A':colors.text}]}> {enabled?'Passkey option enabled':'Passkey not enabled'}</Text></View><TouchableOpacity style={[styles.button,{backgroundColor:colors.primary}]} onPress={()=>setEnabled(v=>!v)}><Text style={styles.buttonText}>{enabled?'Disable Passkey':'Enable Passkey'}</Text></TouchableOpacity></View></View>;
}
const styles=StyleSheet.create({container:{flex:1,padding:18,justifyContent:'center'},card:{borderWidth:1,borderRadius:20,padding:24,alignItems:'center'},icon:{width:80,height:80,borderRadius:40,alignItems:'center',justifyContent:'center',marginBottom:18},title:{fontSize:22,fontWeight:'800'},text:{fontSize:14,lineHeight:21,textAlign:'center',marginTop:10},status:{marginTop:18,padding:12,borderRadius:12,flexDirection:'row',alignItems:'center'},statusText:{fontWeight:'700'},button:{marginTop:18,minHeight:48,borderRadius:12,paddingHorizontal:24,justifyContent:'center'},buttonText:{color:'#fff',fontWeight:'800'}});

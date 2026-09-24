import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView, Dimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/auth';
import { useThemeStore } from '../../src/store/theme';
import { SPACING, RADIUS } from '../../src/constants/config';

const { width } = Dimensions.get('window');
type Field = 'username' | 'password' | null;

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [focused, setFocused] = useState<Field>(null);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState<boolean | null>(null);
  const passwordRef = useRef<TextInput>(null);
  const usernameRef = useRef<TextInput>(null);
  const { login, isLoading, error, clearError, biometricLogin } = useAuthStore();
  const { colors, mode, toggle } = useThemeStore();

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (Platform.OS === 'web') { if (mounted) setBiometricAvailable(false); return; }
      try {
        const hardware = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (mounted) setBiometricAvailable(hardware && enrolled);
      } catch { if (mounted) setBiometricAvailable(false); }
    })();
    return () => { mounted = false; };
  }, []);

  const handleLogin = async () => {
    const clean = username.trim();
    if (!clean || !password) {
      Alert.alert('Missing details', 'Enter your username and password to continue.');
      if (!clean) usernameRef.current?.focus(); else passwordRef.current?.focus();
      return;
    }
    clearError();
    if (await login(clean, password)) router.replace('/(tabs)');
  };

  const handleFingerprint = async () => {
    if (biometricLoading || isLoading) return;
    if (Platform.OS === 'web') {
      Alert.alert('Biometric sign-in', 'Fingerprint authentication requires the Android or iOS app.');
      return;
    }
    setBiometricLoading(true); clearError();
    try {
      const hardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hardware) { setBiometricAvailable(false); Alert.alert('Unavailable', 'This device does not support biometric authentication.'); return; }
      if (!enrolled) { setBiometricAvailable(false); Alert.alert('Biometric not set up', 'Set up a fingerprint or other biometric on your device first.'); return; }
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Sign in to CUPAD', cancelLabel: 'Cancel', disableDeviceFallback: false, fallbackLabel: 'Use device passcode' });
      if (!result.success) return;
      if (await biometricLogin()) router.replace('/(tabs)');
      else Alert.alert('Sign in again', 'Your saved session is no longer available. Sign in with your username and password once, then biometric login will be available again.');
    } catch (e: any) {
      Alert.alert('Biometric login failed', e?.message || 'Please sign in with your username and password.');
    } finally { setBiometricLoading(false); }
  };

  const busy = isLoading || biometricLoading;
  const canSubmit = username.trim().length > 0 && password.length > 0 && !busy;
  const inputBorder = (field: Field) => focused === field ? colors.primary : colors.inputBorder;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.glowTop, { backgroundColor: colors.glowBlue }]} /><View style={[styles.glowBottom, { backgroundColor: colors.glowPurple }]} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="always" keyboardDismissMode="none" showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}><View><Text style={[styles.topBrand, { color: colors.text }]}>CUPAD</Text><Text style={[styles.topBrandSub, { color: colors.textMuted }]}>STAFF PORTAL</Text></View><TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={toggle} disabled={busy}><Ionicons name={mode === 'dark' ? 'sunny-outline' : 'moon-outline'} size={20} color={colors.textSecondary} /></TouchableOpacity></View>
          <View style={styles.logoArea}>
            <View style={[styles.logoCircle, { backgroundColor: colors.card, borderColor: colors.primary + '25' }]}><Image source={require('../../assets/cupad-logo.png')} style={styles.logoImage} resizeMode="contain" accessibilityLabel="CUPAD logo" /></View>
            <View style={[styles.portalPill, { backgroundColor: colors.infoBg }]}><View style={[styles.liveDot, { backgroundColor: colors.success }]} /><Text style={[styles.portalPillText, { color: colors.primary }]}>SECURE STAFF ACCESS</Text></View>
            <Text style={[styles.welcome, { color: colors.text }]}>Welcome back</Text><Text style={[styles.subheading, { color: colors.textSecondary }]}>Sign in securely to manage your CUPAD field activities.</Text>
          </View>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}><View style={styles.cardHeaderText}><Text style={[styles.heading, { color: colors.text }]}>Staff Login</Text><Text style={[styles.cardHint, { color: colors.textSecondary }]}>Use your assigned account credentials</Text></View><View style={[styles.secureBadge, { backgroundColor: colors.infoBg }]}><Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} /></View></View>
            {error ? <View style={[styles.errorBox, { backgroundColor: colors.errorBg, borderColor: colors.error + '30' }]}><Ionicons name="alert-circle-outline" size={20} color={colors.error} /><View style={styles.errorContent}><Text style={[styles.errorTitle, { color: colors.error }]}>Unable to sign in</Text><Text style={[styles.errorText, { color: colors.error }]}>{error}</Text></View><TouchableOpacity onPress={clearError} hitSlop={8}><Ionicons name="close" size={18} color={colors.error} /></TouchableOpacity></View> : null}
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Username</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.inputBg, borderColor: inputBorder('username') }, focused === 'username' && styles.focusedInput]}><View style={[styles.inputIconBox, { backgroundColor: colors.infoBg }]}><Ionicons name="person-outline" size={18} color={colors.primary} /></View><TextInput ref={usernameRef} style={[styles.input, { color: colors.text }]} value={username} onChangeText={v => { setUsername(v); if (error) clearError(); }} placeholder="Enter your username" placeholderTextColor={colors.textMuted} autoCapitalize="none" autoCorrect={false} autoComplete="username" textContentType="username" returnKeyType="next" editable={!busy} onFocus={() => setFocused('username')} onBlur={() => setFocused(null)} onSubmitEditing={() => passwordRef.current?.focus()} accessibilityLabel="Username" />{username.length > 0 && <TouchableOpacity onPress={() => setUsername('')} disabled={busy} hitSlop={8}><Ionicons name="close-circle" size={19} color={colors.textMuted} /></TouchableOpacity>}</View>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Password</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.inputBg, borderColor: inputBorder('password') }, focused === 'password' && styles.focusedInput]}><View style={[styles.inputIconBox, { backgroundColor: colors.infoBg }]}><Ionicons name="lock-closed-outline" size={18} color={colors.primary} /></View><TextInput ref={passwordRef} style={[styles.input, { color: colors.text }]} value={password} onChangeText={v => { setPassword(v); if (error) clearError(); }} placeholder="Enter your password" placeholderTextColor={colors.textMuted} secureTextEntry={!showPassword} autoComplete="password" textContentType="password" returnKeyType="done" editable={!busy} onFocus={() => setFocused('password')} onBlur={() => setFocused(null)} onSubmitEditing={handleLogin} accessibilityLabel="Password" /><TouchableOpacity onPress={() => setShowPassword(v => !v)} disabled={busy} hitSlop={8} style={styles.eye}><Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} /></TouchableOpacity></View>
            <View style={styles.rowBetween}><TouchableOpacity style={styles.rememberRow} onPress={() => setRememberMe(v => !v)} disabled={busy} accessibilityRole="checkbox" accessibilityState={{ checked: rememberMe }}><View style={[styles.checkbox, { borderColor: rememberMe ? colors.primary : colors.border, backgroundColor: rememberMe ? colors.primary : 'transparent' }]}>{rememberMe && <Ionicons name="checkmark" size={12} color="#fff" />}</View><Text style={[styles.rememberText, { color: colors.textSecondary }]}>Remember me</Text></TouchableOpacity><TouchableOpacity onPress={() => Alert.alert('Password help', 'Please contact your CUPAD administrator to reset your password.')} disabled={busy}><Text style={[styles.forgotText, { color: colors.primary }]}>Need help?</Text></TouchableOpacity></View>
            <TouchableOpacity activeOpacity={0.9} onPress={handleLogin} disabled={!canSubmit} style={[styles.loginBtnWrap, { opacity: canSubmit ? 1 : 0.55 }]}><LinearGradient colors={[colors.gradientStart, colors.gradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.loginBtn}>{isLoading ? <><ActivityIndicator color="#fff" /><Text style={styles.loginBtnText}>Signing in…</Text></> : <><Text style={styles.loginBtnText}>Sign in</Text><Ionicons name="arrow-forward" size={19} color="#fff" /></>}</LinearGradient></TouchableOpacity>
            <TouchableOpacity activeOpacity={0.8} onPress={handleFingerprint} disabled={busy} style={[styles.biometricWideBtn, { backgroundColor: colors.infoBg, borderColor: colors.primary + '35', opacity: busy ? 0.6 : 1 }]} accessibilityRole="button" accessibilityLabel="Sign in with fingerprint or device biometric"><View style={[styles.bioIcon, { backgroundColor: colors.card }]}>{biometricLoading ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="finger-print-outline" size={24} color={colors.primary} />}</View><View style={styles.bioCopy}><Text style={[styles.biometricText, { color: colors.primary }]}>Sign in with biometrics</Text><Text style={[styles.bioHint, { color: colors.textMuted }]}>{biometricAvailable === true ? 'Fingerprint or device biometric is ready' : biometricAvailable === false ? (Platform.OS === 'web' ? 'Available in the Android/iOS app' : 'Set up device biometrics to enable quick sign-in') : 'Checking device biometric support…'}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.primary} /></TouchableOpacity>
            <View style={[styles.securityPanel, { backgroundColor: colors.inputBg, borderColor: colors.border }]}><View style={[styles.securityIcon, { backgroundColor: colors.infoBg }]}><Ionicons name="lock-closed" size={14} color={colors.success} /></View><View style={styles.securityCopy}><Text style={[styles.securityTitle, { color: colors.text }]}>Secure connection</Text><Text style={[styles.securityText, { color: colors.textMuted }]}>Your credentials are protected during sign-in.</Text></View><Ionicons name="checkmark-circle" size={18} color={colors.success} /></View>
          </View>
          <View style={styles.footerBlock}><Text style={[styles.motto, { color: colors.primary }]}>SUCCESS IS OURS</Text><Text style={[styles.footer, { color: colors.textMuted }]}>CUPAD Staff Portal • © 2026</Text></View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex:{flex:1},container:{flex:1},glowTop:{position:'absolute',top:-90,left:width*.12,width:250,height:250,borderRadius:125,opacity:.7},glowBottom:{position:'absolute',bottom:-40,right:-50,width:220,height:220,borderRadius:110,opacity:.55},
  scroll:{flexGrow:1,width:'100%',maxWidth:520,alignSelf:'center',paddingHorizontal:SPACING.lg,paddingTop:Platform.OS==='ios'?54:32,paddingBottom:32},topBar:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:28},topBrand:{fontSize:16,fontWeight:'800',letterSpacing:1},topBrandSub:{fontSize:9,fontWeight:'700',letterSpacing:1.4,marginTop:2},iconBtn:{width:42,height:42,borderRadius:14,justifyContent:'center',alignItems:'center',borderWidth:1},
  logoArea:{alignItems:'center',marginBottom:28},logoCircle:{width:104,height:104,borderRadius:52,justifyContent:'center',alignItems:'center',borderWidth:1,marginBottom:16,padding:10,overflow:'hidden'},logoImage:{width:84,height:84},portalPill:{flexDirection:'row',alignItems:'center',paddingHorizontal:10,paddingVertical:6,borderRadius:20,marginBottom:12},liveDot:{width:6,height:6,borderRadius:3,marginRight:6},portalPillText:{fontSize:9,fontWeight:'800',letterSpacing:1},welcome:{fontSize:27,fontWeight:'800',textAlign:'center'},subheading:{fontSize:13,lineHeight:20,textAlign:'center',marginTop:6,maxWidth:350},
  card:{borderRadius:RADIUS.lg,padding:SPACING.lg,borderWidth:1,shadowColor:'#000',shadowOffset:{width:0,height:8},shadowOpacity:.07,shadowRadius:20,elevation:5},cardHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:22},cardHeaderText:{flex:1},heading:{fontSize:21,fontWeight:'800'},cardHint:{fontSize:12,marginTop:4},secureBadge:{width:38,height:38,borderRadius:12,alignItems:'center',justifyContent:'center'},errorBox:{flexDirection:'row',alignItems:'center',padding:12,borderRadius:RADIUS.sm,borderWidth:1,marginBottom:18,gap:9},errorContent:{flex:1},errorTitle:{fontSize:12,fontWeight:'800',marginBottom:2},errorText:{fontSize:12,lineHeight:17},fieldLabel:{fontSize:12,fontWeight:'700',marginBottom:7,marginLeft:2},inputWrap:{minHeight:56,flexDirection:'row',alignItems:'center',borderWidth:1,borderRadius:RADIUS.md,marginBottom:16,paddingHorizontal:10},focusedInput:{shadowColor:'#000',shadowOpacity:.04,shadowRadius:6,elevation:1},inputIconBox:{width:36,height:36,borderRadius:10,alignItems:'center',justifyContent:'center'},input:{flex:1,paddingHorizontal:10,paddingVertical:14,fontSize:15},eye:{padding:7},
  rowBetween:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:2,marginBottom:22},rememberRow:{flexDirection:'row',alignItems:'center',gap:8},checkbox:{width:19,height:19,borderRadius:5,borderWidth:1.5,alignItems:'center',justifyContent:'center'},rememberText:{fontSize:12},forgotText:{fontSize:12,fontWeight:'700'},loginBtnWrap:{borderRadius:RADIUS.md,overflow:'hidden'},loginBtn:{minHeight:56,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10,paddingHorizontal:18},loginBtnText:{color:'#fff',fontSize:16,fontWeight:'800'},
  biometricWideBtn:{minHeight:64,borderRadius:RADIUS.md,borderWidth:1,marginTop:10,paddingHorizontal:12,flexDirection:'row',alignItems:'center'},bioIcon:{width:42,height:42,borderRadius:12,alignItems:'center',justifyContent:'center',marginRight:11},bioCopy:{flex:1},biometricText:{fontSize:13,fontWeight:'800'},bioHint:{fontSize:10,marginTop:3,lineHeight:14},securityPanel:{marginTop:16,minHeight:58,borderRadius:RADIUS.md,borderWidth:1,padding:10,flexDirection:'row',alignItems:'center'},securityIcon:{width:32,height:32,borderRadius:10,alignItems:'center',justifyContent:'center'},securityCopy:{flex:1,marginLeft:9},securityTitle:{fontSize:11,fontWeight:'800'},securityText:{fontSize:10,marginTop:2},footerBlock:{alignItems:'center',marginTop:28},motto:{fontSize:10,fontWeight:'800',letterSpacing:1.5},footer:{fontSize:10,marginTop:5}
});

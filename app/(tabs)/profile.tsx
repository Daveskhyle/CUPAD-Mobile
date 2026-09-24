import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Switch, Platform, ActivityIndicator, TextInput, ScrollView, Image, KeyboardAvoidingView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/auth';
import { useThemeStore } from '../../src/store/theme';
import { getRoleConfig } from '../../src/constants/roles';
import { SPACING, API_BASE_URL } from '../../src/constants/config';
import { Ionicons } from '@expo/vector-icons';
import { loadDashboardStats } from '../../src/services/data';

type Location = { zone: string; area: string; branch: string };

const resolveProfileUri = (value?: string | null) => {
  const raw = String(value || '').trim();
  if (!raw || raw.toLowerCase().includes('default_avatar') || raw.startsWith('data:image/')) return raw.startsWith('data:image/') ? raw : null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const clean = raw.replace(/^\.\//, '').replace(/^\//, '');
  const origin = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
  return `${origin}/${clean}`;
};

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuthStore();
  const { colors, mode, toggle } = useThemeStore();
  const roleCfg = getRoleConfig(user?.role);
  const [busy, setBusy] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);
  const [location, setLocation] = useState<Location>({ zone: user?.zone_name || '', area: user?.area_name || '', branch: user?.branch_name || '' });
  const [name, setName] = useState(user?.full_name || user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profilePic, setProfilePic] = useState<string | undefined>(user?.profile_pic || undefined);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const displayName = name.trim() || user?.username || 'User';
  const initials = useMemo(() => displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join(''), [displayName]);
  const profileUri = resolveProfileUri(profilePic);
  const locationText = [location.zone, location.area, location.branch].filter(Boolean).join(' • ');

  useEffect(() => {
    setName(user?.full_name || user?.name || '');
    setEmail(user?.email || '');
    setProfilePic(user?.profile_pic || undefined);
  }, [user?.full_name, user?.name, user?.email, user?.profile_pic]);

  const loadLocation = useCallback(async () => {
    setLocationLoading(true);
    try {
      const res = await loadDashboardStats();
      const stats = res.data || {};
      setLocation({
        zone: stats.zone_name || user?.zone_name || '',
        area: stats.area_name || user?.area_name || '',
        branch: stats.branch_name || user?.branch_name || '',
      });
    } catch {
      setLocation({ zone: user?.zone_name || '', area: user?.area_name || '', branch: user?.branch_name || '' });
    } finally {
      setLocationLoading(false);
    }
  }, [user?.zone_name, user?.area_name, user?.branch_name]);

  useEffect(() => { void loadLocation(); }, [loadLocation]);

  const choosePhoto = async () => {
    if (uploading || saving) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo Permission', 'Allow CUPAD to access your photos to update your profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: false,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;

    setUploading(true);
    const previousPic = user?.profile_pic;
    try {
      const asset = result.assets[0];
      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 512 } }],
        { compress: 0.62, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      );
      if (!manipulated.base64) throw new Error('Could not prepare the selected photo.');
      const dataUri = `data:image/jpeg;base64,${manipulated.base64}`;
      if (dataUri.length > 2_400_000) throw new Error('Image is still too large. Please choose another photo.');
      setProfilePic(dataUri);
      const updated = await updateUser({ profile_pic: dataUri });
      setProfilePic(updated.profile_pic || undefined);
      Alert.alert('Photo Updated', 'Your profile picture has been updated.');
    } catch (e: any) {
      setProfilePic(previousPic || undefined);
      Alert.alert('Photo Update Failed', e?.message || 'Could not update your profile picture.');
    } finally {
      setUploading(false);
    }
  };

  const saveProfile = async () => {
    if (saving || uploading) return;
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (trimmedName.length < 2) { Alert.alert('Invalid Name', 'Enter your full name.'); return; }
    if (!trimmedEmail || !/^\S+@\S+\.\S+$/.test(trimmedEmail)) { Alert.alert('Invalid Email', 'Enter a valid email address.'); return; }
    if (newPassword && newPassword.length < 6) { Alert.alert('Password', 'New password must be at least 6 characters.'); return; }
    if (newPassword && newPassword !== confirmPassword) { Alert.alert('Password', 'New password and confirmation do not match.'); return; }
    if (newPassword && !currentPassword) { Alert.alert('Password', 'Enter your current password before setting a new one.'); return; }

    setSaving(true);
    try {
      const updated = await updateUser({
        full_name: trimmedName,
        email: trimmedEmail,
        ...(newPassword ? { current_password: currentPassword, new_password: newPassword } : {}),
      });
      setName(updated.full_name || updated.name || trimmedName);
      setEmail(updated.email || trimmedEmail);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Profile Updated', 'Your profile details have been saved successfully.');
    } catch (e: any) {
      Alert.alert('Update Failed', e?.message || 'Could not update your profile.');
    } finally {
      setSaving(false);
    }
  };

  const doLogout = async () => {
    if (busy) return;
    setBusy(true);
    try { await logout(); } finally { router.replace('/(auth)/login'); setBusy(false); }
  };

  const handleLogout = () => {
    if (busy) return;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm('Are you sure you want to sign out?')) void doLogout();
      return;
    }
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => void doLogout() },
    ]);
  };

  return (
    <KeyboardAvoidingView style={[styles.screen, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.heroTop}>
            <TouchableOpacity onPress={() => void choosePhoto()} activeOpacity={0.86} disabled={uploading || saving}>
              <View style={[styles.avatarFrame, { backgroundColor: colors.infoBg, borderColor: colors.primary }]}>
                {profileUri ? (
                  <Image source={{ uri: profileUri }} style={styles.avatarImage} resizeMode="cover" onError={() => setProfilePic(undefined)} />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: roleCfg.accent || colors.primary }]}><Text style={styles.avatarText}>{initials || 'U'}</Text></View>
                )}
              </View>
              <View style={[styles.cameraBadge, { backgroundColor: colors.primary, borderColor: colors.card }]}>
                {uploading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="camera" size={14} color="#fff" />}
              </View>
            </TouchableOpacity>
            <View style={styles.heroInfo}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>{displayName}</Text>
              <View style={styles.rolePill}>
                <View style={[styles.roleDot, { backgroundColor: roleCfg.accent || colors.primary }]} />
                <Text style={[styles.role, { color: roleCfg.accent || colors.primary }]}>{roleCfg.label}</Text>
              </View>
              <TouchableOpacity onPress={() => void choosePhoto()} disabled={uploading || saving} style={styles.changePhoto}>
                <Ionicons name="camera-outline" size={14} color={colors.primary} />
                <Text style={[styles.changePhotoText, { color: colors.primary }]}>{uploading ? 'Uploading…' : 'Change photo'}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={[styles.assignmentBar, { backgroundColor: colors.infoBg }]}>
            <Ionicons name="location" size={17} color={colors.primary} />
            <View style={styles.assignmentText}>
              <Text style={[styles.assignmentLabel, { color: colors.textSecondary }]}>ASSIGNED LOCATION</Text>
              {locationLoading ? <Text style={[styles.assignmentValue, { color: colors.textSecondary }]}>Loading…</Text> : <Text style={[styles.assignmentValue, { color: colors.text }]} numberOfLines={1}>{locationText || 'Not assigned'}</Text>}
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </View>
        </View>

        <SectionCard colors={colors} icon="person-outline" title="Personal information" subtitle="Keep your account details up to date">
          <Field label="Full name" value={name} onChangeText={setName} placeholder="Enter your full name" icon="person-outline" colors={colors} />
          <Field label="Email address" value={email} onChangeText={setEmail} placeholder="Enter your email" icon="mail-outline" keyboardType="email-address" autoCapitalize="none" colors={colors} />
          <InfoRow icon="at-outline" label="Username" value={user?.username} colors={colors} />
          <InfoRow icon="call-outline" label="Phone" value={user?.phone || 'Not provided'} colors={colors} last />
        </SectionCard>

        <SectionCard colors={colors} icon="shield-checkmark-outline" title="Security" subtitle="Change your password when needed" style={{ marginTop: 12 }}>
          <PasswordField label="Current password" value={currentPassword} onChangeText={setCurrentPassword} visible={showCurrentPassword} setVisible={setShowCurrentPassword} colors={colors} />
          <PasswordField label="New password" value={newPassword} onChangeText={setNewPassword} visible={showNewPassword} setVisible={setShowNewPassword} colors={colors} />
          <PasswordField label="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} visible={showConfirmPassword} setVisible={setShowConfirmPassword} colors={colors} last />
          <View style={[styles.securityHint, { backgroundColor: colors.infoBg }]}>
            <Ionicons name="information-circle-outline" size={17} color={colors.primary} />
            <Text style={[styles.securityHintText, { color: colors.textSecondary }]}>Leave all password fields blank if you only want to update your profile details.</Text>
          </View>
        </SectionCard>

        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving || uploading ? 0.65 : 1 }]} onPress={() => void saveProfile()} disabled={saving || uploading} activeOpacity={0.86}>
          {saving ? <ActivityIndicator color="#fff" /> : <><Ionicons name="checkmark-circle-outline" size={21} color="#fff" /><Text style={styles.saveText}>Save changes</Text></>}
        </TouchableOpacity>

        <SectionCard colors={colors} icon="map-outline" title="Assigned location" subtitle="Your current field assignment" style={{ marginTop: 12 }}>
          {locationLoading ? (
            <View style={styles.loadingRow}><ActivityIndicator size="small" color={colors.primary} /><Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading location…</Text></View>
          ) : <>
            <InfoRow icon="globe-outline" label="Zone" value={location.zone || 'Not assigned'} colors={colors} />
            <InfoRow icon="map-outline" label="Area" value={location.area || 'Not assigned'} colors={colors} />
            <InfoRow icon="business-outline" label="Branch" value={location.branch || 'Not assigned'} colors={colors} last />
          </>}
        </SectionCard>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 12 }]}>
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: colors.infoBg }]}><Ionicons name={mode === 'dark' ? 'moon' : 'sunny'} size={20} color={colors.primary} /></View>
            <View style={styles.settingText}><Text style={[styles.settingTitle, { color: colors.text }]}>Dark mode</Text><Text style={[styles.settingHint, { color: colors.textSecondary }]}>{mode === 'dark' ? 'Enabled' : 'Disabled'}</Text></View>
            <Switch value={mode === 'dark'} onValueChange={() => toggle()} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
          </View>
        </View>

        <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: colors.logoutBg, borderColor: colors.logoutBg, opacity: busy ? 0.7 : 1 }]} onPress={handleLogout} disabled={busy} activeOpacity={0.82}>
          {busy ? <ActivityIndicator color={colors.error} /> : <><Ionicons name="log-out-outline" size={21} color={colors.error} /><Text style={[styles.logoutText, { color: colors.error }]}>Sign out</Text></>}
        </TouchableOpacity>
        <Text style={[styles.footer, { color: colors.textMuted }]}>CUPAD Mobile • Account & Security</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SectionCard({ icon, title, subtitle, colors, children, style }: any) {
  return <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
    <View style={styles.sectionTitleRow}>
      <View style={[styles.sectionIcon, { backgroundColor: colors.infoBg }]}><Ionicons name={icon} size={19} color={colors.primary} /></View>
      <View style={styles.sectionTitleText}><Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.sectionHint, { color: colors.textSecondary }]}>{subtitle}</Text></View>
    </View>
    {children}
  </View>;
}

function Field({ label, value, onChangeText, placeholder, icon, colors, keyboardType, autoCapitalize }: any) {
  return <View style={styles.fieldWrap}>
    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
    <View style={[styles.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
      <Ionicons name={icon} size={19} color={colors.primary} />
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.textMuted} keyboardType={keyboardType} autoCapitalize={autoCapitalize} style={[styles.input, { color: colors.text }]} returnKeyType="done" />
    </View>
  </View>;
}

function PasswordField({ label, value, onChangeText, visible, setVisible, colors, last }: any) {
  return <View style={[styles.fieldWrap, last && { marginBottom: 0 }]}>
    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
    <View style={[styles.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
      <Ionicons name="lock-closed-outline" size={19} color={colors.primary} />
      <TextInput value={value} onChangeText={onChangeText} placeholder="Enter password" placeholderTextColor={colors.textMuted} secureTextEntry={!visible} style={[styles.input, { color: colors.text }]} autoCapitalize="none" returnKeyType="done" />
      <TouchableOpacity onPress={() => setVisible(!visible)} hitSlop={10}><Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textSecondary} /></TouchableOpacity>
    </View>
  </View>;
}

function InfoRow({ icon, label, value, colors, last }: { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string | null; colors: any; last?: boolean }) {
  return <View style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
    <Ionicons name={icon} size={19} color={colors.primary} />
    <View style={styles.rowText}><Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{label}</Text><Text style={[styles.rowValue, { color: colors.text }]} numberOfLines={2}>{value || '—'}</Text></View>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { padding: SPACING.md, paddingBottom: 44 },
  hero: { borderRadius: 20, borderWidth: 1, padding: 14, marginBottom: 12 },
  heroTop: { flexDirection: 'row', alignItems: 'center' },
  heroInfo: { flex: 1, marginLeft: 14 },
  avatarFrame: { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center', borderWidth: 2, padding: 2, overflow: 'hidden' },
  avatar: { width: '100%', height: '100%', borderRadius: 42, justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 42 },
  avatarText: { fontSize: 30, fontWeight: '700', color: '#fff' },
  cameraBadge: { position: 'absolute', right: -1, bottom: -1, width: 29, height: 29, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  name: { fontSize: 21, fontWeight: '700', lineHeight: 27 },
  rolePill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: 5 },
  roleDot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  role: { fontSize: 12, fontWeight: '700' },
  changePhoto: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: 9, paddingVertical: 3 },
  changePhotoText: { fontSize: 12, fontWeight: '600', marginLeft: 5 },
  assignmentBar: { minHeight: 50, borderRadius: 13, marginTop: 14, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' },
  assignmentText: { flex: 1, marginHorizontal: 10 },
  assignmentLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.7 },
  assignmentValue: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  card: { borderRadius: 16, borderWidth: 1, padding: 8 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', padding: 10, paddingBottom: 7 },
  sectionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sectionTitleText: { marginLeft: 11, flex: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  sectionHint: { fontSize: 11, marginTop: 2 },
  fieldWrap: { marginHorizontal: 8, marginBottom: 8 },
  fieldLabel: { fontSize: 11, fontWeight: '600', marginBottom: 5 },
  inputWrap: { minHeight: 48, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  input: { flex: 1, marginLeft: 9, fontSize: 14, minHeight: 46 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  rowText: { marginLeft: 12, flex: 1 },
  rowLabel: { fontSize: 11 },
  rowValue: { fontSize: 14, fontWeight: '500', marginTop: 2 },
  securityHint: { margin: 8, marginTop: 11, borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center' },
  securityHintText: { flex: 1, fontSize: 11, lineHeight: 16, marginLeft: 8 },
  saveBtn: { minHeight: 52, borderRadius: 13, marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  loadingText: { marginLeft: 10, fontSize: 12 },
  settingRow: { flexDirection: 'row', alignItems: 'center', padding: 10 },
  settingIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  settingText: { flex: 1, marginLeft: 12 },
  settingTitle: { fontSize: 14, fontWeight: '600' },
  settingHint: { fontSize: 11, marginTop: 2 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 13, borderWidth: 1, padding: 15, gap: 8, marginTop: 18 },
  logoutText: { fontSize: 15, fontWeight: '700' },
  footer: { textAlign: 'center', fontSize: 10, marginTop: 14 },
});
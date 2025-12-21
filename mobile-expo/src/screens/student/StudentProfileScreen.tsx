import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  Alert,
  Switch,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../api/client';
import { colors } from '../../theme/colors';

type Profile = {
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: string;
  avatar?: string;
  stats?: {
    averageGrade?: number;
    totalAssignments?: number;
    submittedAssignments?: number;
    enrolledClasses?: number;
  };
};

type NotificationSettings = {
  emailNotifications?: boolean;
  assignmentDeadlines?: boolean;
  gradeUpdates?: boolean;
  classAnnouncements?: boolean;
  systemUpdates?: boolean;
};

const StudentProfileScreen: React.FC = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Password change states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordStep, setPasswordStep] = useState(0); // 0: request code, 1: reset password
  const [passwordEmail, setPasswordEmail] = useState('');
  const [passwordCode, setPasswordCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  
  // Notification settings states
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    assignmentDeadlines: true,
    gradeUpdates: true,
    classAnnouncements: true,
  });
  const [notificationLoading, setNotificationLoading] = useState(false);

  useEffect(() => {
    loadProfile();
    loadNotificationSettings();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await api.studentProfile();
      setProfile(data);
      setForm(data);
      if (data.email) {
        setPasswordEmail(data.email);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tải hồ sơ');
    } finally {
      setLoading(false);
    }
  };

  const loadNotificationSettings = async () => {
    try {
      const settings = await api.studentGetNotificationSettings();
      setNotificationSettings({
        emailNotifications: settings.emailNotifications ?? true,
        assignmentDeadlines: settings.assignmentDeadlines ?? true,
        gradeUpdates: settings.gradeUpdates ?? true,
        classAnnouncements: settings.classAnnouncements ?? true,
      });
    } catch (e) {
      console.warn('Không thể tải cài đặt thông báo:', e);
    }
  };

  const updateForm = (field: keyof Profile, value: string) => {
    setForm(prev => (prev ? { ...prev, [field]: value } : prev));
  };

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Cần quyền truy cập thư viện ảnh.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.length || !form) return;
    const asset = result.assets[0];
    try {
      const formData = new FormData();
      formData.append('avatar', {
        uri: asset.uri,
        name: asset.fileName ?? `avatar-${Date.now()}.jpg`,
        type: asset.mimeType ?? 'image/jpeg',
      } as any);
      const response = await api.studentUploadAvatar(formData);
      setForm({ ...form, avatar: response.avatar });
      setProfile(prev => (prev ? { ...prev, avatar: response.avatar } : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tải ảnh đại diện');
    }
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const updated = await api.studentUpdateProfile({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        address: form.address,
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
      });
      setProfile(updated);
      setForm(updated);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể cập nhật hồ sơ');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestPasswordCode = async () => {
    if (!passwordEmail.trim()) {
      setPasswordError('Vui lòng nhập email');
      return;
    }
    setPasswordLoading(true);
    setPasswordError(null);
    try {
      await api.forgotPassword(passwordEmail.trim());
      setPasswordStep(1);
      Alert.alert('Thành công', 'Mã xác nhận đã được gửi đến email của bạn. Vui lòng kiểm tra email.');
    } catch (e) {
      setPasswordError(e instanceof Error ? e.message : 'Không thể gửi mã xác nhận');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!passwordCode.trim() || !newPassword || !confirmPassword) {
      setPasswordError('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Mật khẩu mới phải có ít nhất 8 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu mới không khớp');
      return;
    }
    setPasswordLoading(true);
    setPasswordError(null);
    try {
      await api.resetPassword({ token: passwordCode.trim(), newPassword });
      Alert.alert('Thành công', 'Đổi mật khẩu thành công!', [
        { text: 'OK', onPress: () => {
          setShowPasswordModal(false);
          setPasswordStep(0);
          setPasswordCode('');
          setNewPassword('');
          setConfirmPassword('');
        }}
      ]);
    } catch (e) {
      let message = e instanceof Error ? e.message : 'Không thể đổi mật khẩu';
      if (message === 'INVALID_OR_EXPIRED_TOKEN') {
        message = 'Mã xác nhận không hợp lệ hoặc đã hết hạn';
      }
      setPasswordError(message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleNotificationChange = async (key: keyof NotificationSettings, value: boolean) => {
    const previousValue = notificationSettings[key];
    setNotificationSettings(prev => ({ ...prev, [key]: value }));
    setNotificationLoading(true);
    try {
      await api.studentUpdateNotificationSettings({ [key]: value });
    } catch (e) {
      setNotificationSettings(prev => ({ ...prev, [key]: previousValue }));
      Alert.alert('Lỗi', 'Không thể cập nhật cài đặt thông báo');
    } finally {
      setNotificationLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!form) {
    return (
      <View style={styles.loading}>
        <Text>Không có dữ liệu hồ sơ.</Text>
      </View>
    );
  }

  const stats = [
    {
      label: 'Điểm TB',
      value: form.stats?.averageGrade
        ? `${form.stats.averageGrade.toFixed(1)}/10`
        : '--',
    },
    {
      label: 'Bài tập đã nộp',
      value: `${form.stats?.submittedAssignments || 0}/${
        form.stats?.totalAssignments || 0
      }`,
    },
    {
      label: 'Lớp học',
      value: form.stats?.enrolledClasses || 0,
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Thông tin cá nhân</Text>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.card}>
        <View style={styles.avatarRow}>
          {form.avatar ? (
            <Image source={{ uri: form.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarPlaceholderText}>
                {form.fullName?.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{form.fullName}</Text>
            <Text style={styles.email}>{form.email}</Text>
          </View>
          <TouchableOpacity style={styles.linkButton} onPress={pickAvatar}>
            <Text style={styles.linkText}>Đổi ảnh</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Họ và tên</Text>
          <TextInput
            style={styles.input}
            editable={editing}
            value={form.fullName}
            onChangeText={value => updateForm('fullName', value)}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            editable={editing}
            keyboardType="email-address"
            value={form.email}
            onChangeText={value => updateForm('email', value)}
          />
        </View>

        <View style={styles.fieldRow}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>Số điện thoại</Text>
            <TextInput
              style={styles.input}
              editable={editing}
              keyboardType="phone-pad"
              value={form.phone}
              onChangeText={value => updateForm('phone', value)}
            />
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>Ngày sinh</Text>
            <TextInput
              style={styles.input}
              editable={editing}
              placeholder="YYYY-MM-DD"
              value={form.dateOfBirth}
              onChangeText={value => updateForm('dateOfBirth', value)}
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Địa chỉ</Text>
          <TextInput
            style={[styles.input, { minHeight: 60 }]}
            editable={editing}
            multiline
            value={form.address}
            onChangeText={value => updateForm('address', value)}
          />
        </View>

        <View style={styles.statsRow}>
          {stats.map(item => (
            <View key={item.label} style={styles.statsCard}>
              <Text style={styles.statsValue}>{item.value}</Text>
              <Text style={styles.statsLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actionsRow}>
          {!editing ? (
            <TouchableOpacity
              style={[styles.primaryButton, { flex: 1 }]}
              onPress={() => setEditing(true)}
            >
              <Text style={styles.primaryButtonText}>Chỉnh sửa</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.secondaryButton, { flex: 1 }]}
                onPress={() => {
                  setForm(profile);
                  setEditing(false);
                }}
              >
                <Text style={styles.secondaryButtonText}>Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, { flex: 1 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Lưu</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Change Password Card */}
      <View style={[styles.card, { marginTop: 16 }]}>
        <Text style={styles.sectionTitle}>Bảo mật</Text>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setShowPasswordModal(true)}
        >
          <Text style={styles.menuItemText}>Đổi mật khẩu</Text>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Notification Settings Card */}
      <View style={[styles.card, { marginTop: 16 }]}>
        <Text style={styles.sectionTitle}>Cài đặt thông báo</Text>
        <View style={styles.notificationItem}>
          <Text style={styles.notificationLabel}>Thông báo</Text>
          <Switch
            value={notificationSettings.emailNotifications ?? true}
            onValueChange={(value) => handleNotificationChange('emailNotifications', value)}
            disabled={notificationLoading}
          />
        </View>
        <View style={[
          styles.notificationItem,
          !(notificationSettings.emailNotifications ?? true) && styles.disabledItem
        ]}>
          <Text style={[
            styles.notificationLabel,
            !(notificationSettings.emailNotifications ?? true) && styles.disabledText
          ]}>
            Deadline bài tập
          </Text>
          <Switch
            value={notificationSettings.assignmentDeadlines ?? true}
            onValueChange={(value) => handleNotificationChange('assignmentDeadlines', value)}
            disabled={notificationLoading || !(notificationSettings.emailNotifications ?? true)}
          />
        </View>
        <View style={[
          styles.notificationItem,
          !(notificationSettings.emailNotifications ?? true) && styles.disabledItem
        ]}>
          <Text style={[
            styles.notificationLabel,
            !(notificationSettings.emailNotifications ?? true) && styles.disabledText
          ]}>
            Cập nhật điểm
          </Text>
          <Switch
            value={notificationSettings.gradeUpdates ?? true}
            onValueChange={(value) => handleNotificationChange('gradeUpdates', value)}
            disabled={notificationLoading || !(notificationSettings.emailNotifications ?? true)}
          />
        </View>
        <View style={[
          styles.notificationItem,
          !(notificationSettings.emailNotifications ?? true) && styles.disabledItem
        ]}>
          <Text style={[
            styles.notificationLabel,
            !(notificationSettings.emailNotifications ?? true) && styles.disabledText
          ]}>
            Thông báo lớp học
          </Text>
          <Switch
            value={notificationSettings.classAnnouncements ?? true}
            onValueChange={(value) => handleNotificationChange('classAnnouncements', value)}
            disabled={notificationLoading || !(notificationSettings.emailNotifications ?? true)}
          />
        </View>
      </View>

      {/* Change Password Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowPasswordModal(false);
          setPasswordStep(0);
          setPasswordCode('');
          setNewPassword('');
          setConfirmPassword('');
          setPasswordError(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Đổi mật khẩu</Text>
            
            {passwordStep === 0 ? (
              <>
                <Text style={styles.modalDescription}>
                  Mã xác nhận sẽ được gửi đến email của bạn
                </Text>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    value={passwordEmail}
                    onChangeText={setPasswordEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="Nhập email của bạn"
                  />
                </View>
                {passwordError && (
                  <Text style={styles.errorText}>{passwordError}</Text>
                )}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.secondaryButton, { flex: 1 }]}
                    onPress={() => {
                      setShowPasswordModal(false);
                      setPasswordError(null);
                    }}
                  >
                    <Text style={styles.secondaryButtonText}>Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.primaryButton, { flex: 1 }]}
                    onPress={handleRequestPasswordCode}
                    disabled={passwordLoading}
                  >
                    {passwordLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Gửi mã</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.modalDescription}>
                  Nhập mã xác nhận và mật khẩu mới
                </Text>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Mã xác nhận</Text>
                  <TextInput
                    style={styles.input}
                    value={passwordCode}
                    onChangeText={setPasswordCode}
                    placeholder="Nhập mã xác nhận"
                    autoCapitalize="none"
                  />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Mật khẩu mới</Text>
                  <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                    placeholder="Ít nhất 8 ký tự"
                  />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Xác nhận mật khẩu</Text>
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    placeholder="Nhập lại mật khẩu mới"
                  />
                </View>
                {passwordError && (
                  <Text style={styles.errorText}>{passwordError}</Text>
                )}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.secondaryButton, { flex: 1 }]}
                    onPress={() => {
                      setPasswordStep(0);
                      setPasswordCode('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setPasswordError(null);
                    }}
                  >
                    <Text style={styles.secondaryButtonText}>Quay lại</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.primaryButton, { flex: 1 }]}
                    onPress={handleResetPassword}
                    disabled={passwordLoading}
                  >
                    {passwordLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Đổi mật khẩu</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: 24, fontWeight: '700', color: colors.secondary, marginBottom: 16 },
  errorText: { color: colors.danger, marginBottom: 8 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 72, height: 72, borderRadius: 72 },
  avatarPlaceholder: {
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: { fontSize: 28, color: colors.primary, fontWeight: '700' },
  name: { fontSize: 18, fontWeight: '600', color: colors.secondary },
  email: { color: colors.textSecondary, marginTop: 2 },
  linkButton: { padding: 8 },
  linkText: { color: colors.primary, fontWeight: '600' },
  fieldGroup: { marginBottom: 14 },
  label: { color: colors.textSecondary, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff7f8',
  },
  fieldRow: { flexDirection: 'row', gap: 12 },
  statsRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  statsCard: {
    flex: 1,
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statsValue: { fontSize: 16, fontWeight: '600', color: colors.secondary },
  statsLabel: { color: colors.textSecondary, fontSize: 12 },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontWeight: '600' },
  secondaryButton: {
    backgroundColor: colors.border,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: { color: colors.secondary, fontWeight: '600' },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.secondary,
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuItemText: {
    fontSize: 16,
    color: colors.secondary,
  },
  menuItemArrow: {
    fontSize: 24,
    color: colors.textSecondary,
  },
  notificationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  notificationLabel: {
    fontSize: 16,
    color: colors.secondary,
    flex: 1,
  },
  disabledItem: {
    opacity: 0.5,
  },
  disabledText: {
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.secondary,
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
});

export default StudentProfileScreen;


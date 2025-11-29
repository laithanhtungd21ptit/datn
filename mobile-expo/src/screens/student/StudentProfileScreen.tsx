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

const StudentProfileScreen: React.FC = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.studentProfile();
        setProfile(data);
        setForm(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Không thể tải hồ sơ');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
});

export default StudentProfileScreen;


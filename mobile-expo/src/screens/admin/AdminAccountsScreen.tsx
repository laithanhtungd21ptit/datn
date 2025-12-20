import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../../api/client';
import { colors } from '../../theme/colors';

type Account = {
  id: string;
  fullName: string;
  email?: string;
  role: 'student' | 'teacher' | 'admin';
  status?: 'active' | 'inactive';
  username?: string;
  phone?: string;
  department?: string;
};

const roleLabel: Record<string, string> = {
  teacher: 'Giảng viên',
  student: 'Sinh viên',
  admin: 'Quản trị viên',
};

const statusLabel: Record<string, string> = {
  active: 'Hoạt động',
  inactive: 'Không hoạt động',
};

const AdminAccountsScreen: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'teacher' | 'admin'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationForm, setNotificationForm] = useState({ title: '', content: '', type: 'general' });
  const [sendingNotification, setSendingNotification] = useState(false);
  const [editingUser, setEditingUser] = useState({
    fullName: '',
    email: '',
    role: 'student' as 'student' | 'teacher' | 'admin',
    status: 'active' as 'active' | 'inactive',
    phone: '',
    department: '',
  });
  const [creatingAccount, setCreatingAccount] = useState({
    fullName: '',
    email: '',
    username: '',
    password: '',
    phone: '',
    department: '',
    role: 'student',
  });

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        q: search.trim() || undefined,
        role: roleFilter === 'all' ? undefined : roleFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
      };
      const data = await api.adminAccounts?.(params);
      const items = Array.isArray(data)
        ? data
        : Array.isArray((data as any)?.items)
          ? (data as any).items
          : [];
      setAccounts(
        items.map((item: any) => ({
          id: item.id || item._id,
          fullName: item.fullName || item.name || item.username,
          email: item.email,
          role: item.role,
          status: item.status === 'disabled' ? 'inactive' : (item.status || 'active'),
          username: item.username,
          phone: item.phone,
          department: item.department,
        })),
      );
    } catch (error) {
      console.warn('Không thể tải danh sách tài khoản:', error);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const filteredAccounts = useMemo(() => {
    return accounts.filter(account => {
      const matchesSearch =
        search.trim().length === 0 ||
        account.fullName.toLowerCase().includes(search.toLowerCase()) ||
        account.email?.toLowerCase().includes(search.toLowerCase()) ||
        account.username?.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === 'all' || account.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || account.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [accounts, search, roleFilter, statusFilter]);

  const openEditModal = (account: Account) => {
    setSelectedAccount(account);
    setEditingUser({
      fullName: account.fullName || '',
      email: account.email || '',
      role: account.role,
      status: account.status === 'disabled' ? 'inactive' : (account.status || 'active'),
      phone: (account as any).phone || '',
      department: (account as any).department || '',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async () => {
    if (!selectedAccount) return;
    if (!editingUser.fullName?.trim() || !editingUser.email?.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập họ tên và email');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editingUser.email)) {
      Alert.alert('Lỗi', 'Email không hợp lệ');
      return;
    }
    try {
      await api.adminUpdateAccount?.(selectedAccount.id, editingUser);
      await loadAccounts();
      setShowEditModal(false);
      Alert.alert('Thành công', 'Cập nhật tài khoản thành công');
    } catch (error) {
      console.warn('Không thể cập nhật tài khoản:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật tài khoản. Vui lòng thử lại.');
    }
  };

  const handleResetPassword = async () => {
    if (!selectedAccount) return;
    Alert.alert(
      'Reset mật khẩu',
      `Bạn chắc chắn muốn reset mật khẩu cho tài khoản "${selectedAccount.fullName}"? Mật khẩu mới sẽ là "123456".`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Reset',
          onPress: async () => {
            try {
              await api.adminUpdateAccount?.(selectedAccount.id, { resetPassword: true });
              Alert.alert('Thành công', 'Đã reset mật khẩu thành công. Mật khẩu mới là "123456".');
              setShowEditModal(false);
              await loadAccounts();
            } catch (error) {
              console.warn('Không thể reset mật khẩu:', error);
              Alert.alert('Lỗi', 'Không thể reset mật khẩu. Vui lòng thử lại.');
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  const handleSendNotification = (account: Account) => {
    setSelectedAccount(account);
    setNotificationForm({ title: '', content: '', type: 'general' });
    setShowNotificationModal(true);
  };

  const handleSubmitNotification = async () => {
    if (!selectedAccount || !notificationForm.title.trim() || !notificationForm.content.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo');
      return;
    }
    setSendingNotification(true);
    try {
      await api.adminSendNotification?.({
        recipientId: selectedAccount.id,
        title: notificationForm.title.trim(),
        content: notificationForm.content.trim(),
        type: notificationForm.type,
      });
      Alert.alert('Thành công', `Đã gửi thông báo đến ${selectedAccount.fullName}`);
      setShowNotificationModal(false);
      setNotificationForm({ title: '', content: '', type: 'general' });
    } catch (error) {
      console.warn('Không thể gửi thông báo:', error);
      Alert.alert('Lỗi', 'Không thể gửi thông báo. Vui lòng thử lại.');
    } finally {
      setSendingNotification(false);
    }
  };

  const handleDeleteAccount = (account: Account) => {
    Alert.alert(
      'Xóa tài khoản',
      `Bạn chắc chắn muốn xóa tài khoản "${account.fullName}"? Hành động này không thể hoàn tác.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.adminDeleteAccount?.(account.id);
              await loadAccounts();
              if (showEditModal && selectedAccount?.id === account.id) {
                setShowEditModal(false);
              }
            } catch (error) {
              console.warn('Không thể xóa tài khoản:', error);
              Alert.alert('Lỗi', 'Không thể xóa tài khoản. Vui lòng thử lại.');
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  const handleCreateAccount = async () => {
    if (!creatingAccount.fullName?.trim()) {
      Alert.alert('Thiếu thông tin', 'Họ tên là bắt buộc');
      return;
    }
    if (!creatingAccount.email?.trim()) {
      Alert.alert('Thiếu thông tin', 'Email là bắt buộc');
      return;
    }
    if (!creatingAccount.username?.trim()) {
      Alert.alert('Thiếu thông tin', 'Username là bắt buộc');
      return;
    }
    if (!creatingAccount.password?.trim()) {
      Alert.alert('Thiếu thông tin', 'Mật khẩu là bắt buộc');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(creatingAccount.email)) {
      Alert.alert('Lỗi', 'Email không hợp lệ');
      return;
    }
    try {
      await api.adminCreateAccount?.(creatingAccount);
      setCreatingAccount({ fullName: '', email: '', username: '', password: '', phone: '', department: '', role: 'student' });
      setShowCreateModal(false);
      await loadAccounts();
    } catch (error) {
      console.warn('Không thể tạo tài khoản:', error);
      Alert.alert('Lỗi', 'Không thể tạo tài khoản. Vui lòng thử lại.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quản lý tài khoản</Text>
      <Text style={styles.subtitle}>Theo dõi & thao tác tài khoản người dùng.</Text>

      <View style={styles.filters}>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm theo tên, email hoặc username"
          value={search}
          onChangeText={setSearch}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
          {[
            { key: 'all', label: 'Tất cả vai trò' },
            { key: 'student', label: 'Sinh viên' },
            { key: 'teacher', label: 'Giảng viên' },
            { key: 'admin', label: 'Quản trị' },
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.filterChip,
                roleFilter === tab.key && styles.filterChipActive,
              ]}
              onPress={() => setRoleFilter(tab.key as typeof roleFilter)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  roleFilter === tab.key && styles.filterChipTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
          {[
            { key: 'all', label: 'Tất cả trạng thái' },
            { key: 'active', label: 'Hoạt động' },
            { key: 'inactive', label: 'Không hoạt động' },
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.filterChip,
                statusFilter === tab.key && styles.filterChipActive,
              ]}
              onPress={() => setStatusFilter(tab.key as typeof statusFilter)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === tab.key && styles.filterChipTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Text style={styles.createButtonText}>+ Tạo tài khoản mới</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={filteredAccounts}
          keyExtractor={item => item.id}
          contentContainerStyle={{ gap: 12, paddingBottom: 60 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => openEditModal(item)}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{item.fullName}</Text>
                  <Text
                    style={[
                      styles.statusBadge,
                      item.status === 'active' ? styles.statusActive : styles.statusInactive,
                    ]}
                  >
                    {statusLabel[item.status || 'active']}
                  </Text>
                </View>
                <Text style={styles.cardMeta}>Vai trò: {roleLabel[item.role]}</Text>
                <Text style={styles.cardMeta}>Email: {item.email || '—'}</Text>
                <Text style={styles.cardMeta}>Username: {item.username || '—'}</Text>
              </TouchableOpacity>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.sendNotificationButton}
                  onPress={() => handleSendNotification(item)}
                >
                  <Text style={styles.sendNotificationButtonText}>Gửi thông báo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteAccount(item)}
                >
                  <Text style={styles.deleteButtonText}>Xóa</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Không có tài khoản</Text>
              <Text style={styles.emptySubtitle}>Thay đổi bộ lọc hoặc tạo mới.</Text>
            </View>
          }
        />
      )}

      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Chỉnh sửa tài khoản</Text>
            <ScrollView style={{ maxHeight: 500 }}>
              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Họ và tên *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập họ và tên"
                  value={editingUser.fullName}
                  onChangeText={value => setEditingUser(prev => ({ ...prev, fullName: value }))}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Email *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={editingUser.email}
                  onChangeText={value => setEditingUser(prev => ({ ...prev, email: value }))}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Số điện thoại</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập số điện thoại (tùy chọn)"
                  keyboardType="phone-pad"
                  value={editingUser.phone}
                  onChangeText={value => setEditingUser(prev => ({ ...prev, phone: value }))}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Khoa/Bộ môn</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập khoa/bộ môn (tùy chọn)"
                  value={editingUser.department}
                  onChangeText={value => setEditingUser(prev => ({ ...prev, department: value }))}
                />
              </View>
              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Vai trò *</Text>
                <View style={styles.roleTabs}>
                  {(['student', 'teacher', 'admin'] as const).map(role => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.roleChip,
                        editingUser.role === role && styles.roleChipActive,
                      ]}
                      onPress={() => setEditingUser(prev => ({ ...prev, role }))}
                    >
                      <Text
                        style={[
                          styles.roleChipText,
                          editingUser.role === role && styles.roleChipTextActive,
                        ]}
                      >
                        {roleLabel[role]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Trạng thái *</Text>
                <View style={styles.roleTabs}>
                  {(['active', 'inactive'] as const).map(status => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.roleChip,
                        editingUser.status === status && styles.roleChipActive,
                      ]}
                      onPress={() => setEditingUser(prev => ({ ...prev, status }))}
                    >
                      <Text
                        style={[
                          styles.roleChipText,
                          editingUser.status === status && styles.roleChipTextActive,
                        ]}
                      >
                        {statusLabel[status]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalButton} onPress={handleEditSubmit}>
                <Text style={styles.modalButtonText}>Lưu</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonDanger]}
                onPress={handleResetPassword}
              >
                <Text style={styles.modalButtonDangerText}>Reset mật khẩu</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonDanger]}
                onPress={() => {
                  setShowEditModal(false);
                  if (selectedAccount) {
                    handleDeleteAccount(selectedAccount);
                  }
                }}
              >
                <Text style={styles.modalButtonDangerText}>Xóa tài khoản</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.modalCloseText}>Hủy</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowEditModal(false)}
            >
              <Text style={styles.modalCloseText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tạo tài khoản mới</Text>
            <ScrollView style={{ maxHeight: 500 }}>
              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Username *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập username"
                  autoCapitalize="none"
                  value={creatingAccount.username}
                  onChangeText={value => setCreatingAccount(prev => ({ ...prev, username: value }))}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Họ và tên *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập họ và tên"
                  value={creatingAccount.fullName}
                  onChangeText={value => setCreatingAccount(prev => ({ ...prev, fullName: value }))}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Email *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={creatingAccount.email}
                  onChangeText={value => setCreatingAccount(prev => ({ ...prev, email: value }))}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Số điện thoại</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập số điện thoại (tùy chọn)"
                  keyboardType="phone-pad"
                  value={creatingAccount.phone}
                  onChangeText={value => setCreatingAccount(prev => ({ ...prev, phone: value }))}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Khoa/Bộ môn</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập khoa/bộ môn (tùy chọn)"
                  value={creatingAccount.department}
                  onChangeText={value => setCreatingAccount(prev => ({ ...prev, department: value }))}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Mật khẩu *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập mật khẩu"
                  secureTextEntry
                  value={creatingAccount.password}
                  onChangeText={value => setCreatingAccount(prev => ({ ...prev, password: value }))}
                />
              </View>
              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Vai trò *</Text>
                <View style={styles.roleTabs}>
                  {(['student', 'teacher', 'admin'] as const).map(role => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.roleChip,
                        creatingAccount.role === role && styles.roleChipActive,
                      ]}
                      onPress={() => setCreatingAccount(prev => ({ ...prev, role }))}
                    >
                      <Text
                        style={[
                          styles.roleChipText,
                          creatingAccount.role === role && styles.roleChipTextActive,
                        ]}
                      >
                        {roleLabel[role]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalButton} onPress={handleCreateAccount}>
                <Text style={styles.modalButtonText}>Tạo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.modalCloseText}>Hủy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Notification Modal */}
      <Modal
        visible={showNotificationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNotificationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Gửi thông báo đến {selectedAccount?.fullName}
            </Text>
            <ScrollView style={{ maxHeight: 400 }}>
              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Tiêu đề *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập tiêu đề thông báo"
                  value={notificationForm.title}
                  onChangeText={value => setNotificationForm(prev => ({ ...prev, title: value }))}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Nội dung *</Text>
                <TextInput
                  style={[styles.input, { height: 100 }]}
                  placeholder="Nhập nội dung thông báo"
                  multiline
                  value={notificationForm.content}
                  onChangeText={value => setNotificationForm(prev => ({ ...prev, content: value }))}
                />
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleSubmitNotification}
                disabled={sendingNotification}
              >
                {sendingNotification ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>Gửi</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => {
                  setShowNotificationModal(false);
                  setNotificationForm({ title: '', content: '', type: 'general' });
                }}
              >
                <Text style={styles.modalCloseText}>Hủy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.secondary,
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 16,
  },
  filters: {
    gap: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surface,
  },
  filterChips: {
    flexGrow: 0,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  createButton: {
    marginTop: 4,
    borderRadius: 12,
    backgroundColor: colors.secondary,
    paddingVertical: 10,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.secondary,
  },
  cardMeta: {
    color: colors.textSecondary,
    marginTop: 6,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  statusActive: {
    backgroundColor: '#dcfce7',
    color: colors.success,
  },
  statusInactive: {
    backgroundColor: '#fee2e2',
    color: colors.danger,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.secondary,
  },
  emptySubtitle: {
    color: colors.textSecondary,
    marginTop: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.secondary,
  },
  modalSubtitle: {
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 12,
  },
  modalSection: {
    marginBottom: 16,
  },
  modalLabel: {
    color: colors.textSecondary,
    marginBottom: 6,
  },
  roleTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  roleChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: 'center',
  },
  roleChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roleChipText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  roleChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  modalActions: {
    gap: 10,
  },
  modalButton: {
    borderRadius: 12,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  modalButtonDanger: {
    backgroundColor: '#fee2e2',
  },
  modalButtonDangerText: {
    color: colors.danger,
    fontWeight: '600',
  },
  modalClose: {
    marginTop: 12,
    alignItems: 'center',
  },
  modalCloseText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surface,
  },
  formField: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
    marginBottom: 6,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  sendNotificationButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
  },
  sendNotificationButtonText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: colors.danger,
    fontWeight: '600',
    fontSize: 14,
  },
});

export default AdminAccountsScreen;


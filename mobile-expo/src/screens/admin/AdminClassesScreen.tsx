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
import { api, AdminClassDetail, AdminClassSummary } from '../../api/client';
import { colors } from '../../theme/colors';

type FormState = {
  name: string;
  code: string;
  teacherId: string;
  department: string;
};

type Teacher = {
  id: string;
  fullName: string;
  department?: string;
};

const defaultForm: FormState = {
  name: '',
  code: '',
  teacherId: '',
  department: 'CNTT',
};

const AdminClassesScreen: React.FC = () => {
  const [classes, setClasses] = useState<AdminClassSummary[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(false);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState<AdminClassSummary | null>(null);
  const [classDetail, setClassDetail] = useState<AdminClassDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailTab, setDetailTab] = useState<'overview' | 'teachers' | 'students' | 'documents' | 'assignments'>('overview');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showTeacherPicker, setShowTeacherPicker] = useState(false);
  const [formData, setFormData] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const loadClasses = useCallback(
    async (query?: string) => {
      setLoading(true);
      try {
        const data = await api.adminClasses?.({
          search: query || undefined,
        });
        if (Array.isArray(data)) {
          setClasses(
            data.map(item => ({
              id: item.id,
              name: item.name,
              code: item.code,
              subject: item.subject,
              teacher: item.teacher,
              teacherId: item.teacherId,
              department: item.department,
              studentCount: item.studentCount,
              status: item.status,
              schedule: item.schedule,
              semester: item.semester,
            })),
          );
        }
      } catch (error) {
        console.warn('Không thể tải danh sách lớp:', error);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const loadTeachers = useCallback(async () => {
    setTeachersLoading(true);
    try {
      const teacherData = await api.adminAccounts?.({ role: 'teacher', pageSize: 1000 });
      
      // API trả về format { items: [...], total, page, pageSize }
      const items = (teacherData as any)?.items || [];
      
      if (items.length > 0) {
        const mappedTeachers = items.map((item: any) => ({
          id: item.id || item._id,
          fullName: item.fullName || item.name || item.username,
          department: item.department || 'CNTT',
        }));
        setTeachers(mappedTeachers);
      } else {
        console.warn('No teachers found in response');
        setTeachers([]);
      }
    } catch (error) {
      console.error('Không thể tải danh sách giảng viên:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách giảng viên. Vui lòng thử lại.');
      setTeachers([]);
    } finally {
      setTeachersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClasses();
    loadTeachers();
  }, [loadClasses, loadTeachers]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadClasses(search.trim());
    }, 400);
    return () => clearTimeout(timeout);
  }, [search, loadClasses]);

  const filteredClasses = useMemo(() => {
    if (!search.trim()) {
      return classes;
    }
    return classes.filter(cls => {
      const term = search.toLowerCase();
      return (
        cls.name?.toLowerCase().includes(term) ||
        cls.code?.toLowerCase().includes(term) ||
        cls.subject?.toLowerCase().includes(term) ||
        cls.teacher?.toLowerCase().includes(term)
      );
    });
  }, [classes, search]);

  const openDetailModal = async (cls: AdminClassSummary) => {
    setSelectedClass(cls);
    setClassDetail({ ...cls });
    setDetailTab('overview');
    setShowDetailModal(true);
    setDetailLoading(true);
    try {
      const detail = await api.adminClassDetail?.(cls.id);
      if (detail) {
        setClassDetail(prev => ({ ...(prev || cls), ...detail }));
      }
    } catch (error) {
      console.warn('Không thể tải chi tiết lớp:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setFormData(defaultForm);
    setShowFormModal(true);
    // Đảm bảo load teachers nếu chưa có
    if (teachers.length === 0 && !teachersLoading) {
      loadTeachers();
    }
  };

  const openEditModal = (cls: AdminClassSummary) => {
    setIsEditing(true);
    setSelectedClass(cls);
    setFormData({
      name: cls.name || '',
      code: cls.code || '',
      teacherId: cls.teacherId || '',
      department: cls.department || 'CNTT',
    });
    setShowFormModal(true);
    // Đảm bảo load teachers nếu chưa có
    if (teachers.length === 0 && !teachersLoading) {
      loadTeachers();
    }
  };

  const handleSaveClass = async () => {
    if (!formData.name?.trim() || !formData.code?.trim() || !formData.teacherId?.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập đầy đủ thông tin bắt buộc');
      return;
    }
    setSaving(true);
    try {
      if (isEditing && selectedClass) {
        await api.adminUpdateClass?.(selectedClass.id, formData);
        Alert.alert('Thành công', 'Cập nhật lớp học thành công');
      } else {
        await api.adminCreateClass?.(formData);
        Alert.alert('Thành công', 'Tạo lớp học thành công');
      }
      await loadClasses(search.trim());
      setShowFormModal(false);
      setFormData(defaultForm);
    } catch (error) {
      console.warn('Không thể lưu lớp:', error);
      Alert.alert('Lỗi', 'Không thể lưu lớp học. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClass = (cls: AdminClassSummary) => {
    Alert.alert(
      'Xóa lớp/môn',
      `Bạn chắc chắn muốn xóa "${cls.name}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.adminDeleteClass?.(cls.id);
              await loadClasses(search.trim());
            } catch (error) {
              console.warn('Không thể xóa lớp:', error);
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  const formatDisplayValue = (value?: unknown) => {
    if (value === null || value === undefined || value === '') {
      return '—';
    }
    if (typeof value === 'string' || typeof value === 'number') {
      return String(value);
    }
    if (Array.isArray(value)) {
      return value
        .map(item => {
          if (typeof item === 'string' || typeof item === 'number') {
            return String(item);
          }
          if (item && typeof item === 'object') {
            return (
              (item as { fullName?: string; name?: string; email?: string }).fullName ||
              (item as { fullName?: string; name?: string; email?: string }).name ||
              (item as { fullName?: string; name?: string; email?: string }).email ||
              ''
            );
          }
          return '';
        })
        .filter(Boolean)
        .join(', ');
    }
    if (typeof value === 'object') {
      const typed = value as { fullName?: string; name?: string; email?: string; username?: string };
      return (
        typed.fullName ||
        typed.name ||
        typed.email ||
        typed.username ||
        JSON.stringify(value)
      );
    }
    return String(value);
  };

  const renderMetaRow = (label: string, value?: unknown) => (
    <Text style={styles.detailMeta}>
      <Text style={styles.detailMetaLabel}>{label}: </Text>
      {formatDisplayValue(value)}
    </Text>
  );

  const renderListSection = (
    title: string,
    data?: Array<{ id?: string; fullName?: string; email?: string }>,
  ) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {data && data.length > 0 ? (
        data.map(item => (
          <View key={item.id || item.email} style={styles.listItem}>
            <Text style={styles.listItemTitle}>{item.fullName}</Text>
            <Text style={styles.listItemSubtitle}>{item.email || 'Không có email'}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.emptySection}>Chưa có dữ liệu.</Text>
      )}
    </View>
  );

  const renderResourceSection = (
    title: string,
    data?: Array<{ id?: string; title?: string; type?: string; dueDate?: string }>,
  ) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {data && data.length > 0 ? (
        data.map(item => (
          <View key={item.id || item.title} style={styles.listItem}>
            <Text style={styles.listItemTitle}>{item.title}</Text>
            <Text style={styles.listItemSubtitle}>
              {item.type || 'Tài liệu'} {item.dueDate ? `• Hạn: ${item.dueDate}` : ''}
            </Text>
          </View>
        ))
      ) : (
        <Text style={styles.emptySection}>Không có mục nào.</Text>
      )}
    </View>
  );

  return (
  <View style={styles.container}>
      <Text style={styles.title}>Quản lý lớp / môn</Text>
      <View style={styles.filters}>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm theo tên lớp, mã lớp, môn hoặc giảng viên"
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity style={styles.createButton} onPress={openCreateModal}>
          <Text style={styles.createButtonText}>+ Tạo lớp / môn mới</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : (
    <FlatList
          data={filteredClasses}
      keyExtractor={item => item.id}
          contentContainerStyle={{ gap: 12, paddingBottom: 60 }}
      renderItem={({ item }) => (
        <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
          <Text style={styles.cardTitle}>{item.name || '—'}</Text>
                  <Text style={styles.cardMeta}>Mã: {item.code || '—'}</Text>
                  <Text style={styles.cardMeta}>Giảng viên: {item.teacher || '—'}</Text>
                  <Text style={styles.cardMeta}>Khoa: {item.department || '—'}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    item.status === 'active'
                      ? styles.statusActive
                      : item.status === 'archived'
                        ? styles.statusArchived
                        : styles.statusDraft,
                  ]}
                >
                  <Text style={styles.statusText}>
                    {item.status === 'archived'
                      ? 'Đã lưu trữ'
                      : item.status === 'draft'
                        ? 'Nháp'
                        : 'Đang mở'}
          </Text>
        </View>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => openDetailModal(item)}
                >
                  <Text style={styles.actionButtonText}>Chi tiết</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => openEditModal(item)}
                >
                  <Text style={styles.actionButtonText}>Sửa</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionDanger]}
                  onPress={() => handleDeleteClass(item)}
                >
                  <Text style={styles.actionButtonDangerText}>Xóa</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Không có lớp nào</Text>
              <Text style={styles.emptySubtitle}>Thử tìm kiếm khác hoặc tạo lớp mới.</Text>
            </View>
          }
        />
      )}

      <Modal
        visible={showDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentLarge}>
            {detailLoading && (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
            )}
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{classDetail?.name || selectedClass?.name}</Text>
              <Text style={styles.modalSubtitle}>
                Mã: {classDetail?.code || selectedClass?.code || '—'} • Môn:{' '}
                {classDetail?.subject || selectedClass?.subject || '—'}
              </Text>

              <View style={styles.tabRow}>
                {[
                  { key: 'overview', label: 'Thông tin chung' },
                  { key: 'teachers', label: 'Giảng viên' },
                  { key: 'students', label: 'Sinh viên' },
                  { key: 'documents', label: 'Tài liệu' },
                  { key: 'assignments', label: 'Bài tập' },
                ].map(tab => (
                  <TouchableOpacity
                    key={tab.key}
                    style={[
                      styles.tabButton,
                      detailTab === tab.key && styles.tabButtonActive,
                    ]}
                    onPress={() => setDetailTab(tab.key as typeof detailTab)}
                  >
                    <Text
                      style={[
                        styles.tabButtonText,
                        detailTab === tab.key && styles.tabButtonTextActive,
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {detailTab === 'overview' && (
                <View>
                  {renderMetaRow('Giảng viên chính', classDetail?.teacher)}
                  {renderMetaRow('Lịch học', classDetail?.schedule)}
                  {renderMetaRow('Học kỳ', classDetail?.semester)}
                  {renderMetaRow('Sĩ số', classDetail?.studentCount)}
                  {renderMetaRow('Trạng thái', classDetail?.status)}
                  {renderMetaRow('Bắt đầu', classDetail?.startDate)}
                  {renderMetaRow('Kết thúc', classDetail?.endDate)}
                  {renderMetaRow('Phòng học', classDetail?.room)}
                  {renderMetaRow('Số tín chỉ', classDetail?.credits)}
                  {classDetail?.description ? (
                    <Text style={styles.detailDescription}>{classDetail.description}</Text>
                  ) : (
                    <Text style={styles.emptySection}>Chưa có mô tả chi tiết.</Text>
                  )}
                </View>
              )}

              {detailTab === 'teachers' && (
                <View>
                  {classDetail?.teacher && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Giảng viên chính</Text>
                      <View style={styles.teacherCard}>
                        <Text style={styles.teacherName}>
                          {formatDisplayValue(classDetail.teacher)}
                        </Text>
                        {typeof classDetail.teacher === 'object' && classDetail.teacher && (
                          <>
                            {(classDetail.teacher as any).email && (
                              <Text style={styles.teacherDetail}>
                                Email: {(classDetail.teacher as any).email}
                              </Text>
                            )}
                            {(classDetail.teacher as any).phone && (
                              <Text style={styles.teacherDetail}>
                                SĐT: {(classDetail.teacher as any).phone}
                              </Text>
                            )}
                            {(classDetail.teacher as any).department && (
                              <Text style={styles.teacherDetail}>
                                Khoa: {(classDetail.teacher as any).department}
                              </Text>
                            )}
                            {(classDetail.teacher as any).username && (
                              <Text style={styles.teacherDetail}>
                                Username: {(classDetail.teacher as any).username}
                              </Text>
                            )}
                          </>
                        )}
                      </View>
                    </View>
                  )}
                  {renderListSection('Danh sách giảng viên khác', classDetail?.teachers)}
                </View>
              )}
              {detailTab === 'students' &&
                renderListSection('Danh sách sinh viên', classDetail?.students)}
              {detailTab === 'documents' &&
                renderResourceSection('Tài liệu / giáo trình', classDetail?.documents)}
              {detailTab === 'assignments' &&
                renderResourceSection('Bài tập liên quan', classDetail?.assignments)}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowDetailModal(false)}
            >
              <Text style={styles.modalCloseText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showFormModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFormModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Teacher Picker - Render inside form modal */}
            {showTeacherPicker && (
              <View style={styles.pickerOverlayAbsolute}>
                <TouchableOpacity
                  style={StyleSheet.absoluteFill}
                  activeOpacity={1}
                  onPress={() => setShowTeacherPicker(false)}
                />
                <View style={styles.pickerContainer}>
                  <View style={styles.pickerHeader}>
                    <Text style={styles.pickerTitle}>Chọn giảng viên</Text>
                    <TouchableOpacity onPress={() => setShowTeacherPicker(false)}>
                      <Text style={styles.pickerClose}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  {teachersLoading ? (
                    <View style={styles.pickerLoading}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={styles.pickerLoadingText}>Đang tải...</Text>
                    </View>
                  ) : teachers.length > 0 ? (
                    <ScrollView style={styles.pickerList} nestedScrollEnabled>
                      {teachers.map(teacher => (
                        <TouchableOpacity
                          key={teacher.id}
                          style={[
                            styles.pickerItem,
                            formData.teacherId === teacher.id && styles.pickerItemActive,
                          ]}
                          onPress={() => {
                            setFormData(prev => ({ ...prev, teacherId: teacher.id }));
                            setShowTeacherPicker(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.pickerItemText,
                              formData.teacherId === teacher.id && styles.pickerItemTextActive,
                            ]}
                          >
                            {teacher.fullName}
                            {teacher.department && ` (${teacher.department})`}
                          </Text>
                          {formData.teacherId === teacher.id && (
                            <Text style={styles.pickerCheckmark}>✓</Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  ) : (
                    <View style={styles.pickerEmpty}>
                      <Text style={styles.pickerEmptyText}>Không có giảng viên nào</Text>
                      <TouchableOpacity style={styles.retryButton} onPress={loadTeachers}>
                        <Text style={styles.retryButtonText}>Thử lại</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            )}
            <Text style={styles.modalTitle}>
              {isEditing ? 'Chỉnh sửa lớp học' : 'Tạo lớp học mới'}
            </Text>
            <ScrollView 
              style={{ maxHeight: 400 }} 
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Tên lớp học *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập tên lớp học"
                  value={formData.name}
                  onChangeText={value => setFormData(prev => ({ ...prev, name: value }))}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Mã lớp học *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập mã lớp học"
                  value={formData.code}
                  onChangeText={value => setFormData(prev => ({ ...prev, code: value }))}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Giảng viên *</Text>
                <TouchableOpacity
                  style={[styles.input, styles.inputSelectable]}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (teachers.length === 0 && !teachersLoading) {
                      loadTeachers();
                    }
                    setShowTeacherPicker(true);
                  }}
                >
                  <View style={styles.inputContent}>
                    <Text
                      style={[
                        styles.inputText,
                        !formData.teacherId && styles.inputPlaceholder,
                      ]}
                      numberOfLines={1}
                    >
                      {formData.teacherId
                        ? teachers.find(t => t.id === formData.teacherId)?.fullName || 'Chọn giảng viên'
                        : 'Chọn giảng viên'}
                    </Text>
                    <Text style={styles.inputArrow}>▼</Text>
                  </View>
                </TouchableOpacity>
              </View>
              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Khoa/Bộ môn</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập khoa/bộ môn"
                  value={formData.department}
                  onChangeText={value => setFormData(prev => ({ ...prev, department: value }))}
                />
              </View>
            </ScrollView>
            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setShowFormModal(false)}
              >
                <Text style={styles.modalCloseText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  (!formData.name?.trim() || !formData.code?.trim() || !formData.teacherId?.trim()) &&
                    styles.modalButtonDisabled,
                ]}
                onPress={handleSaveClass}
                disabled={saving || !formData.name?.trim() || !formData.code?.trim() || !formData.teacherId?.trim()}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>
                    {isEditing ? 'Cập nhật' : 'Tạo lớp học'}
                  </Text>
                )}
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
  createButton: {
    borderRadius: 12,
    backgroundColor: colors.secondary,
    paddingVertical: 12,
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
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.secondary,
  },
  cardMeta: {
    color: colors.textSecondary,
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonText: {
    color: colors.secondary,
    fontWeight: '600',
  },
  actionDanger: {
    borderColor: colors.danger,
  },
  actionButtonDangerText: {
    color: colors.danger,
    fontWeight: '600',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  statusText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  statusActive: {
    backgroundColor: colors.success,
  },
  statusArchived: {
    backgroundColor: colors.border,
  },
  statusDraft: {
    backgroundColor: colors.warning,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 40,
    gap: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.secondary,
  },
  emptySubtitle: {
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 20,
  },
  modalContentLarge: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 20,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.secondary,
    marginBottom: 6,
  },
  modalSubtitle: {
    color: colors.textSecondary,
    marginBottom: 16,
  },
  modalClose: {
    marginTop: 16,
    alignItems: 'center',
  },
  modalCloseText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  modalButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    flex: 1,
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
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
  detailMeta: {
    color: colors.textSecondary,
    marginBottom: 6,
  },
  detailMetaLabel: {
    color: colors.secondary,
    fontWeight: '600',
  },
  detailDescription: {
    marginTop: 8,
    color: colors.secondary,
    lineHeight: 20,
  },
  section: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 12,
  },
  tabButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  tabButtonText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: colors.primary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.secondary,
    marginBottom: 8,
  },
  listItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listItemTitle: {
    color: colors.secondary,
    fontWeight: '500',
  },
  listItemSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  emptySection: {
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  teacherCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  teacherName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.secondary,
    marginBottom: 8,
  },
  teacherDetail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  inputSelectable: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputText: {
    flex: 1,
    color: colors.secondary,
    fontSize: 14,
  },
  inputPlaceholder: {
    color: colors.textSecondary,
  },
  inputArrow: {
    color: colors.textSecondary,
    fontSize: 10,
    marginLeft: 8,
  },
  pickerOverlayAbsolute: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 1000,
    elevation: 10,
  },
  pickerContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    overflow: 'hidden',
    zIndex: 10000,
    elevation: 10,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.secondary,
  },
  pickerClose: {
    fontSize: 24,
    color: colors.textSecondary,
    fontWeight: '300',
  },
  pickerList: {
    maxHeight: 400,
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerItemActive: {
    backgroundColor: colors.primaryLight,
  },
  pickerItemText: {
    flex: 1,
    color: colors.secondary,
    fontSize: 14,
  },
  pickerItemTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  pickerCheckmark: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 18,
    marginLeft: 12,
  },
  pickerLoading: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  pickerLoadingText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  pickerEmpty: {
    padding: 40,
    alignItems: 'center',
    gap: 16,
  },
  pickerEmptyText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
});

export default AdminClassesScreen;


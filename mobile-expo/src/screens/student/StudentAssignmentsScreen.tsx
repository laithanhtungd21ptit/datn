import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { api } from '../../api/client';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../../theme/colors';

type AssignmentItem = {
  id: string;
  title: string;
  class?: string;
  classId?: string;
  teacher?: string;
  deadline?: string;
  isExam?: boolean;
  status?: string;
  grade?: number;
  isOverdue?: boolean;
};

type PickedFile = {
  name: string;
  uri: string;
  mimeType?: string | null;
};

const StudentAssignmentsScreen: React.FC = () => {
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [filterClass, setFilterClass] = useState<'all' | string>('all');
  const [statusTab, setStatusTab] = useState<'all' | 'not_submitted' | 'submitted' | 'graded'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAssignment, setSelectedAssignment] =
    useState<AssignmentItem | null>(null);
  const [submitModalVisible, setSubmitModalVisible] = useState(false);
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadAssignments = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const [classesRes, assignmentsRes] = await Promise.all([
        api.studentClasses(),
        api.studentAssignments(),
      ]);
      setClasses(
        (classesRes || [])
          .filter((item: any) => !!item.id)
          .map((item: any) => ({ id: item.id, name: item.name })),
      );
      setAssignments(
        (assignmentsRes || []).map((item: any) => ({
          id: item.id,
          title: item.title,
          class: item.class,
          classId: item.classId,
          teacher: item.teacher,
          deadline: item.dueDate,
          isExam: !!item.isExam,
          status: item.status || item.mySubmission?.status || 'not_submitted',
          grade: item.grade,
          isOverdue: !!item.isOverdue,
        })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tải bài tập');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAssignments();
    }, [loadAssignments]),
  );

  const filteredAssignments = useMemo(() => {
    let list = assignments;
    if (filterClass !== 'all') {
      list = list.filter(item => item.classId === filterClass);
    }
    if (statusTab === 'not_submitted') {
      return list.filter(item => (item.status || 'not_submitted') === 'not_submitted' && !item.isOverdue);
    }
    if (statusTab === 'submitted') {
      return list.filter(item => (item.status || item.status === 'submitted' || item.status === 'pending') && !item.isOverdue && item.status !== 'graded');
    }
    if (statusTab === 'graded') {
      return list.filter(item => item.status === 'graded' || item.grade != null);
    }
    return list;
  }, [assignments, filterClass, statusTab]);

  const statusConfig: Record<
    string,
    { label: string; color: string; background: string }
  > = {
    graded: { label: 'Đã chấm', color: colors.success, background: '#dcfce7' },
    submitted: { label: 'Đã nộp', color: colors.primary, background: colors.primaryLight },
    pending: { label: 'Đang chờ', color: colors.warning, background: '#ffedd5' },
    overdue: { label: 'Quá hạn', color: colors.danger, background: '#fee2e2' },
    not_submitted: {
      label: 'Chưa nộp',
      color: colors.textSecondary,
      background: colors.border,
    },
  };

  const openSubmitModal = (assignment: AssignmentItem) => {
    if (assignment.isExam) {
      // For exams we navigate to exam screen later
      return;
    }
    setSelectedAssignment(assignment);
    setFiles([]);
    setNotes('');
    setSubmitModalVisible(true);
  };

  const pickFiles = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: true,
    });
    if (result.canceled) return;
    setFiles(prev => [
      ...prev,
      ...result.assets.map(asset => ({
        uri: asset.uri,
        name: asset.name ?? `file-${Date.now()}`,
        mimeType: asset.mimeType,
      })),
    ]);
  };

  const handleSubmit = async () => {
    if (!selectedAssignment) return;
    if (files.length === 0) {
      setError('Vui lòng chọn ít nhất một tệp để nộp.');
      return;
    }
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('assignmentId', selectedAssignment.id);
      formData.append('notes', notes);
      files.forEach(file => {
        formData.append('files', {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || 'application/octet-stream',
        } as any);
      });
      await api.studentSubmit(formData);
      setSubmitModalVisible(false);
      await loadAssignments();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể nộp bài');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderAssignment = ({ item }: { item: AssignmentItem }) => {
    const status = item.isOverdue ? 'overdue' : item.status || 'not_submitted';
    const statusStyle = statusConfig[status] || statusConfig.not_submitted;
    return (
      <View style={styles.assignmentCard}>
        <View style={styles.assignmentHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.assignmentTitle}>{item.title}</Text>
            <Text style={styles.assignmentClass}>
              {item.class} • {item.teacher || 'Giảng viên'}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusStyle.background },
            ]}
          >
            <Text style={[styles.statusText, { color: statusStyle.color }]}>
              {statusStyle.label}
            </Text>
          </View>
        </View>
        <Text style={styles.assignmentDeadline}>
          Hạn:{' '}
          {item.deadline
            ? new Date(item.deadline).toLocaleString('vi-VN')
            : 'Chưa rõ'}
        </Text>
        <View style={styles.assignmentActions}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              item.isExam ? styles.secondaryButton : styles.primaryButton,
            ]}
            onPress={() => {
              if (item.isExam) {
                // Navigate to exam screen
                // TODO: implement exam navigation
              } else {
                openSubmitModal(item);
              }
            }}
          >
            <Text style={styles.actionText}>
              {item.isExam ? 'Vào phòng thi' : 'Nộp bài'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bài tập của tôi</Text>
      <Text style={styles.subtitle}>
        Theo dõi tiến độ và nộp bài trực tiếp trên điện thoại.
      </Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Lọc theo lớp:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              filterClass === 'all' && styles.filterChipActive,
            ]}
            onPress={() => setFilterClass('all')}
          >
            <Text
              style={[
                styles.filterChipText,
                filterClass === 'all' && styles.filterChipTextActive,
              ]}
            >
              Tất cả
            </Text>
          </TouchableOpacity>
          {classes.map(cls => (
            <TouchableOpacity
              key={cls.id}
              style={[
                styles.filterChip,
                filterClass === cls.id && styles.filterChipActive,
              ]}
              onPress={() => setFilterClass(cls.id)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterClass === cls.id && styles.filterChipTextActive,
                ]}
              >
                {cls.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.tabsRow}>
        {[
          { key: 'all', label: 'Tất cả' },
          { key: 'not_submitted', label: 'Chưa nộp' },
          { key: 'submitted', label: 'Đã nộp' },
          { key: 'graded', label: 'Đã chấm' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.statusTab, statusTab === tab.key && styles.statusTabActive]}
            onPress={() => setStatusTab(tab.key as typeof statusTab)}
          >
            <Text
              style={[
                styles.statusTabText,
                statusTab === tab.key && styles.statusTabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredAssignments}
        keyExtractor={item => item.id}
        renderItem={renderAssignment}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={loadAssignments} />
        }
        ListEmptyComponent={
          !isRefreshing ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Không có bài tập</Text>
              <Text style={styles.emptySubtitle}>
                Hãy kiểm tra lại sau hoặc đổi bộ lọc.
              </Text>
            </View>
          ) : null
        }
      />

      <Modal
        animationType="slide"
        transparent
        visible={submitModalVisible}
        onRequestClose={() => setSubmitModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Nộp bài: {selectedAssignment?.title}
            </Text>
            <Text style={styles.modalSubtitle}>
              Chọn tệp và nhập ghi chú cho giảng viên.
            </Text>
            <TouchableOpacity style={styles.fileButton} onPress={pickFiles}>
              <Text style={styles.fileButtonText}>+ Chọn tệp</Text>
            </TouchableOpacity>
            {files.map(file => (
              <View key={file.uri} style={styles.fileItem}>
                <Text style={styles.fileName}>{file.name}</Text>
              </View>
            ))}
            <TextInput
              style={styles.notesInput}
              placeholder="Ghi chú cho giảng viên (tuỳ chọn)"
              multiline
              value={notes}
              onChangeText={setNotes}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancel]}
                onPress={() => setSubmitModalVisible(false)}
              >
                <Text>Đóng</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalPrimary]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalPrimaryText}>Nộp bài</Text>
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
    backgroundColor: colors.background,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.secondary,
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: 4,
  },
  errorText: {
    color: colors.danger,
    marginTop: 8,
  },
  filterRow: {
    marginTop: 16,
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
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
  tabsRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  statusTab: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: 'center',
  },
  statusTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusTabText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  statusTabTextActive: {
    color: '#fff',
  },
  assignmentCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  assignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assignmentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.secondary,
  },
  assignmentClass: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  assignmentDeadline: {
    marginTop: 10,
    color: colors.textSecondary,
  },
  assignmentActions: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: colors.secondary,
  },
  actionText: {
    color: '#fff',
    fontWeight: '600',
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
    padding: 16,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.secondary,
  },
  modalSubtitle: {
    color: colors.textSecondary,
    marginVertical: 8,
  },
  fileButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginVertical: 10,
  },
  fileButtonText: {
    color: colors.primary,
    fontWeight: '600',
  },
  fileItem: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    marginBottom: 6,
  },
  fileName: {
    color: colors.secondary,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: '#fff7f8',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 10,
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  modalCancel: {
    backgroundColor: colors.border,
  },
  modalPrimary: {
    backgroundColor: colors.primary,
  },
  modalPrimaryText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default StudentAssignmentsScreen;


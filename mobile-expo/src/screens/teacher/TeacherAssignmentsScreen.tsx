import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { api } from '../../api/client';
import { colors } from '../../theme/colors';

type Assignment = {
  id: string;
  title: string;
  description?: string;
  class?: string;
  classId?: string;
  dueDate?: string;
  startAt?: string;
  submittedStudents?: number;
  gradedStudents?: number;
  totalStudents?: number;
  isExam?: boolean;
  durationMinutes?: number;
};

type Submission = {
  id: string;
  studentName: string;
  studentId?: string;
  submittedAt?: string;
  grade?: number;
  comment?: string;
  status: 'submitted' | 'graded';
};

const TeacherAssignmentsScreen: React.FC = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [classFilter, setClassFilter] = useState('all');
  const [showClassFilterModal, setShowClassFilterModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showGradingModal, setShowGradingModal] = useState(false);
  const [showAssignmentClassPicker, setShowAssignmentClassPicker] = useState(false);
  const [showAssignmentPickerModal, setShowAssignmentPickerModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [assignmentForm, setAssignmentForm] = useState({
    title: '',
    description: '',
    classId: '',
    dueDate: '',
    isExam: false,
    durationMinutes: 0,
    startAt: '',
  });
  const [gradingForm, setGradingForm] = useState({
    grade: '',
    comment: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [assignmentsData, classesData] = await Promise.all([
        api.teacherAssignmentsList?.({}),
        api.teacherClasses?.(),
      ]);
      if (Array.isArray(assignmentsData)) {
        setAssignments(
          assignmentsData.map((item: any) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            class: item.className,
            classId: item.classId,
            dueDate: item.dueDate,
            startAt: item.startAt,
            submittedStudents: item.submittedStudents,
            gradedStudents: item.gradedStudents,
            totalStudents: item.totalStudents,
            isExam: item.isExam,
            durationMinutes: item.durationMinutes,
          })),
        );
      }
      if (Array.isArray(classesData)) {
        setClasses(
          classesData.map((item: any) => ({
            id: item.id,
            name: item.name || item.code,
          })),
        );
      }
    } catch (error) {
      console.warn('Không thể tải dữ liệu:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadSubmissions = async (assignmentId: string) => {
    try {
      const data = await api.teacherSubmissions?.(assignmentId);
      if (Array.isArray(data)) {
        setSubmissions(
          data.map((item: any) => ({
            id: item.id,
            studentName: item.studentName || '',
            studentId: item.studentId,
            submittedAt: item.submittedAt,
            grade: item.score,
            comment: item.notes,
            status: item.score != null ? 'graded' : 'submitted',
          })),
        );
      }
    } catch (error) {
      console.warn('Không thể tải bài nộp:', error);
    }
  };

  const filteredAssignments = useMemo(() => {
    if (classFilter === 'all') return assignments;
    return assignments.filter(a => a.classId === classFilter);
  }, [assignments, classFilter]);

  const handleOpenCreateModal = () => {
    setEditingAssignment(null);
    setAssignmentForm({
      title: '',
      description: '',
      classId: '',
      dueDate: '',
      isExam: false,
      durationMinutes: 0,
      startAt: '',
    });
    setShowAssignmentModal(true);
  };

  const handleOpenEditModal = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setAssignmentForm({
      title: assignment.title || '',
      description: assignment.description || '',
      classId: assignment.classId || '',
      dueDate: assignment.dueDate ? assignment.dueDate.substring(0, 10) : '',
      isExam: !!assignment.isExam,
      durationMinutes: assignment.durationMinutes || 0,
      startAt: assignment.startAt || '',
    });
    setShowAssignmentModal(true);
  };

  const handleSubmitAssignment = async () => {
    if (!assignmentForm.title || !assignmentForm.classId || !assignmentForm.dueDate) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ tiêu đề, lớp và hạn nộp');
      return;
    }
    try {
      const payload = {
        title: assignmentForm.title,
        description: assignmentForm.description,
        classId: assignmentForm.classId,
        dueDate: assignmentForm.dueDate,
        isExam: assignmentForm.isExam,
        durationMinutes: assignmentForm.isExam ? assignmentForm.durationMinutes || 0 : 0,
      };

      if (editingAssignment) {
        await api.teacherUpdateAssignment?.(editingAssignment.id, payload);
        Alert.alert('Thành công', 'Đã cập nhật bài tập');
      } else {
        await api.teacherCreateAssignment?.(payload);
        Alert.alert('Thành công', 'Đã tạo bài tập mới');
      }
      setAssignmentForm({
        title: '',
        description: '',
        classId: '',
        dueDate: '',
        isExam: false,
        durationMinutes: 0,
        startAt: '',
      });
      setShowAssignmentModal(false);
      await loadData();
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể lưu bài tập');
    }
  };

  const handleGradeSubmission = async () => {
    if (!selectedSubmission || !gradingForm.grade) {
      Alert.alert('Lỗi', 'Vui lòng nhập điểm');
      return;
    }
    try {
      await api.teacherGradeSubmission?.(selectedSubmission.id, {
        score: parseFloat(gradingForm.grade),
        notes: gradingForm.comment,
      });
      setGradingForm({ grade: '', comment: '' });
      setShowGradingModal(false);
      if (selectedAssignment) {
        await loadSubmissions(selectedAssignment.id);
      }
      Alert.alert('Thành công', 'Đã chấm điểm');
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể chấm điểm');
    }
  };

  const handleDeleteAssignment = (assignment: Assignment) => {
    Alert.alert('Xác nhận', 'Bạn có chắc muốn xóa bài tập này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.teacherDeleteAssignment?.(assignment.id);
            await loadData();
          } catch (error) {
            Alert.alert('Lỗi', 'Không thể xóa bài tập');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Quản lý bài tập</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleOpenCreateModal}
        >
          <Text style={styles.createButtonText}>+ Tạo bài tập</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tabIndex === 0 && styles.tabActive]}
          onPress={() => setTabIndex(0)}
        >
          <Text style={[styles.tabText, tabIndex === 0 && styles.tabTextActive]}>
            Danh sách bài tập
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tabIndex === 1 && styles.tabActive]}
          onPress={() => setTabIndex(1)}
        >
          <Text style={[styles.tabText, tabIndex === 1 && styles.tabTextActive]}>
            Chấm điểm
          </Text>
        </TouchableOpacity>
      </View>

      {tabIndex === 0 && (
        <>
          <View style={styles.filterContainer}>
            <Text style={styles.filterLabel}>Lọc theo lớp:</Text>
            <TouchableOpacity
              style={styles.filterDropdown}
              onPress={() => setShowClassFilterModal(true)}
            >
              <Text style={styles.filterDropdownText}>
                {classFilter === 'all'
                  ? 'Tất cả lớp'
                  : classes.find(c => c.id === classFilter)?.name || 'Chọn lớp'}
              </Text>
              <Text style={styles.filterDropdownIcon}>▼</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={filteredAssignments}
              keyExtractor={item => item.id}
              contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
              refreshControl={
                <RefreshControl refreshing={loading} onRefresh={loadData} />
              }
              renderItem={({ item }) => (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    {item.isExam && (
                      <View style={styles.examBadge}>
                        <Text style={styles.examBadgeText}>Bài thi</Text>
                      </View>
                    )}
                  </View>
                  {item.class && (
                    <Text style={styles.cardMeta}>Lớp: {item.class}</Text>
                  )}
                  {item.dueDate && (
                    <Text style={styles.cardMeta}>
                      Hạn nộp: {new Date(item.dueDate).toLocaleDateString('vi-VN')}
                    </Text>
                  )}
                  <View style={styles.cardStats}>
                    <Text style={styles.cardStat}>
                      Đã nộp: {item.submittedStudents || 0}/{item.totalStudents || 0}
                    </Text>
                    <Text style={styles.cardStat}>
                      Đã chấm: {item.gradedStudents || 0}
                    </Text>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => {
                        setSelectedAssignment(item);
                        loadSubmissions(item.id);
                        setTabIndex(1);
                      }}
                    >
                      <Text style={styles.actionButtonText}>Xem bài nộp</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.actionButtonSecondary]}
                      onPress={() => handleOpenEditModal(item)}
                    >
                      <Text style={styles.actionButtonText}>Sửa</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.actionButtonDanger]}
                      onPress={() => handleDeleteAssignment(item)}
                    >
                      <Text style={styles.actionButtonDangerText}>Xóa</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>Chưa có bài tập nào</Text>
                </View>
              }
            />
          )}
        </>
      )}

      {tabIndex === 1 && (
        <>
          <View style={styles.filterContainer}>
            <Text style={styles.filterLabel}>Chọn bài tập:</Text>
            <TouchableOpacity
              style={styles.filterDropdown}
              onPress={() => setShowAssignmentPickerModal(true)}
            >
              <Text style={styles.filterDropdownText}>
                {selectedAssignment
                  ? selectedAssignment.title
                  : 'Chọn bài tập'}
              </Text>
              <Text style={styles.filterDropdownIcon}>▼</Text>
            </TouchableOpacity>
            {selectedAssignment && (
              <TouchableOpacity
                style={styles.clearFilterButton}
                onPress={() => {
                  setSelectedAssignment(null);
                  setSubmissions([]);
                }}
              >
                <Text style={styles.clearFilterButtonText}>Xóa</Text>
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={submissions}
            keyExtractor={item => item.id}
            contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{item.studentName}</Text>
                {item.studentId && (
                  <Text style={styles.cardMeta}>MSSV: {item.studentId}</Text>
                )}
                {item.submittedAt && (
                  <Text style={styles.cardMeta}>
                    Nộp: {new Date(item.submittedAt).toLocaleString('vi-VN')}
                  </Text>
                )}
                {item.status === 'graded' && (
                  <View style={styles.gradeSection}>
                    <Text style={styles.gradeText}>Điểm: {item.grade}</Text>
                    {item.comment && (
                      <Text style={styles.commentText}>Nhận xét: {item.comment}</Text>
                    )}
                  </View>
                )}
                <TouchableOpacity
                  style={styles.gradeButton}
                  onPress={() => {
                    setSelectedSubmission(item);
                    setGradingForm({
                      grade: item.grade != null ? String(item.grade) : '',
                      comment: item.comment || '',
                    });
                    setShowGradingModal(true);
                  }}
                >
                  <Text style={styles.gradeButtonText}>
                    {item.status === 'graded' ? 'Sửa điểm' : 'Chấm điểm'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  {selectedAssignment
                    ? 'Chưa có bài nộp nào'
                    : 'Chọn bài tập để xem bài nộp'}
                </Text>
              </View>
            }
          />
        </>
      )}

      <Modal
        visible={showAssignmentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAssignmentModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {editingAssignment ? 'Cập nhật bài tập' : 'Tạo bài tập mới'}
              </Text>
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: 500 }}
              >
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Tiêu đề bài tập *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ví dụ: Bài tập chương 1"
                    value={assignmentForm.title}
                    onChangeText={value => setAssignmentForm(prev => ({ ...prev, title: value }))}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Mô tả (tùy chọn)</Text>
                  <TextInput
                    style={[styles.input, { height: 80 }]}
                    placeholder="Nhập mô tả chi tiết về bài tập..."
                    multiline
                    value={assignmentForm.description}
                    onChangeText={value =>
                      setAssignmentForm(prev => ({ ...prev, description: value }))
                    }
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Lớp giao bài *</Text>
                  <TouchableOpacity
                    style={styles.filterDropdown}
                    onPress={() => setShowAssignmentClassPicker(true)}
                  >
                    <Text style={styles.filterDropdownText}>
                      {assignmentForm.classId
                        ? classes.find(c => c.id === assignmentForm.classId)?.name ||
                          'Chọn lớp'
                        : 'Chọn lớp'}
                    </Text>
                    <Text style={styles.filterDropdownIcon}>▼</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Hạn nộp * (YYYY-MM-DD HH:mm:ss)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ví dụ: 2025-06-01 23:59:59"
                    value={assignmentForm.dueDate}
                    onChangeText={value =>
                      setAssignmentForm(prev => ({ ...prev, dueDate: value }))
                    }
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Thời gian bắt đầu (YYYY-MM-DD HH:mm:ss)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ví dụ: 2025-05-30 08:00:00"
                    value={assignmentForm.startAt}
                    onChangeText={value =>
                      setAssignmentForm(prev => ({ ...prev, startAt: value }))
                    }
                  />
                </View>
                <View style={styles.inputGroup}>
                  <View style={styles.checkboxRow}>
                    <TouchableOpacity
                      style={styles.checkbox}
                      onPress={() =>
                        setAssignmentForm(prev => ({ ...prev, isExam: !prev.isExam }))
                      }
                    >
                      <View
                        style={[
                          styles.checkboxBox,
                          assignmentForm.isExam && styles.checkboxBoxChecked,
                        ]}
                      >
                        {assignmentForm.isExam && (
                          <Text style={styles.checkboxCheck}>✓</Text>
                        )}
                      </View>
                      <Text style={styles.checkboxLabel}>Đây là bài thi</Text>
                    </TouchableOpacity>
                  </View>
                  {assignmentForm.isExam && (
                    <View style={{ marginTop: 8 }}>
                      <Text style={styles.inputLabel}>Thời gian làm bài (phút)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Ví dụ: 90"
                        keyboardType="numeric"
                        value={
                          assignmentForm.durationMinutes
                            ? String(assignmentForm.durationMinutes)
                            : ''
                        }
                        onChangeText={value =>
                          setAssignmentForm(prev => ({
                            ...prev,
                            durationMinutes: parseInt(value, 10) || 0,
                          }))
                        }
                      />
                    </View>
                  )}
                </View>
              </ScrollView>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={handleSubmitAssignment}
                >
                  <Text style={styles.modalButtonText}>
                    {editingAssignment ? 'Lưu thay đổi' : 'Tạo'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => setShowAssignmentModal(false)}
                >
                  <Text style={styles.modalCancelText}>Hủy</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={showGradingModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGradingModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Chấm điểm bài nộp</Text>
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: 500 }}
              >
                {selectedAssignment && (
                  <Text style={styles.cardMeta}>Bài tập: {selectedAssignment.title}</Text>
                )}
                {selectedSubmission && (
                  <Text style={styles.cardMeta}>
                    Sinh viên: {selectedSubmission.studentName}
                    {selectedSubmission.studentId ? ` • MSSV: ${selectedSubmission.studentId}` : ''}
                  </Text>
                )}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Điểm số *</Text>
                  <Text style={[styles.cardMeta, { marginBottom: 6 }]}>
                    Nhập điểm (ví dụ: 8.5). Nên trong khoảng 0 - 10.
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Điểm số"
                    keyboardType="numeric"
                    value={gradingForm.grade}
                    onChangeText={value => setGradingForm(prev => ({ ...prev, grade: value }))}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nhận xét (tùy chọn)</Text>
                  <TextInput
                    style={[styles.input, { height: 100 }]}
                    placeholder="Nhập nhận xét..."
                    multiline
                    value={gradingForm.comment}
                    onChangeText={value => setGradingForm(prev => ({ ...prev, comment: value }))}
                  />
                </View>
              </ScrollView>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={handleGradeSubmission}
                >
                  <Text style={styles.modalButtonText}>Lưu điểm</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => setShowGradingModal(false)}
                >
                  <Text style={styles.modalCancelText}>Hủy</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Assignment picker for grading */}
      <Modal
        visible={showAssignmentPickerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAssignmentPickerModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAssignmentPickerModal(false)}
        >
          <View style={styles.dropdownModalContent}>
            <Text style={styles.dropdownModalTitle}>Chọn bài tập</Text>
            <ScrollView>
              <TouchableOpacity
                style={[
                  styles.dropdownItem,
                  !selectedAssignment && styles.dropdownItemActive,
                ]}
                onPress={() => {
                  setSelectedAssignment(null);
                  setSubmissions([]);
                  setShowAssignmentPickerModal(false);
                }}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    !selectedAssignment && styles.dropdownItemTextActive,
                  ]}
                >
                  Tất cả bài tập
                </Text>
                {!selectedAssignment && (
                  <Text style={styles.dropdownItemCheck}>✓</Text>
                )}
              </TouchableOpacity>
              {assignments.map(assignment => (
                <TouchableOpacity
                  key={assignment.id}
                  style={[
                    styles.dropdownItem,
                    selectedAssignment?.id === assignment.id && styles.dropdownItemActive,
                  ]}
                  onPress={() => {
                    setSelectedAssignment(assignment);
                    loadSubmissions(assignment.id);
                    setShowAssignmentPickerModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      selectedAssignment?.id === assignment.id && styles.dropdownItemTextActive,
                    ]}
                  >
                    {assignment.title}
                    {assignment.isExam && ' (Bài thi)'}
                  </Text>
                  {selectedAssignment?.id === assignment.id && (
                    <Text style={styles.dropdownItemCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Class picker for assignment form */}
      <Modal
        visible={showAssignmentClassPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAssignmentClassPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAssignmentClassPicker(false)}
        >
          <View style={styles.dropdownModalContent}>
            <Text style={styles.dropdownModalTitle}>Chọn lớp giao bài</Text>
            <ScrollView>
              {classes.map(cls => (
                <TouchableOpacity
                  key={cls.id}
                  style={[
                    styles.dropdownItem,
                    assignmentForm.classId === cls.id && styles.dropdownItemActive,
                  ]}
                  onPress={() => {
                    setAssignmentForm(prev => ({ ...prev, classId: cls.id }));
                    setShowAssignmentClassPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      assignmentForm.classId === cls.id && styles.dropdownItemTextActive,
                    ]}
                  >
                    {cls.name}
                  </Text>
                  {assignmentForm.classId === cls.id && (
                    <Text style={styles.dropdownItemCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Class Filter Dropdown Modal */}
      <Modal
        visible={showClassFilterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowClassFilterModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowClassFilterModal(false)}
        >
          <View style={styles.dropdownModalContent}>
            <Text style={styles.dropdownModalTitle}>Chọn lớp học</Text>
            <ScrollView>
              <TouchableOpacity
                style={[
                  styles.dropdownItem,
                  classFilter === 'all' && styles.dropdownItemActive,
                ]}
                onPress={() => {
                  setClassFilter('all');
                  setShowClassFilterModal(false);
                }}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    classFilter === 'all' && styles.dropdownItemTextActive,
                  ]}
                >
                  Tất cả lớp
                </Text>
                {classFilter === 'all' && (
                  <Text style={styles.dropdownItemCheck}>✓</Text>
                )}
              </TouchableOpacity>
              {classes.map(cls => (
                <TouchableOpacity
                  key={cls.id}
                  style={[
                    styles.dropdownItem,
                    classFilter === cls.id && styles.dropdownItemActive,
                  ]}
                  onPress={() => {
                    setClassFilter(cls.id);
                    setShowClassFilterModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      classFilter === cls.id && styles.dropdownItemTextActive,
                    ]}
                  >
                    {cls.name}
                  </Text>
                  {classFilter === cls.id && (
                    <Text style={styles.dropdownItemCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.secondary,
  },
  createButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary,
  },
  filterDropdown: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterDropdownText: {
    fontSize: 14,
    color: colors.secondary,
    flex: 1,
  },
  filterDropdownIcon: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  dropdownModalContent: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    maxHeight: 400,
    minWidth: 250,
  },
  dropdownModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.secondary,
    marginBottom: 12,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  dropdownItemActive: {
    backgroundColor: colors.primaryLight,
  },
  dropdownItemText: {
    fontSize: 14,
    color: colors.secondary,
    flex: 1,
  },
  dropdownItemTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  dropdownItemCheck: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '700',
  },
  filterChips: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: colors.secondary,
  },
  chipTextActive: {
    color: '#fff',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.secondary,
  },
  examBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  examBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  cardMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  cardStats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  cardStat: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  actionButtonSecondary: {
    backgroundColor: colors.secondary,
  },
  actionButtonDanger: {
    backgroundColor: colors.danger,
  },
  actionButtonDangerText: {
    color: '#fff',
  },
  selectedAssignmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectedAssignmentTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.secondary,
  },
  clearButton: {
    color: colors.primary,
    fontWeight: '600',
  },
  clearFilterButton: {
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
  },
  clearFilterButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  gradeSection: {
    marginTop: 8,
    padding: 12,
    backgroundColor: colors.primaryLight,
    borderRadius: 10,
  },
  gradeText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  commentText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  gradeButton: {
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  gradeButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.secondary,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.background,
    marginBottom: 12,
    fontSize: 15,
  },
  classChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  classChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  classChipText: {
    fontSize: 13,
    color: colors.secondary,
  },
  classChipTextActive: {
    color: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  modalCancel: {
    flex: 1,
    backgroundColor: colors.border,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    color: colors.secondary,
    fontWeight: '600',
  },
  checkboxRow: {
    marginTop: 4,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxCheck: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: 14,
    color: colors.secondary,
  },
});

export default TeacherAssignmentsScreen;


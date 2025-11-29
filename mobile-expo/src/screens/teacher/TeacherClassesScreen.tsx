import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { api } from '../../api/client';
import { colors } from '../../theme/colors';
import { BACKEND_URL } from '../../config/constants';

type ClassItem = {
  id: string;
  name: string;
  code?: string;
  description?: string;
  students?: number;
  assignments?: number;
};

type ClassDetail = {
  id: string;
  name: string;
  code?: string;
  description?: string;
  teacher?: string;
  students?: Array<{
    id: string;
    name: string;
    studentId?: string;
    email?: string;
  }>;
  assignments?: Array<{
    id: string;
    title: string;
    description?: string;
    dueDate?: string;
    deadline?: string;
    isExam?: boolean;
    durationMinutes?: number;
    submissions?: number;
  }>;
  documents?: Array<{
    id: string;
    title: string;
    fileName?: string;
    fileSize?: number;
    fileUrl?: string;
    uploadedAt?: string;
  }>;
  announcements?: Array<{
    id: string;
    title: string;
    content?: string;
    type?: string;
    createdAt?: string;
  }>;
  comments?: Array<{
    id: string;
    author?: string;
    content: string;
    createdAt?: string;
  }>;
};

type DetailTab = 'overview' | 'students' | 'assignments' | 'documents' | 'announcements' | 'comments';

type AssignmentItem = {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  deadline?: string;
  isExam?: boolean;
  durationMinutes?: number;
  submissions?: number;
};

const TeacherClassesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassDetail | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showEditAssignmentModal, setShowEditAssignmentModal] = useState(false);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [showGradingModal, setShowGradingModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [editingAssignment, setEditingAssignment] = useState<AssignmentItem | null>(null);
  const [selectedAssignmentForSubmissions, setSelectedAssignmentForSubmissions] = useState<AssignmentItem | null>(null);
  const [submissions, setSubmissions] = useState<Array<{
    id: string;
    studentId: string;
    studentName: string;
    submittedAt?: string;
    files?: string[];
    score?: number;
    notes?: string;
  }>>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<typeof submissions[0] | null>(null);
  const [gradingData, setGradingData] = useState({ grade: '', comment: '' });
  const [createForm, setCreateForm] = useState({
    name: '',
    code: '',
    description: '',
  });
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    content: '',
    type: 'general',
  });
  const [assignmentForm, setAssignmentForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    isExam: false,
    durationMinutes: 0,
  });
  const [documentForm, setDocumentForm] = useState({
    title: '',
    description: '',
  });
  const [selectedDocumentFile, setSelectedDocumentFile] = useState<{
    uri: string;
    name: string;
    mimeType: string | null;
  } | null>(null);
  const [studentToRemove, setStudentToRemove] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');

  const loadClasses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.teacherClasses?.();
      if (Array.isArray(data)) {
        setClasses(
          data.map((item: any) => ({
            id: item.id || item._id,
            name: item.name || '',
            code: item.code,
            description: item.description || item.department,
            students: item.students || 0,
            assignments: item.assignments || 0,
          })),
        );
      }
    } catch (error) {
      console.warn('Không thể tải danh sách lớp:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const loadClassDetail = async (classId: string) => {
    setDetailLoading(true);
    setDetailTab('overview');
    try {
      const data: any = await api.teacherClassDetail?.(classId);
      if (data) {
        setSelectedClass({
          id: data.id || classId,
          name: data.name || '',
          code: data.code,
          description: data.description,
          teacher: data.teacher,
          students: Array.isArray(data.students)
            ? data.students.map((s: any) => ({
                id: s.id || s.studentId || s._id,
                name: s.name || s.fullName || '',
                studentId: s.studentId || s.id,
                email: s.email || '',
              }))
            : [],
          assignments: Array.isArray(data.assignments)
            ? data.assignments.map((a: any) => ({
                id: a.id || a._id,
                title: a.title || '',
                description: a.description,
                dueDate: a.dueDate || a.deadline,
                deadline: a.deadline || a.dueDate,
                isExam: a.isExam || false,
                durationMinutes: a.durationMinutes || 0,
                submissions: a.submissions || 0,
              }))
            : [],
          documents: Array.isArray(data.documents)
            ? data.documents.map((d: any) => ({
                id: d.id || d._id,
                title: d.title || d.fileName || '',
                fileName: d.fileName,
                fileSize: d.fileSize,
                fileUrl: d.fileUrl || d.url,
                uploadedAt: d.uploadedAt || d.createdAt,
              }))
            : [],
          announcements: Array.isArray(data.announcements)
            ? data.announcements.map((a: any) => ({
                id: a.id || a._id,
                title: a.title || '',
                content: a.content || a.message,
                type: a.type || 'general',
                createdAt: a.createdAt,
              }))
            : [],
          comments: Array.isArray(data.comments)
            ? data.comments.map((c: any, index: number) => ({
                id: c.id || c._id || String(index),
                author: c.author || c.user || c.username || 'Không rõ',
                content: c.content || c.text || '',
                createdAt: c.createdAt,
              }))
            : [],
        });
        setShowDetailModal(true);
      }
    } catch (error) {
      console.warn('Không thể tải chi tiết lớp:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin lớp học');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateClass = async () => {
    if (!createForm.name || !createForm.code) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ tên và mã lớp');
      return;
    }
    try {
      await api.teacherCreateClass?.(createForm);
      setCreateForm({ name: '', code: '', description: '' });
      setShowCreateModal(false);
      await loadClasses();
      Alert.alert('Thành công', 'Đã tạo lớp học mới');
    } catch (error) {
      console.warn('Không thể tạo lớp:', error);
      Alert.alert('Lỗi', 'Không thể tạo lớp học mới');
    }
  };

  const handleSendNotification = async () => {
    if (!selectedClass || !notificationForm.title || !notificationForm.content) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
      return;
    }
    try {
      await api.teacherCreateAnnouncement?.(selectedClass.id, notificationForm);
      setNotificationForm({ title: '', content: '', type: 'general' });
      setShowNotificationModal(false);
      Alert.alert('Thành công', 'Đã gửi thông báo');
      await loadClassDetail(selectedClass.id);
    } catch (error) {
      console.warn('Không thể gửi thông báo:', error);
      Alert.alert('Lỗi', 'Không thể gửi thông báo');
    }
  };

  const handleCreateAssignment = async () => {
    if (!selectedClass || !assignmentForm.title || !assignmentForm.dueDate) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
      return;
    }
    try {
      await api.teacherCreateAssignment?.({
        classId: selectedClass.id,
        title: assignmentForm.title,
        description: assignmentForm.description,
        dueDate: assignmentForm.dueDate,
        isExam: assignmentForm.isExam,
        durationMinutes: assignmentForm.isExam ? (assignmentForm.durationMinutes || 0) : 0,
      });
      setAssignmentForm({ title: '', description: '', dueDate: '', isExam: false, durationMinutes: 0 });
      setShowAssignmentModal(false);
      Alert.alert('Thành công', 'Đã tạo bài tập');
      await loadClassDetail(selectedClass.id);
    } catch (error) {
      console.warn('Không thể tạo bài tập:', error);
      Alert.alert('Lỗi', 'Không thể tạo bài tập');
    }
  };

  const handleEditAssignment = (assignment: AssignmentItem) => {
    if (!assignment) return;
    setEditingAssignment(assignment);
    setAssignmentForm({
      title: assignment.title || '',
      description: assignment.description || '',
      dueDate: assignment.dueDate || assignment.deadline || '',
      isExam: assignment.isExam || false,
      durationMinutes: assignment.durationMinutes || 0,
    });
    setShowEditAssignmentModal(true);
  };

  const handleUpdateAssignment = async () => {
    if (!selectedClass || !editingAssignment || !assignmentForm.title || !assignmentForm.dueDate) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
      return;
    }
    try {
      await api.teacherUpdateAssignment?.(editingAssignment.id, {
        title: assignmentForm.title,
        description: assignmentForm.description,
        dueDate: assignmentForm.dueDate,
        isExam: assignmentForm.isExam,
        durationMinutes: assignmentForm.isExam ? (assignmentForm.durationMinutes || 0) : 0,
      });
      setAssignmentForm({ title: '', description: '', dueDate: '', isExam: false, durationMinutes: 0 });
      setEditingAssignment(null);
      setShowEditAssignmentModal(false);
      Alert.alert('Thành công', 'Đã cập nhật bài tập');
      await loadClassDetail(selectedClass.id);
    } catch (error) {
      console.warn('Không thể cập nhật bài tập:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật bài tập');
    }
  };

  const handleViewSubmissions = async (assignment: AssignmentItem) => {
    if (!assignment) return;
    setSelectedAssignmentForSubmissions(assignment);
    try {
      const list = await api.teacherSubmissions?.(assignment.id);
      if (Array.isArray(list)) {
        setSubmissions(
          list.map((s: any) => ({
            id: s.id || s._id,
            studentId: s.studentId || '',
            studentName: s.studentName || '',
            submittedAt: s.submittedAt,
            files: s.files || (s.contentUrl ? s.contentUrl.split(';').filter((url: string) => url) : []),
            score: s.score,
            notes: s.notes || '',
          })),
        );
      }
      setShowSubmissionsModal(true);
    } catch (error) {
      console.warn('Không thể tải danh sách bài nộp:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách bài nộp');
    }
  };

  const handleGradeSubmission = (submission: typeof submissions[0]) => {
    setSelectedSubmission(submission);
    setGradingData({
      grade: submission.score?.toString() || '',
      comment: submission.notes || '',
    });
    setShowGradingModal(true);
  };

  const handleSubmitGrade = async () => {
    if (!selectedSubmission || !selectedAssignmentForSubmissions) return;
    if (!gradingData.grade) {
      Alert.alert('Lỗi', 'Vui lòng nhập điểm');
      return;
    }
    try {
      await api.teacherGradeSubmission?.(selectedSubmission.id, {
        score: parseFloat(gradingData.grade),
        notes: gradingData.comment,
      });
      Alert.alert('Thành công', 'Đã chấm điểm');
      setShowGradingModal(false);
      setSelectedSubmission(null);
      setGradingData({ grade: '', comment: '' });
      // Reload submissions
      await handleViewSubmissions(selectedAssignmentForSubmissions);
    } catch (error) {
      console.warn('Không thể chấm điểm:', error);
      Alert.alert('Lỗi', 'Không thể chấm điểm');
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedDocumentFile({
          uri: asset.uri,
          name: asset.name || `file-${Date.now()}`,
          mimeType: asset.mimeType || 'application/octet-stream',
        });
      }
    } catch (error) {
      console.warn('Error picking document:', error);
      Alert.alert('Lỗi', 'Không thể chọn tài liệu');
    }
  };

  const handleUploadDocument = async () => {
    if (!selectedClass || !documentForm.title) {
      Alert.alert('Lỗi', 'Vui lòng nhập tiêu đề tài liệu');
      return;
    }
    if (!selectedDocumentFile) {
      Alert.alert('Lỗi', 'Vui lòng chọn tệp tài liệu');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: selectedDocumentFile.uri,
        name: selectedDocumentFile.name,
        type: selectedDocumentFile.mimeType || 'application/octet-stream',
      } as any);
      formData.append('title', documentForm.title);
      formData.append('description', documentForm.description || '');

      await api.teacherUploadDocument?.(selectedClass.id, formData);
      Alert.alert('Thành công', 'Đã tải lên tài liệu');
      setDocumentForm({ title: '', description: '' });
      setSelectedDocumentFile(null);
      setShowDocumentModal(false);
      await loadClassDetail(selectedClass.id);
    } catch (error) {
      console.warn('Không thể tải lên tài liệu:', error);
      Alert.alert('Lỗi', 'Không thể tải lên tài liệu');
    }
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    Alert.alert('Xác nhận', 'Bạn có chắc muốn xóa thông báo này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.teacherDeleteAnnouncement?.(announcementId);
            if (selectedClass) {
              await loadClassDetail(selectedClass.id);
            }
            Alert.alert('Thành công', 'Đã xóa thông báo');
          } catch (error) {
            console.warn('Không thể xóa thông báo:', error);
            Alert.alert('Lỗi', 'Không thể xóa thông báo');
          }
        },
      },
    ]);
  };

  const handleDeleteDocument = async (documentId: string) => {
    Alert.alert('Xác nhận', 'Bạn có chắc muốn xóa tài liệu này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.teacherDeleteDocument?.(documentId);
            if (selectedClass) {
              await loadClassDetail(selectedClass.id);
            }
            Alert.alert('Thành công', 'Đã xóa tài liệu');
          } catch (error) {
            console.warn('Không thể xóa tài liệu:', error);
            Alert.alert('Lỗi', 'Không thể xóa tài liệu');
          }
        },
      },
    ]);
  };

  const handleRemoveStudent = (student: { id: string; name: string }) => {
    setStudentToRemove(student);
  };

  const handleConfirmRemoveStudent = async () => {
    if (!selectedClass || !studentToRemove) return;

    try {
      await api.teacherRemoveStudentFromClass?.(selectedClass.id, studentToRemove.id);
      setStudentToRemove(null);
      // Reload class detail to refresh the student list
      await loadClassDetail(selectedClass.id);
      Alert.alert('Thành công', 'Đã xóa sinh viên khỏi lớp');
    } catch (error: any) {
      console.warn('Không thể xóa sinh viên:', error);
      const errorMessage = error?.message || error?.error || 'Không thể xóa sinh viên khỏi lớp';
      Alert.alert('Lỗi', errorMessage);
      setStudentToRemove(null);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Chưa đặt';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedClass(null);
    setDetailTab('overview');
    setCommentText('');
    // Đảm bảo không còn modal con nào mở khi thoát chi tiết
    setShowAssignmentModal(false);
    setShowDocumentModal(false);
    setShowNotificationModal(false);
    setShowSubmissionsModal(false);
    setShowGradingModal(false);
    setStudentToRemove(null);
  };

  const loadComments = useCallback(
    async (classId: string) => {
      setCommentsLoading(true);
      try {
        const list: any = await api.teacherGetComments?.(classId);
        if (Array.isArray(list)) {
          setSelectedClass(prev =>
            prev
              ? {
                  ...prev,
                  comments: list.map((c: any, index: number) => ({
                    id: c.id || c._id || String(index),
                    author: c.author || c.user || c.username || 'Không rõ',
                    content: c.content || c.text || '',
                    createdAt: c.createdAt,
                  })),
                }
              : prev,
          );
        }
      } catch (error) {
        console.warn('Không thể tải bình luận:', error);
      } finally {
        setCommentsLoading(false);
      }
    },
    [],
  );

  const handleSendComment = async () => {
    if (!selectedClass || !commentText.trim()) {
      return;
    }
    try {
      await api.teacherCreateComment?.(selectedClass.id, {
        content: commentText.trim(),
      });
      setCommentText('');
      await loadComments(selectedClass.id);
    } catch (error) {
      console.warn('Không thể gửi bình luận:', error);
      Alert.alert('Lỗi', 'Không thể gửi bình luận');
    }
  };

  const renderTabButton = (tab: DetailTab, label: string) => (
    <TouchableOpacity
      style={[styles.tabButton, detailTab === tab && styles.tabButtonActive]}
      onPress={() => setDetailTab(tab)}
    >
      <Text style={[styles.tabButtonText, detailTab === tab && styles.tabButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
  <View style={styles.container}>
      <View style={styles.header}>
    <Text style={styles.title}>Quản lý lớp học</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Text style={styles.createButtonText}>+ Tạo lớp</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={classes}
          keyExtractor={item => item.id}
          contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadClasses} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('TeacherClassDetail', { id: item.id })}
            >
              <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.name}</Text>
                {item.code && <Text style={styles.cardCode}>{item.code}</Text>}
              </View>
              <View style={styles.cardMeta}>
                <Text style={styles.cardMetaText}>{item.students || 0} sinh viên</Text>
                <Text style={styles.cardMetaText}>{item.assignments || 0} bài tập</Text>
              </View>
              {item.description && (
                <Text style={styles.cardDescription} numberOfLines={2}>
                  {item.description}
          </Text>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Chưa có lớp học nào</Text>
        </View>
          }
        />
      )}

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        onRequestClose={handleCloseDetailModal}
      >
        <View style={styles.detailScreenContainer}>
          <View style={styles.detailScreenContent}>
            {detailLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedClass?.name}</Text>
                  {selectedClass?.code && (
                    <Text style={styles.modalSubtitle}>Mã: {selectedClass.code}</Text>
                  )}
                </View>

                {/* Tabs */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.tabsContainer}
                >
                  {renderTabButton('overview', 'Thông tin')}
                  {renderTabButton('students', 'Sinh viên')}
                  {renderTabButton('assignments', 'Bài tập')}
                  {renderTabButton('documents', 'Tài liệu')}
                  {renderTabButton('announcements', 'Thông báo')}
                  {renderTabButton('comments', 'Bình luận')}
                </ScrollView>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  style={styles.tabContent}
                  contentContainerStyle={{ paddingBottom: 8 }}
                >
                  {/* Overview Tab */}
                  {detailTab === 'overview' && (
                    <View>
                      {selectedClass?.teacher && (
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Giảng viên:</Text>
                          <Text style={styles.infoValue}>{selectedClass.teacher}</Text>
                        </View>
                      )}
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Số sinh viên:</Text>
                        <Text style={styles.infoValue}>
                          {Array.isArray(selectedClass?.students) ? selectedClass!.students!.length : 0}
        </Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Số bài tập:</Text>
                        <Text style={styles.infoValue}>
                          {Array.isArray(selectedClass?.assignments) ? selectedClass!.assignments!.length : 0}
                        </Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Số tài liệu:</Text>
                        <Text style={styles.infoValue}>
                          {Array.isArray(selectedClass?.documents) ? selectedClass!.documents!.length : 0}
                        </Text>
                      </View>
                      {selectedClass?.description && (
                        <View style={styles.descriptionBox}>
                          <Text style={styles.descriptionLabel}>Mô tả:</Text>
                          <Text style={styles.descriptionText}>{selectedClass.description}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Students Tab */}
                  {detailTab === 'students' && (
                    <View>
                      <Text style={styles.sectionTitle}>
                        Danh sách sinh viên (
                        {Array.isArray(selectedClass?.students) ? selectedClass!.students!.length : 0})
                      </Text>
                      {Array.isArray(selectedClass?.students) && selectedClass!.students!.length > 0 ? (
                        selectedClass!.students!.map(student => (
                          <View key={student.id} style={styles.studentItem}>
                            <View style={styles.studentInfo}>
                              <Text style={styles.studentName}>{student.name}</Text>
                              {student.studentId && (
                                <Text style={styles.studentId}>MSSV: {student.studentId}</Text>
                              )}
                              {student.email && (
                                <Text style={styles.studentEmail}>{student.email}</Text>
                              )}
                            </View>
                            <TouchableOpacity
                              style={styles.removeStudentButton}
                              onPress={() =>
                                handleRemoveStudent({ id: student.id, name: student.name })
                              }
                            >
                              <Text style={styles.removeStudentButtonText}>Xóa</Text>
                            </TouchableOpacity>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.emptyText}>Chưa có sinh viên</Text>
                      )}
                    </View>
                  )}

                  {/* Assignments Tab */}
                  {detailTab === 'assignments' && (
                    <View>
                      <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>
                          Bài tập (
                          {Array.isArray(selectedClass?.assignments)
                            ? selectedClass!.assignments!.length
                            : 0}
                          )
                        </Text>
                        <TouchableOpacity
                          style={styles.addButton}
                          onPress={() => setShowAssignmentModal(true)}
                        >
                          <Text style={styles.addButtonText}>+ Tạo bài tập</Text>
                        </TouchableOpacity>
                      </View>
                      {Array.isArray(selectedClass?.assignments) &&
                      selectedClass!.assignments!.length > 0 ? (
                        selectedClass!.assignments!.map(assignment => (
                          <View key={assignment.id} style={styles.assignmentItem}>
                            <Text style={styles.assignmentTitle}>{assignment.title}</Text>
                            {assignment.description && (
                              <Text style={styles.assignmentDescription} numberOfLines={2}>
                                {assignment.description}
                              </Text>
                            )}
                            <View style={styles.assignmentMeta}>
                              <Text style={styles.assignmentMetaText}>
                                Hạn: {formatDate(assignment.dueDate || assignment.deadline)}
                              </Text>
                              <Text style={styles.assignmentMetaText}>
                                Đã nộp: {assignment.submissions || 0}
                              </Text>
                            </View>
                            {assignment.isExam && (
                              <Text style={styles.examBadge}>
                                Kỳ thi ({assignment.durationMinutes || 0} phút)
                              </Text>
                            )}
                            <View style={styles.assignmentActions}>
                              <TouchableOpacity
                                style={styles.assignmentActionButton}
                                onPress={() => handleEditAssignment(assignment)}
                              >
                                <Text style={styles.assignmentActionText}>Sửa</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[
                                  styles.assignmentActionButton,
                                  styles.assignmentActionButtonPrimary,
                                ]}
                                onPress={() => handleViewSubmissions(assignment)}
                              >
                                <Text
                                  style={[
                                    styles.assignmentActionText,
                                    styles.assignmentActionTextPrimary,
                                  ]}
                                >
                                  Xem bài nộp
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.emptyText}>Chưa có bài tập</Text>
                      )}
                    </View>
                  )}

                  {/* Documents Tab */}
                  {detailTab === 'documents' && (
                    <View>
                      <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>
                          Tài liệu (
                          {Array.isArray(selectedClass?.documents)
                            ? selectedClass!.documents!.length
                            : 0}
                          )
                        </Text>
                        <TouchableOpacity
                          style={styles.addButton}
                          onPress={() => setShowDocumentModal(true)}
                        >
                          <Text style={styles.addButtonText}>+ Tải lên</Text>
                        </TouchableOpacity>
                      </View>
                      {Array.isArray(selectedClass?.documents) &&
                      selectedClass!.documents!.length > 0 ? (
                        selectedClass!.documents!.map(document => (
                          <View key={document.id} style={styles.documentItem}>
                            <View style={styles.documentInfo}>
                              <Text style={styles.documentTitle}>{document.title}</Text>
                              {document.fileName && (
                                <Text style={styles.documentMeta}>
                                  {document.fileName}
                                  {document.fileSize &&
                                    ` • ${(document.fileSize / 1024).toFixed(1)} KB`}
                                </Text>
                              )}
                              {document.uploadedAt && (
                                <Text style={styles.documentMeta}>
                                  Tải lên: {formatDate(document.uploadedAt)}
                                </Text>
                              )}
                            </View>
                            <View style={styles.documentActions}>
                              {document.fileUrl && (
                                <TouchableOpacity
                                  style={styles.documentActionButton}
                                  onPress={() => {
                                    const url = document.fileUrl!.startsWith('http')
                                      ? document.fileUrl!
                                      : `${BACKEND_URL}${document.fileUrl}`;
                                    Linking.openURL(url).catch(err =>
                                      console.warn('Không thể mở file:', err),
                                    );
                                  }}
                                >
                                  <Text style={styles.documentActionText}>Tải</Text>
                                </TouchableOpacity>
                              )}
                              <TouchableOpacity
                                style={[styles.documentActionButton, styles.deleteButton]}
                                onPress={() => handleDeleteDocument(document.id)}
                              >
                                <Text style={[styles.documentActionText, styles.deleteButtonText]}>
                                  Xóa
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.emptyText}>Chưa có tài liệu</Text>
                      )}
                    </View>
                  )}

                  {/* Announcements Tab */}
                  {detailTab === 'announcements' && (
                    <View>
                      <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>
                          Thông báo (
                          {Array.isArray(selectedClass?.announcements)
                            ? selectedClass!.announcements!.length
                            : 0}
                          )
                        </Text>
                        <TouchableOpacity
                          style={styles.addButton}
                          onPress={() => setShowNotificationModal(true)}
                        >
                          <Text style={styles.addButtonText}>+ Tạo thông báo</Text>
                        </TouchableOpacity>
                      </View>
                      {Array.isArray(selectedClass?.announcements) &&
                      selectedClass!.announcements!.length > 0 ? (
                        selectedClass!.announcements!.map(announcement => (
                          <View key={announcement.id} style={styles.announcementItem}>
                            <View style={styles.announcementHeader}>
                              <Text style={styles.announcementTitle}>{announcement.title}</Text>
                              <TouchableOpacity
                                style={styles.deleteIconButton}
                                onPress={() => handleDeleteAnnouncement(announcement.id)}
                              >
                                <Text style={styles.deleteIconText}>×</Text>
                              </TouchableOpacity>
                            </View>
                            {announcement.content && (
                              <Text style={styles.announcementContent}>{announcement.content}</Text>
                            )}
                            {announcement.createdAt && (
                              <Text style={styles.announcementDate}>
                                {formatDate(announcement.createdAt)}
                              </Text>
                            )}
                          </View>
                        ))
                      ) : (
                        <Text style={styles.emptyText}>Chưa có thông báo</Text>
                      )}
                    </View>
                  )}

                  {/* Comments Tab */}
                  {detailTab === 'comments' && (
                    <View style={styles.commentsContainer}>
                      {commentsLoading ? (
                        <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
                      ) : (
                        <>
                          {Array.isArray(selectedClass?.comments) &&
                          selectedClass!.comments!.length > 0 ? (
                            selectedClass!.comments!.map(comment => (
                              <View key={comment.id} style={styles.commentItem}>
                                <View style={styles.commentHeader}>
                                  <Text style={styles.commentAuthor}>
                                    {comment.author || 'Không rõ'}
                                  </Text>
                                  {comment.createdAt && (
                                    <Text style={styles.commentDate}>
                                      {formatDate(comment.createdAt)}
                                    </Text>
                                  )}
                                </View>
                                <Text style={styles.commentContent}>{comment.content}</Text>
                              </View>
                            ))
                          ) : (
                            <Text style={styles.emptyText}>Chưa có bình luận nào</Text>
                          )}
                        </>
                      )}

                      <View style={styles.commentInputContainer}>
                        <TextInput
                          style={styles.commentInput}
                          placeholder="Nhập bình luận..."
                          value={commentText}
                          onChangeText={setCommentText}
                          multiline
                        />
                        <TouchableOpacity
                          style={[
                            styles.commentSendButton,
                            !commentText.trim() && { opacity: 0.5 },
                          ]}
                          disabled={!commentText.trim()}
                          onPress={handleSendComment}
                        >
                          <Text style={styles.commentSendButtonText}>Gửi</Text>
                        </TouchableOpacity>
  </View>
                    </View>
                  )}
                </ScrollView>
              </>
            )}

            <TouchableOpacity style={styles.modalClose} onPress={handleCloseDetailModal}>
              <Text style={styles.modalCloseText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Create Class Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
        >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Tạo lớp học mới</Text>
                <ScrollView 
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  style={{ maxHeight: 400 }}
                >
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Tên lớp học *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ví dụ: Lập trình Web"
                      value={createForm.name}
                      onChangeText={value => setCreateForm(prev => ({ ...prev, name: value }))}
    />
  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Mã lớp học *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ví dụ: WEB101"
                      value={createForm.code}
                      onChangeText={value => setCreateForm(prev => ({ ...prev, code: value }))}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Mô tả (tùy chọn)</Text>
                    <TextInput
                      style={[styles.input, { height: 80 }]}
                      placeholder="Nhập mô tả về lớp học..."
                      multiline
                      value={createForm.description}
                      onChangeText={value => setCreateForm(prev => ({ ...prev, description: value }))}
                    />
                  </View>
                </ScrollView>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalButton} onPress={handleCreateClass}>
                    <Text style={styles.modalButtonText}>Tạo lớp</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalCancel}
                    onPress={() => setShowCreateModal(false)}
                  >
                    <Text style={styles.modalCancelText}>Hủy</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Notification Modal */}
      <Modal
        visible={showNotificationModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowNotificationModal(false);
          setNotificationForm({ title: '', content: '', type: 'general' });
        }}
        >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Gửi thông báo</Text>
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Tiêu đề *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Nhập tiêu đề thông báo"
                      value={notificationForm.title}
                      onChangeText={value => setNotificationForm(prev => ({ ...prev, title: value }))}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Nội dung *</Text>
                    <TextInput
                      style={[styles.input, { height: 100 }]}
                      placeholder="Nhập nội dung thông báo..."
                      multiline
                      value={notificationForm.content}
                      onChangeText={value => setNotificationForm(prev => ({ ...prev, content: value }))}
                    />
                  </View>
                </ScrollView>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalButton} onPress={handleSendNotification}>
                    <Text style={styles.modalButtonText}>Gửi</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalCancel}
                    onPress={() => {
                      setShowNotificationModal(false);
                      setNotificationForm({ title: '', content: '', type: 'general' });
                    }}
                  >
                    <Text style={styles.modalCancelText}>Hủy</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Create Assignment Modal */}
      <Modal
        visible={showAssignmentModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowAssignmentModal(false);
          setAssignmentForm({ title: '', description: '', dueDate: '', isExam: false, durationMinutes: 0 });
        }}
        >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 500 }}>
            <Text style={styles.modalTitle}>Tạo bài tập mới</Text>
            <TextInput
              style={styles.input}
              placeholder="Tiêu đề bài tập *"
              value={assignmentForm.title}
              onChangeText={value => setAssignmentForm(prev => ({ ...prev, title: value }))}
            />
            <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder="Mô tả (tùy chọn)"
              multiline
              value={assignmentForm.description}
              onChangeText={value => setAssignmentForm(prev => ({ ...prev, description: value }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Hạn nộp (YYYY-MM-DDTHH:mm) *"
              value={assignmentForm.dueDate}
              onChangeText={value => setAssignmentForm(prev => ({ ...prev, dueDate: value }))}
            />
            <View style={styles.checkboxRow}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setAssignmentForm(prev => ({ ...prev, isExam: !prev.isExam }))}
              >
                <View style={[styles.checkboxBox, assignmentForm.isExam && styles.checkboxBoxChecked]}>
                  {assignmentForm.isExam && <Text style={styles.checkboxCheck}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Đây là kỳ thi</Text>
              </TouchableOpacity>
            </View>
            {assignmentForm.isExam && (
              <TextInput
                style={styles.input}
                placeholder="Thời gian làm bài (phút)"
                keyboardType="numeric"
                value={assignmentForm.durationMinutes?.toString() || ''}
                onChangeText={value =>
                  setAssignmentForm(prev => ({
                    ...prev,
                    durationMinutes: parseInt(value, 10) || 0,
                  }))
                }
              />
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalButton} onPress={handleCreateAssignment}>
                <Text style={styles.modalButtonText}>Tạo bài tập</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setShowAssignmentModal(false);
                  setAssignmentForm({ title: '', description: '', dueDate: '', isExam: false, durationMinutes: 0 });
                }}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>
            </View>
                </ScrollView>
              </View>
            </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Assignment Modal */}
      <Modal
        visible={showEditAssignmentModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowEditAssignmentModal(false);
          setEditingAssignment(null);
          setAssignmentForm({ title: '', description: '', dueDate: '', isExam: false, durationMinutes: 0 });
        }}
        >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 500 }}>
            <Text style={styles.modalTitle}>Sửa bài tập</Text>
            <TextInput
              style={styles.input}
              placeholder="Tiêu đề bài tập *"
              value={assignmentForm.title}
              onChangeText={value => setAssignmentForm(prev => ({ ...prev, title: value }))}
            />
            <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder="Mô tả (tùy chọn)"
              multiline
              value={assignmentForm.description}
              onChangeText={value => setAssignmentForm(prev => ({ ...prev, description: value }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Hạn nộp (YYYY-MM-DDTHH:mm) *"
              value={assignmentForm.dueDate}
              onChangeText={value => setAssignmentForm(prev => ({ ...prev, dueDate: value }))}
            />
            <View style={styles.checkboxRow}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setAssignmentForm(prev => ({ ...prev, isExam: !prev.isExam }))}
              >
                <View style={[styles.checkboxBox, assignmentForm.isExam && styles.checkboxBoxChecked]}>
                  {assignmentForm.isExam && <Text style={styles.checkboxCheck}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Đây là kỳ thi</Text>
              </TouchableOpacity>
            </View>
            {assignmentForm.isExam && (
              <TextInput
                style={styles.input}
                placeholder="Thời gian làm bài (phút)"
                keyboardType="numeric"
                value={assignmentForm.durationMinutes?.toString() || ''}
                onChangeText={value =>
                  setAssignmentForm(prev => ({
                    ...prev,
                    durationMinutes: parseInt(value, 10) || 0,
                  }))
                }
              />
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalButton} onPress={handleUpdateAssignment}>
                <Text style={styles.modalButtonText}>Cập nhật</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setShowEditAssignmentModal(false);
                  setEditingAssignment(null);
                  setAssignmentForm({ title: '', description: '', dueDate: '', isExam: false, durationMinutes: 0 });
                }}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>
            </View>
                </ScrollView>
              </View>
            </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Submissions Modal */}
      <Modal
        visible={showSubmissionsModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowSubmissionsModal(false);
          setSelectedAssignmentForSubmissions(null);
          setSubmissions([]);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <Text style={styles.modalTitle}>
              Bài nộp: {selectedAssignmentForSubmissions?.title}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
              {submissions.length > 0 ? (
                submissions.map(submission => (
                  <View key={submission.id} style={styles.submissionItem}>
                    <View style={styles.submissionHeader}>
                      <View style={styles.submissionInfo}>
                        <Text style={styles.submissionStudentName}>{submission.studentName}</Text>
                        <Text style={styles.submissionStudentId}>MSSV: {submission.studentId}</Text>
                        {submission.submittedAt && (
                          <Text style={styles.submissionDate}>
                            Nộp: {formatDate(submission.submittedAt)}
                          </Text>
                        )}
                      </View>
                      {submission.score !== undefined && submission.score !== null ? (
                        <View style={styles.scoreBadge}>
                          <Text style={styles.scoreText}>{submission.score}</Text>
                        </View>
                      ) : (
                        <Text style={styles.ungradedBadge}>Chưa chấm</Text>
                      )}
                    </View>
                    {submission.files && submission.files.length > 0 && (
                      <View style={styles.submissionFiles}>
                        <Text style={styles.submissionFilesLabel}>File đính kèm:</Text>
                        {submission.files.map((file, idx) => (
                          <TouchableOpacity
                            key={idx}
                            style={styles.fileLink}
                            onPress={() => {
                              const url = file.startsWith('http')
                                ? file
                                : `${BACKEND_URL}${file}`;
                              Linking.openURL(url).catch(err =>
                                console.warn('Không thể mở file:', err),
                              );
                            }}
                          >
                            <Text style={styles.fileLinkText}>📎 File {idx + 1}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    {submission.notes && (
                      <Text style={styles.submissionNotes}>Nhận xét: {submission.notes}</Text>
                    )}
                    <TouchableOpacity
                      style={styles.gradeButton}
                      onPress={() => handleGradeSubmission(submission)}
                    >
                      <Text style={styles.gradeButtonText}>
                        {submission.score !== undefined && submission.score !== null
                          ? 'Sửa điểm'
                          : 'Chấm điểm'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>Chưa có bài nộp nào</Text>
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => {
                setShowSubmissionsModal(false);
                setSelectedAssignmentForSubmissions(null);
                setSubmissions([]);
              }}
            >
              <Text style={styles.modalCloseText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Grading Modal */}
      <Modal
        visible={showGradingModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowGradingModal(false);
          setSelectedSubmission(null);
          setGradingData({ grade: '', comment: '' });
        }}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContent}>
            <Text style={styles.confirmModalTitle}>
              Chấm điểm: {selectedSubmission?.studentName}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Điểm số *"
              keyboardType="numeric"
              value={gradingData.grade}
              onChangeText={value => setGradingData(prev => ({ ...prev, grade: value }))}
            />
            <TextInput
              style={[styles.input, { height: 100 }]}
              placeholder="Nhận xét (tùy chọn)"
              multiline
              value={gradingData.comment}
              onChangeText={value => setGradingData(prev => ({ ...prev, comment: value }))}
            />
            <View style={styles.confirmModalActions}>
              <TouchableOpacity
                style={styles.confirmModalCancel}
                onPress={() => {
                  setShowGradingModal(false);
                  setSelectedSubmission(null);
                  setGradingData({ grade: '', comment: '' });
                }}
              >
                <Text style={styles.confirmModalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmModalConfirm} onPress={handleSubmitGrade}>
                <Text style={styles.confirmModalConfirmText}>Lưu điểm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Document Modal */}
      <Modal
        visible={showDocumentModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowDocumentModal(false);
          setDocumentForm({ title: '', description: '' });
          setSelectedDocumentFile(null);
        }}
        >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Tải lên tài liệu</Text>
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Tiêu đề tài liệu *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ví dụ: Bài giảng chương 1"
                      value={documentForm.title}
                      onChangeText={value => setDocumentForm(prev => ({ ...prev, title: value }))}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Mô tả (tùy chọn)</Text>
                    <TextInput
                      style={[styles.input, { height: 80 }]}
                      placeholder="Nhập mô tả về tài liệu..."
                      multiline
                      value={documentForm.description}
                      onChangeText={value => setDocumentForm(prev => ({ ...prev, description: value }))}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Tệp tài liệu *</Text>
                    <TouchableOpacity
                      style={styles.filePickerButton}
                      onPress={handlePickDocument}
                    >
                      <Text style={styles.filePickerButtonText}>
                        {selectedDocumentFile ? selectedDocumentFile.name : 'Chọn tệp...'}
                      </Text>
                    </TouchableOpacity>
                    {selectedDocumentFile && (
                      <TouchableOpacity
                        style={styles.removeFileButton}
                        onPress={() => setSelectedDocumentFile(null)}
                      >
                        <Text style={styles.removeFileButtonText}>Xóa tệp đã chọn</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </ScrollView>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalButton} onPress={handleUploadDocument}>
                    <Text style={styles.modalButtonText}>Tải lên</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalCancel}
                    onPress={() => {
                      setShowDocumentModal(false);
                      setDocumentForm({ title: '', description: '' });
                      setSelectedDocumentFile(null);
                    }}
                  >
                    <Text style={styles.modalCancelText}>Hủy</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Remove Student Confirmation Modal */}
      <Modal
        visible={!!studentToRemove}
        transparent
        animationType="fade"
        onRequestClose={() => setStudentToRemove(null)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContent}>
            <Text style={styles.confirmModalTitle}>Xác nhận xóa sinh viên</Text>
            <Text style={styles.confirmModalText}>
              Bạn có chắc chắn muốn xóa sinh viên <Text style={styles.confirmModalBold}>{studentToRemove?.name}</Text> khỏi lớp{' '}
              <Text style={styles.confirmModalBold}>{selectedClass?.name}</Text>?
            </Text>
            <Text style={styles.confirmModalWarning}>
              Hành động này không thể hoàn tác. Sinh viên sẽ bị xóa khỏi lớp và mất quyền truy cập vào các bài tập và tài liệu của lớp này.
            </Text>
            <View style={styles.confirmModalActions}>
              <TouchableOpacity
                style={styles.confirmModalCancel}
                onPress={() => setStudentToRemove(null)}
              >
                <Text style={styles.confirmModalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmModalConfirm}
                onPress={handleConfirmRemoveStudent}
              >
                <Text style={styles.confirmModalConfirmText}>Xác nhận xóa</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.secondary,
  },
  cardCode: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  cardMetaText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  cardDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
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
  detailScreenContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  detailScreenContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 0,
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
  modalHeader: {
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.secondary,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: colors.primary,
  },
  tabButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  tabButtonTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  tabContent: {
    paddingTop: 0,
    paddingBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.secondary,
    marginBottom: 8,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: colors.secondary,
    fontWeight: '600',
  },
  descriptionBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary,
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  studentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.secondary,
  },
  studentId: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  studentEmail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  removeStudentButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.primaryLight,
    borderRadius: 6,
    marginLeft: 12,
  },
  removeStudentButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.secondary,
    marginBottom: 12,
  },
  confirmModalText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  confirmModalBold: {
    fontWeight: '600',
    color: colors.secondary,
  },
  confirmModalWarning: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 16,
    lineHeight: 18,
  },
  confirmModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  confirmModalCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: colors.border,
  },
  confirmModalCancelText: {
    color: colors.secondary,
    fontWeight: '600',
  },
  confirmModalConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  confirmModalConfirmText: {
    color: '#fff',
    fontWeight: '600',
  },
  assignmentItem: {
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  assignmentActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  assignmentActionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
  },
  assignmentActionButtonPrimary: {
    backgroundColor: colors.primary,
  },
  assignmentActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  assignmentActionTextPrimary: {
    color: '#fff',
  },
  assignmentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.secondary,
    marginBottom: 4,
  },
  assignmentDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  assignmentMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  assignmentMetaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  examBadge: {
    marginTop: 4,
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  documentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  documentInfo: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.secondary,
    marginBottom: 4,
  },
  documentMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  documentActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  documentActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.primary,
    borderRadius: 6,
  },
  documentActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: colors.primaryLight,
  },
  deleteButtonText: {
    color: colors.primary,
  },
  announcementItem: {
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  announcementTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.secondary,
  },
  deleteIconButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIconText: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '700',
  },
  announcementContent: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
    lineHeight: 18,
  },
  announcementDate: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  inputGroup: {
    marginBottom: 16,
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
    fontSize: 15,
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
  modalClose: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalCloseText: {
    color: colors.primary,
    fontWeight: '600',
  },
  filePickerButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  filePickerButtonText: {
    fontSize: 15,
    color: colors.secondary,
  },
  removeFileButton: {
    marginTop: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  removeFileButtonText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  checkboxRow: {
    marginBottom: 12,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxBox: {
    width: 24,
    height: 24,
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
    fontSize: 16,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: 14,
    color: colors.secondary,
  },
  submissionItem: {
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  submissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  submissionInfo: {
    flex: 1,
  },
  submissionStudentName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.secondary,
  },
  submissionStudentId: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  submissionDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  scoreBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  scoreText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  ungradedBadge: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  submissionFiles: {
    marginTop: 8,
    marginBottom: 8,
  },
  submissionFilesLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
    marginBottom: 4,
  },
  fileLink: {
    paddingVertical: 4,
  },
  fileLinkText: {
    fontSize: 13,
    color: colors.primary,
  },
  submissionNotes: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  gradeButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
    alignItems: 'center',
  },
  gradeButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  commentsContainer: {
    flex: 1,
    paddingTop: 8,
  },
  commentItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary,
  },
  commentDate: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  commentContent: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  commentInputContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  commentInput: {
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.background,
    fontSize: 14,
    marginBottom: 8,
  },
  commentSendButton: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  commentSendButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default TeacherClassesScreen;

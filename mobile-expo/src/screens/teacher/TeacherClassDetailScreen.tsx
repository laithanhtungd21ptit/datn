import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useRoute, useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { api } from '../../api/client';
import { colors } from '../../theme/colors';
import { BACKEND_URL } from '../../config/constants';

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

type DetailTab =
  | 'overview'
  | 'students'
  | 'assignments'
  | 'documents'
  | 'announcements'
  | 'comments';

type RouteParams = {
  params: {
    id: string;
  };
};

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

const formatDate = (value?: string) => {
  if (!value) return '';
  try {
    const d = new Date(value);
    return d.toLocaleString('vi-VN');
  } catch {
    return value;
  }
};

const TeacherClassDetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<RouteParams, 'params'>>();
  const classId = route.params?.id;

  const [detail, setDetail] = useState<ClassDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<DetailTab>('overview');
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  // Modals
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showEditAssignmentModal, setShowEditAssignmentModal] = useState(false);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [showGradingModal, setShowGradingModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showRemoveStudentModal, setShowRemoveStudentModal] = useState(false);

  // Forms
  const [assignmentForm, setAssignmentForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    startAt: '',
    isExam: false,
    durationMinutes: 0,
  });
  const [editingAssignment, setEditingAssignment] = useState<AssignmentItem | null>(null);
  const [documentForm, setDocumentForm] = useState({
    title: '',
    description: '',
  });
  const [selectedDocumentFile, setSelectedDocumentFile] = useState<{
    uri: string;
    name: string;
    mimeType: string | null;
  } | null>(null);
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    content: '',
    type: 'general',
  });
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
  const [studentToRemove, setStudentToRemove] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const loadDetail = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    try {
      const [data, commentsData] = await Promise.all([
        api.teacherClassDetail?.(classId),
        api.teacherGetComments?.(classId),
      ]);
      if (data) {
        const classData = data as any;
        setDetail({
          id: classData.id || classId,
          name: classData.name || '',
          code: classData.code,
          description: classData.description,
          teacher: classData.teacher,
          students: Array.isArray(classData.students)
            ? classData.students.map((s: any) => ({
                id: s.id || s.studentId || s._id, // Backend returns studentId as id, or _id as fallback
                name: s.name || s.fullName || '',
                studentId: s.studentId || s.id, // Keep both for reference
                email: s.email || '',
                _id: s._id || s.id, // Store _id if available
              }))
            : [],
          assignments: Array.isArray(classData.assignments)
            ? classData.assignments.map((a: any) => ({
                id: a.id || a._id,
                title: a.title || '',
                description: a.description,
                dueDate: a.dueDate || a.deadline,
                deadline: a.deadline || a.dueDate,
                isExam: !!a.isExam,
                durationMinutes: a.durationMinutes || 0,
                submissions: a.submissions || 0,
              }))
            : [],
          documents: Array.isArray(classData.documents)
            ? classData.documents.map((d: any) => ({
                id: d.id || d._id,
                title: d.title || d.fileName || '',
                fileName: d.fileName,
                fileSize: d.fileSize,
                fileUrl: d.fileUrl || d.url,
                uploadedAt: d.uploadedAt || d.createdAt,
              }))
            : [],
          announcements: Array.isArray(classData.announcements)
            ? classData.announcements.map((a: any) => ({
                id: a.id || a._id,
                title: a.title || '',
                content: a.content || a.message,
                type: a.type || 'general',
                createdAt: a.createdAt,
              }))
            : [],
          comments: Array.isArray(commentsData)
            ? commentsData.map((c: any, index: number) => ({
                id: c.id || c._id || String(index),
                author: c.author || c.userId?.fullName || c.user || c.username || 'Không rõ',
                content: c.content || c.text || '',
                createdAt: c.createdAt,
              }))
            : [],
        });
      }
    } catch (e) {
      console.warn('Không thể tải chi tiết lớp:', e);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useFocusEffect(
    useCallback(() => {
      loadDetail();
    }, [loadDetail]),
  );

  const handleSendComment = async () => {
    if (!classId || !newComment.trim()) return;
    try {
      setSendingComment(true);
      await api.teacherCreateComment?.(classId, { content: newComment.trim() });
      setNewComment('');
      await loadDetail();
    } catch (e) {
      console.warn('Không thể gửi bình luận:', e);
      Alert.alert('Lỗi', 'Không thể gửi bình luận');
    } finally {
      setSendingComment(false);
    }
  };

  const handleRemoveStudent = (student: { id: string; name: string }) => {
    setStudentToRemove(student);
    setShowRemoveStudentModal(true);
  };

  const handleConfirmRemoveStudent = async () => {
    if (!classId || !studentToRemove) return;
    try {
      // Backend API accepts studentId which can be: studentId (code), _id, or username
      // Backend returns id as: u?.studentId || String(e.studentId)
      // So id can be either studentId (code) or _id (ObjectId string)
      // Backend will find the student using $or: [{ studentId }, { _id: studentId }, { username: studentId }]
      const studentIdToRemove = studentToRemove.id;
      
      await api.teacherRemoveStudentFromClass?.(classId, studentIdToRemove);
      setShowRemoveStudentModal(false);
      setStudentToRemove(null);
      await loadDetail();
      Alert.alert('Thành công', 'Đã xóa sinh viên khỏi lớp');
    } catch (error: any) {
      console.warn('Không thể xóa sinh viên:', error);
      console.warn('Error details:', {
        message: error?.message,
        error: error?.error,
        stack: error?.stack,
        classId,
        studentId: studentToRemove?.id,
      });
      
      // Map error codes to user-friendly messages
      let errorMessage = 'Không thể xóa sinh viên khỏi lớp';
      const errorCode = error?.message || error?.error;
      
      if (errorCode === 'INTERNAL_ERROR') {
        errorMessage = 'Lỗi hệ thống. Vui lòng thử lại sau hoặc liên hệ quản trị viên.';
      } else if (errorCode === 'STUDENT_NOT_FOUND') {
        errorMessage = 'Không tìm thấy sinh viên.';
      } else if (errorCode === 'ENROLLMENT_NOT_FOUND') {
        errorMessage = 'Sinh viên không có trong lớp học này.';
      } else if (errorCode === 'FORBIDDEN') {
        errorMessage = 'Bạn không có quyền thực hiện thao tác này.';
      } else if (errorCode === 'NOT_FOUND') {
        errorMessage = 'Không tìm thấy lớp học.';
      } else if (errorCode && errorCode !== 'INTERNAL_ERROR') {
        errorMessage = errorCode;
      }
      
      Alert.alert('Lỗi', errorMessage);
      setShowRemoveStudentModal(false);
      setStudentToRemove(null);
    }
  };

  const handleCreateAssignment = async () => {
    if (!classId || !assignmentForm.title || !assignmentForm.dueDate) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
      return;
    }
    try {
      await api.teacherCreateAssignment?.({
        classId,
        title: assignmentForm.title,
        description: assignmentForm.description,
        dueDate: assignmentForm.dueDate,
        startAt: assignmentForm.startAt,
        isExam: assignmentForm.isExam,
        durationMinutes: assignmentForm.isExam ? (assignmentForm.durationMinutes || 0) : 0,
      });
      setAssignmentForm({ title: '', description: '', dueDate: '', startAt: '', isExam: false, durationMinutes: 0 });
      setShowAssignmentModal(false);
      await loadDetail();
      Alert.alert('Thành công', 'Đã tạo bài tập');
    } catch (error) {
      console.warn('Không thể tạo bài tập:', error);
      Alert.alert('Lỗi', 'Không thể tạo bài tập');
    }
  };

  const handleEditAssignment = (assignment: AssignmentItem) => {
    setEditingAssignment(assignment);
    setAssignmentForm({
      title: assignment.title || '',
      description: assignment.description || '',
      dueDate: assignment.dueDate || assignment.deadline || '',
      startAt: '',
      isExam: assignment.isExam || false,
      durationMinutes: assignment.durationMinutes || 0,
    });
    setShowEditAssignmentModal(true);
  };

  const handleUpdateAssignment = async () => {
    if (!classId || !editingAssignment || !assignmentForm.title || !assignmentForm.dueDate) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
      return;
    }
    try {
      await api.teacherUpdateAssignment?.(editingAssignment.id, {
        title: assignmentForm.title,
        description: assignmentForm.description,
        dueDate: assignmentForm.dueDate,
        startAt: assignmentForm.startAt,
        isExam: assignmentForm.isExam,
        durationMinutes: assignmentForm.isExam ? (assignmentForm.durationMinutes || 0) : 0,
      });
      setAssignmentForm({ title: '', description: '', dueDate: '', startAt: '', isExam: false, durationMinutes: 0 });
      setEditingAssignment(null);
      setShowEditAssignmentModal(false);
      await loadDetail();
      Alert.alert('Thành công', 'Đã cập nhật bài tập');
    } catch (error) {
      console.warn('Không thể cập nhật bài tập:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật bài tập');
    }
  };

  const handleViewSubmissions = async (assignment: AssignmentItem) => {
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
    if (!classId || !documentForm.title) {
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

      await api.teacherUploadDocument?.(classId, formData);
      Alert.alert('Thành công', 'Đã tải lên tài liệu');
      setDocumentForm({ title: '', description: '' });
      setSelectedDocumentFile(null);
      setShowDocumentModal(false);
      await loadDetail();
    } catch (error) {
      console.warn('Không thể tải lên tài liệu:', error);
      Alert.alert('Lỗi', 'Không thể tải lên tài liệu');
    }
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
            await loadDetail();
            Alert.alert('Thành công', 'Đã xóa tài liệu');
          } catch (error) {
            console.warn('Không thể xóa tài liệu:', error);
            Alert.alert('Lỗi', 'Không thể xóa tài liệu');
          }
        },
      },
    ]);
  };

  const handleSendNotification = async () => {
    if (!classId || !notificationForm.title || !notificationForm.content) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
      return;
    }
    try {
      await api.teacherCreateAnnouncement?.(classId, notificationForm);
      setNotificationForm({ title: '', content: '', type: 'general' });
      setShowNotificationModal(false);
      await loadDetail();
      Alert.alert('Thành công', 'Đã gửi thông báo');
    } catch (error) {
      console.warn('Không thể gửi thông báo:', error);
      Alert.alert('Lỗi', 'Không thể gửi thông báo');
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
            await loadDetail();
            Alert.alert('Thành công', 'Đã xóa thông báo');
          } catch (error) {
            console.warn('Không thể xóa thông báo:', error);
            Alert.alert('Lỗi', 'Không thể xóa thông báo');
          }
        },
      },
    ]);
  };

  if (loading && !detail) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Không tìm thấy thông tin lớp học.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{detail.name}</Text>
        {detail.code && <Text style={styles.subtitle}>Mã lớp: {detail.code}</Text>}
        {detail.teacher && <Text style={styles.subtitle}>Giảng viên: {detail.teacher}</Text>}
      </View>

      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 0, paddingTop: 0 }}
          style={{ margin: 0, padding: 0 }}
        >
          {(['overview', 'students', 'assignments', 'documents', 'announcements', 'comments'] as DetailTab[]).map(
            key => (
              <TouchableOpacity
                key={key}
                style={[styles.tabButton, tab === key && styles.tabButtonActive]}
                onPress={() => setTab(key)}
              >
                <Text
                  style={[styles.tabButtonText, tab === key && styles.tabButtonTextActive]}
                >
                  {key === 'overview' && 'Thông tin'}
                  {key === 'students' && 'Sinh viên'}
                  {key === 'assignments' && 'Bài tập'}
                  {key === 'documents' && 'Tài liệu'}
                  {key === 'announcements' && 'Thông báo'}
                  {key === 'comments' && 'Bình luận'}
                </Text>
              </TouchableOpacity>
            ),
          )}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 100 : 80 }}
        keyboardShouldPersistTaps="handled"
      >
        {tab === 'overview' && (
          <View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Số sinh viên:</Text>
              <Text style={styles.infoValue}>{detail.students?.length || 0}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Số bài tập:</Text>
              <Text style={styles.infoValue}>{detail.assignments?.length || 0}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Số tài liệu:</Text>
              <Text style={styles.infoValue}>{detail.documents?.length || 0}</Text>
            </View>
            {detail.description && (
              <View style={styles.descriptionBox}>
                <Text style={styles.descriptionLabel}>Mô tả</Text>
                <Text style={styles.descriptionText}>{detail.description}</Text>
              </View>
            )}
          </View>
        )}

        {tab === 'students' && (
          <View style={{ marginTop: 0 }}>
            <Text style={styles.sectionTitle}>
              Danh sách sinh viên ({detail.students?.length || 0})
            </Text>
            {detail.students && detail.students.length > 0 ? (
              detail.students.map(s => (
                <View key={s.id} style={styles.studentItem}>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{s.name}</Text>
                    {s.studentId && (
                      <Text style={styles.studentMeta}>MSSV: {s.studentId}</Text>
                    )}
                    {s.email && <Text style={styles.studentMeta}>{s.email}</Text>}
                  </View>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveStudent({ id: s.id, name: s.name })}
                  >
                    <Text style={styles.removeButtonText}>Xóa</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Chưa có sinh viên.</Text>
            )}
          </View>
        )}

        {tab === 'assignments' && (
          <View style={{ marginTop: 0 }}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Bài tập ({detail.assignments?.length || 0})
              </Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => {
                  setAssignmentForm({ title: '', description: '', dueDate: '', startAt: '', isExam: false, durationMinutes: 0 });
                  setShowAssignmentModal(true);
                }}
              >
                <Text style={styles.addButtonText}>+ Tạo bài tập</Text>
              </TouchableOpacity>
            </View>
            {detail.assignments && detail.assignments.length > 0 ? (
              detail.assignments.map(a => (
                <View key={a.id} style={styles.card}>
                  <Text style={styles.cardTitle}>{a.title}</Text>
                  {a.description && (
                    <Text style={styles.cardBody} numberOfLines={3}>
                      {a.description}
                    </Text>
                  )}
                  <View style={styles.cardMetaRow}>
                    <Text style={styles.cardMeta}>
                      Hạn: {formatDate(a.dueDate || a.deadline)}
                    </Text>
                    <Text style={styles.cardMeta}>
                      Đã nộp: {a.submissions != null ? a.submissions : 0}
                    </Text>
                  </View>
                  {a.isExam && (
                    <Text style={styles.examBadge}>
                      Bài thi • {a.durationMinutes || 0} phút
                    </Text>
                  )}
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleEditAssignment(a)}
                    >
                      <Text style={styles.actionButtonText}>Sửa</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.actionButtonPrimary]}
                      onPress={() => handleViewSubmissions(a)}
                    >
                      <Text style={[styles.actionButtonText, styles.actionButtonTextPrimary]}>
                        Xem bài nộp
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Chưa có bài tập.</Text>
            )}
          </View>
        )}

        {tab === 'documents' && (
          <View style={{ marginTop: 0 }}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Tài liệu ({detail.documents?.length || 0})
              </Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => {
                  setDocumentForm({ title: '', description: '' });
                  setSelectedDocumentFile(null);
                  setShowDocumentModal(true);
                }}
              >
                <Text style={styles.addButtonText}>+ Tải lên</Text>
              </TouchableOpacity>
            </View>
            {detail.documents && detail.documents.length > 0 ? (
              detail.documents.map(d => (
                <View key={d.id} style={styles.card}>
                  <View style={styles.documentHeader}>
                    <View style={styles.documentInfo}>
                      <Text style={styles.cardTitle}>{d.title}</Text>
                      {d.fileName && (
                        <Text style={styles.cardMeta}>
                          {d.fileName}
                          {d.fileSize
                            ? ` • ${(d.fileSize / 1024).toFixed(1)} KB`
                            : ''}
                        </Text>
                      )}
                      {d.uploadedAt && (
                        <Text style={styles.cardMeta}>
                          Tải lên: {formatDate(d.uploadedAt)}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.deleteIconButton}
                      onPress={() => handleDeleteDocument(d.id)}
                    >
                      <Text style={styles.deleteIconText}>×</Text>
                    </TouchableOpacity>
                  </View>
                  {d.fileUrl && (
                    <TouchableOpacity
                      style={styles.linkButton}
                      onPress={() => {
                        const url = d.fileUrl!.startsWith('http')
                          ? d.fileUrl!
                          : `${BACKEND_URL}${d.fileUrl}`;
                        Linking.openURL(url).catch(err =>
                          console.warn('Không thể mở file:', err),
                        );
                      }}
                    >
                      <Text style={styles.linkButtonText}>Mở tài liệu</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Chưa có tài liệu.</Text>
            )}
          </View>
        )}

        {tab === 'announcements' && (
          <View style={{ marginTop: 0 }}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Thông báo ({detail.announcements?.length || 0})
              </Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => {
                  setNotificationForm({ title: '', content: '', type: 'general' });
                  setShowNotificationModal(true);
                }}
              >
                <Text style={styles.addButtonText}>+ Tạo thông báo</Text>
              </TouchableOpacity>
            </View>
            {detail.announcements && detail.announcements.length > 0 ? (
              detail.announcements.map(a => (
                <View key={a.id} style={styles.card}>
                  <View style={styles.announcementHeader}>
                    <Text style={styles.cardTitle}>{a.title}</Text>
                    <TouchableOpacity
                      style={styles.deleteIconButton}
                      onPress={() => handleDeleteAnnouncement(a.id)}
                    >
                      <Text style={styles.deleteIconText}>×</Text>
                    </TouchableOpacity>
                  </View>
                  {a.createdAt && (
                    <Text style={styles.cardMeta}>{formatDate(a.createdAt)}</Text>
                  )}
                  {a.content && (
                    <Text style={styles.cardBody}>{a.content}</Text>
                  )}
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Chưa có thông báo.</Text>
            )}
          </View>
        )}

        {tab === 'comments' && (
          <View style={{ marginTop: 0 }}>
            <Text style={styles.sectionTitle}>
              Bình luận ({detail.comments?.length || 0})
            </Text>
            {detail.comments && detail.comments.length > 0 ? (
              detail.comments.map(c => (
                <View key={c.id} style={styles.commentItem}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentAuthor}>
                      {c.author || 'Không rõ'}
                    </Text>
                    {c.createdAt && (
                      <Text style={styles.commentDate}>{formatDate(c.createdAt)}</Text>
                    )}
                  </View>
                  <Text style={styles.commentContent}>{c.content}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Chưa có bình luận.</Text>
            )}

            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Nhập bình luận..."
                value={newComment}
                onChangeText={setNewComment}
                multiline
                returnKeyType="default"
                blurOnSubmit={false}
              />
              <TouchableOpacity
                style={[
                  styles.commentSendButton,
                  (!newComment.trim() || sendingComment) && { opacity: 0.5 },
                ]}
                disabled={!newComment.trim() || sendingComment}
                onPress={handleSendComment}
              >
                <Text style={styles.commentSendButtonText}>
                  {sendingComment ? 'Đang gửi...' : 'Gửi'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Remove Student Modal */}
      <Modal
        visible={showRemoveStudentModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowRemoveStudentModal(false);
          setStudentToRemove(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <Text style={styles.confirmModalTitle}>Xác nhận xóa sinh viên</Text>
            <Text style={styles.confirmModalText}>
              Bạn có chắc chắn muốn xóa sinh viên <Text style={styles.confirmModalBold}>{studentToRemove?.name}</Text> khỏi lớp{' '}
              <Text style={styles.confirmModalBold}>{detail?.name}</Text>?
            </Text>
            <View style={styles.confirmModalActions}>
              <TouchableOpacity
                style={styles.confirmModalCancel}
                onPress={() => {
                  setShowRemoveStudentModal(false);
                  setStudentToRemove(null);
                }}
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

      {/* Create Assignment Modal */}
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
              <Text style={styles.modalTitle}>Tạo bài tập mới</Text>
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
                    onChangeText={value => setAssignmentForm(prev => ({ ...prev, description: value }))}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Hạn nộp * (YYYY-MM-DD HH:mm:ss)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ví dụ: 2025-06-01 23:59:59"
                    value={assignmentForm.dueDate}
                    onChangeText={value => setAssignmentForm(prev => ({ ...prev, dueDate: value }))}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Thời gian bắt đầu (YYYY-MM-DD HH:mm:ss)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ví dụ: 2025-05-30 08:00:00"
                    value={assignmentForm.startAt}
                    onChangeText={value => setAssignmentForm(prev => ({ ...prev, startAt: value }))}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <View style={styles.checkboxRow}>
                    <TouchableOpacity
                      style={styles.checkbox}
                      onPress={() => setAssignmentForm(prev => ({ ...prev, isExam: !prev.isExam }))}
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
                    <>
                      <Text style={styles.inputLabel}>Thời gian làm bài (phút) *</Text>
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
                    </>
                  )}
                </View>
              </ScrollView>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={handleCreateAssignment}
                >
                  <Text style={styles.modalButtonText}>Tạo</Text>
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

      {/* Edit Assignment Modal */}
      <Modal
        visible={showEditAssignmentModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowEditAssignmentModal(false);
          setEditingAssignment(null);
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Sửa bài tập</Text>
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
                    onChangeText={value => setAssignmentForm(prev => ({ ...prev, description: value }))}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Hạn nộp * (YYYY-MM-DD HH:mm:ss)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ví dụ: 2025-06-01 23:59:59"
                    value={assignmentForm.dueDate}
                    onChangeText={value => setAssignmentForm(prev => ({ ...prev, dueDate: value }))}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Thời gian bắt đầu (YYYY-MM-DD HH:mm:ss)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ví dụ: 2025-05-30 08:00:00"
                    value={assignmentForm.startAt}
                    onChangeText={value => setAssignmentForm(prev => ({ ...prev, startAt: value }))}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <View style={styles.checkboxRow}>
                    <TouchableOpacity
                      style={styles.checkbox}
                      onPress={() => setAssignmentForm(prev => ({ ...prev, isExam: !prev.isExam }))}
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
                    <>
                      <Text style={styles.inputLabel}>Thời gian làm bài (phút) *</Text>
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
                    </>
                  )}
                </View>
              </ScrollView>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={handleUpdateAssignment}
                >
                  <Text style={styles.modalButtonText}>Lưu</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => {
                    setShowEditAssignmentModal(false);
                    setEditingAssignment(null);
                  }}
                >
                  <Text style={styles.modalCancelText}>Hủy</Text>
                </TouchableOpacity>
              </View>
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
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
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setShowGradingModal(false);
                  setSelectedSubmission(null);
                  setGradingData({ grade: '', comment: '' });
                }}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButton} onPress={handleSubmitGrade}>
                <Text style={styles.modalButtonText}>Lưu điểm</Text>
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
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.secondary,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: 4,
    paddingBottom: 8,
    marginBottom: 0,
  },
  tabButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
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
  },
  tabButtonTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    marginTop: 0,
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
  },
  infoValue: {
    fontSize: 14,
    color: colors.secondary,
    fontWeight: '600',
  },
  descriptionBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.surface,
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
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.secondary,
    marginBottom: 4,
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
  studentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
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
  studentMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.primaryLight,
    borderRadius: 6,
    marginLeft: 12,
  },
  removeButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.secondary,
    marginBottom: 4,
  },
  cardBody: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  cardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardMeta: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  examBadge: {
    marginTop: 4,
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
  },
  actionButtonPrimary: {
    backgroundColor: colors.primary,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  actionButtonTextPrimary: {
    color: '#fff',
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  documentInfo: {
    flex: 1,
  },
  deleteIconButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  deleteIconText: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '700',
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  linkButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  linkButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 8,
  },
  commentItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary,
  },
  commentDate: {
    fontSize: 11,
    color: colors.textSecondary,
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
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  commentInput: {
    minHeight: 40,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    fontSize: 14,
    marginBottom: 8,
  },
  commentSendButton: {
    alignSelf: 'flex-end',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.primary,
  },
  commentSendButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
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
});

export default TeacherClassDetailScreen;

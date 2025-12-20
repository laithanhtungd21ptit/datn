import React, { useCallback, useMemo, useState } from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { api } from '../../api/client';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../../theme/colors';

type ClassDetail = {
  id: string;
  name: string;
  code: string;
  teacher?: string;
  students?: number;
  announcements?: Array<{
    id: string;
    title: string;
    date: string;
    content: string;
  }>;
  documents?: Array<{
    id: string;
    title: string;
    fileName: string;
    fileUrl: string;
    uploadedAt: string;
    fileSize?: number;
  }>;
};

type Assignment = {
  id: string;
  title: string;
  dueDate?: string;
  status?: string;
};

type Comment = {
  id: string;
  author: string;
  content: string;
  time: string;
  role: 'teacher' | 'student';
};

const StudentClassDetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<{ params: { id: string } }, 'params'>>();
  const classId = route.params?.id;

  const [classData, setClassData] = useState<ClassDetail | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'announcements', title: 'Thông báo' },
    { key: 'documents', title: 'Tài liệu' },
    { key: 'assignments', title: 'Bài tập' },
    { key: 'comments', title: 'Bình luận' },
  ]);

  const loadData = useCallback(async () => {
    if (!classId) return;
    try {
      const [detail, classAssignments, classComments] = await Promise.all([
        api.studentClassDetail(classId),
        api.studentClassAssignments(classId),
        api.studentGetComments(classId),
      ]);
      setClassData(detail);
      setAssignments(classAssignments || []);
      setComments(classComments || []);
    } catch (e) {
      console.warn('Không thể tải chi tiết lớp', e);
    }
  }, [classId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleAddComment = async () => {
    if (!newComment.trim() || !classId) return;
    try {
      const comment = await api.studentCreateComment(classId, {
        content: newComment.trim(),
      });
      setComments(prev => [comment, ...prev]);
      setNewComment('');
    } catch (e) {
      console.warn('Không thể gửi bình luận', e);
    }
  };

  const AnnouncementsRoute = () => (
    <ScrollView style={styles.tabContainer}>
      {(classData?.announcements || []).map(item => (
        <View key={item.id} style={styles.listCard}>
          <Text style={styles.listTitle}>{item.title}</Text>
          <Text style={styles.listMeta}>{item.date}</Text>
          <Text style={styles.listBody}>{item.content}</Text>
        </View>
      ))}
      {(!classData?.announcements || classData.announcements.length === 0) && (
        <Text style={styles.emptyText}>Chưa có thông báo.</Text>
      )}
    </ScrollView>
  );

  const DocumentsRoute = () => (
    <ScrollView style={styles.tabContainer}>
      {(classData?.documents || []).map(doc => (
        <TouchableOpacity
          key={doc.id}
          style={styles.listCard}
          onPress={() => {
            if (doc.fileUrl?.startsWith('http')) {
              Linking.openURL(doc.fileUrl);
            }
          }}
        >
          <Text style={styles.listTitle}>{doc.title}</Text>
          <Text style={styles.listMeta}>
            {doc.fileName} •{' '}
            {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : ''}
          </Text>
          <Text style={styles.listBody}>
            Tải lên: {new Date(doc.uploadedAt).toLocaleDateString('vi-VN')}
          </Text>
        </TouchableOpacity>
      ))}
      {(!classData?.documents || classData.documents.length === 0) && (
        <Text style={styles.emptyText}>Chưa có tài liệu.</Text>
      )}
    </ScrollView>
  );

  const AssignmentsRoute = () => (
    <ScrollView style={styles.tabContainer}>
      {assignments.map(item => (
        <View key={item.id} style={styles.listCard}>
          <Text style={styles.listTitle}>{item.title}</Text>
          <Text style={styles.listMeta}>
            Hạn:{' '}
            {item.dueDate
              ? new Date(item.dueDate).toLocaleDateString('vi-VN')
              : 'Chưa rõ'}
          </Text>
          <Text style={styles.statusPill}>{item.status || 'Chưa nộp'}</Text>
        </View>
      ))}
      {assignments.length === 0 && (
        <Text style={styles.emptyText}>Chưa có bài tập.</Text>
      )}
    </ScrollView>
  );

  const CommentsRoute = () => (
    <View style={[styles.tabContainer, { flex: 1 }]}>
      <ScrollView>
        {comments.map(comment => (
          <View key={comment.id} style={styles.commentCard}>
            <View style={styles.commentHeader}>
              <Text style={styles.commentAuthor}>{comment.author}</Text>
              <Text style={styles.commentRole}>
                {comment.role === 'teacher' ? 'Giảng viên' : 'Sinh viên'}
              </Text>
            </View>
            <Text style={styles.commentTime}>{comment.time}</Text>
            <Text style={styles.commentBody}>{comment.content}</Text>
          </View>
        ))}
        {comments.length === 0 && (
          <Text style={styles.emptyText}>Chưa có bình luận.</Text>
        )}
      </ScrollView>
      <View style={styles.commentInputRow}>
        <TextInput
          style={styles.commentInput}
          placeholder="Đặt câu hỏi cho giảng viên..."
          multiline
          value={newComment}
          onChangeText={setNewComment}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            !newComment.trim() && { opacity: 0.5 },
          ]}
          disabled={!newComment.trim()}
          onPress={handleAddComment}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Gửi</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderScene = SceneMap({
    announcements: AnnouncementsRoute,
    documents: DocumentsRoute,
    assignments: AssignmentsRoute,
    comments: CommentsRoute,
  });

  const renderTabBar = (props: any) => (
    <TabBar
      {...props}
      scrollEnabled
      indicatorStyle={{ backgroundColor: colors.primary }}
      style={{ backgroundColor: colors.surface }}
      labelStyle={{
        color: colors.secondary,
        fontWeight: '600',
        textTransform: 'none',
      }}
      inactiveColor={colors.textSecondary}
    />
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{classData?.name || 'Chi tiết lớp học'}</Text>
      <Text style={styles.subtitle}>
        Mã lớp: {classData?.code} • GV: {classData?.teacher || 'Chưa cập nhật'}
      </Text>
      <View style={styles.overviewRow}>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewValue}>
            {classData?.students || '--'}
          </Text>
          <Text style={styles.overviewLabel}>Sinh viên</Text>
        </View>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewValue}>
            {classData?.announcements?.length || '--'}
          </Text>
          <Text style={styles.overviewLabel}>Thông báo</Text>
        </View>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewValue}>
            {classData?.documents?.length || '--'}
          </Text>
          <Text style={styles.overviewLabel}>Tài liệu</Text>
        </View>
      </View>

      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        renderTabBar={renderTabBar}
        style={{ marginTop: 12 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.secondary,
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: 4,
  },
  overviewRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  overviewValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.secondary,
  },
  overviewLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  tabContainer: {
    padding: 16,
  },
  listCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.secondary,
  },
  listMeta: {
    color: colors.textSecondary,
    marginTop: 4,
  },
  listBody: {
    marginTop: 10,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  statusPill: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    color: colors.primaryDark,
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: 30,
  },
  commentCard: {
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentAuthor: {
    fontWeight: '600',
    color: colors.secondary,
  },
  commentRole: {
    fontSize: 12,
    color: colors.primary,
  },
  commentTime: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  commentBody: {
    marginTop: 6,
    color: colors.textSecondary,
  },
  commentInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
    marginTop: 12,
  },
  commentInput: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff7f8',
  },
  sendButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
});

export default StudentClassDetailScreen;


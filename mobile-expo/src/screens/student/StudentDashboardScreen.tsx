import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api, StudentDashboardResponse } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../theme/colors';

type Stat = {
  label: string;
  value: number;
  color: string;
};

type Assignment = {
  id: string;
  title: string;
  class: string;
  dueDate: string;
  description?: string;
  teacher?: string;
};

type Exam = {
  id: string;
  title: string;
  class: string;
  startAt: string;
  duration?: number;
  description?: string;
  teacher?: string;
};

type GradeItem = {
  id: string;
  assignment: string;
  class: string;
  score?: number;
  maxGrade?: number;
  gradedAt?: string;
  notes?: string;
  teacher?: string;
};

const StudentDashboardScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState<Stat[]>([
    { label: 'Lớp học', value: 0, color: colors.primary },
    { label: 'Đã nộp', value: 0, color: colors.success },
    { label: 'Chưa nộp', value: 0, color: colors.warning },
    { label: 'Chờ chấm', value: 0, color: colors.secondary },
  ]);
  const [upcomingAssignments, setUpcomingAssignments] = useState<Assignment[]>([]);
  const [upcomingExams, setUpcomingExams] = useState<Exam[]>([]);
  const [showAllAssignments, setShowAllAssignments] = useState(false);
  const [showAllExams, setShowAllExams] = useState(false);
  const [recentGrades, setRecentGrades] = useState<GradeItem[]>([]);
  const [showAllGrades, setShowAllGrades] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    type: 'assignment' | 'exam' | 'grade';
    title: string;
    class?: string;
    teacher?: string;
    dateLabel: string;
    dateValue?: string;
    description?: string;
    duration?: number;
    score?: number;
    maxGrade?: number;
  } | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data: StudentDashboardResponse = await api.studentDashboard();
      if (data?.stats) {
        const submitted = data.stats.submittedAssignments || 0;
        const total = data.stats.totalAssignments || 0;
        const graded = data.stats.gradedAssignments || 0;
        setStats([
          {
            label: 'Lớp học',
            value: data.stats.enrolledClasses || data.stats.totalClasses || 0,
            color: colors.primary,
          },
          {
            label: 'Đã nộp',
            value: submitted,
            color: colors.success,
          },
          {
            label: 'Chưa nộp',
            value: Math.max(total - submitted, 0),
            color: colors.warning,
          },
          {
            label: 'Chờ chấm',
            value: Math.max(submitted - graded, 0),
            color: colors.secondary,
          },
        ]);
      }

      if (Array.isArray(data?.upcomingDeadlines)) {
        setShowAllAssignments(false);
        setUpcomingAssignments(
          data.upcomingDeadlines.map((item, index) => ({
            id: String(item.id || index),
            title: item.title || 'Bài tập',
            class: item.class || item.subject || 'Không rõ lớp',
            dueDate: item.dueDate || item.deadline || '',
            description: item.description,
            teacher: item.teacher,
          })),
        );
      } else {
        setUpcomingAssignments([]);
      }

      if (Array.isArray(data?.upcomingExams)) {
        setShowAllExams(false);
        setUpcomingExams(
          data.upcomingExams.map((item, index) => ({
            id: String(item.id || index),
            title: item.title || 'Kỳ thi',
            class: item.class || 'Không rõ lớp',
            startAt: item.startAt || item.deadline || '',
            duration: item.duration || item.durationMinutes,
            description: item.description,
            teacher: item.teacher,
          })),
        );
      } else {
        setUpcomingExams([]);
      }

      if (Array.isArray(data?.grades)) {
        setShowAllGrades(false);
        setRecentGrades(
          data.grades.map((item, index) => ({
            id: String(item.id || index),
            assignment: item.assignment || 'Bài tập',
            class: item.class || 'Không rõ lớp',
            score: item.score ?? undefined,
            maxGrade: item.maxGrade ?? undefined,
            gradedAt: item.gradedAt ?? item.submittedAt,
            notes: item.comment || item.notes,
            teacher: item.teacher,
          })),
        );
      } else {
        setRecentGrades([]);
      }
    } catch (error) {
      console.warn('Không thể tải dashboard:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={loadDashboard} />
      }
    >
      <Text style={styles.title}>Chào, {user?.fullName || 'Sinh viên'}</Text>
      <Text style={styles.subtitle}>
        Đây là tổng quan ngắn gọn về quá trình học tập của bạn.
      </Text>

      <View style={styles.statsRow}>
        {stats.map(stat => (
          <View key={stat.label} style={styles.statCard}>
            <Text style={[styles.statLabel, { color: stat.color }]}>
              {stat.label}
            </Text>
            <Text style={styles.statValue}>{stat.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bài tập sắp đến hạn</Text>
        {upcomingAssignments.length === 0 ? (
          <Text style={styles.emptyText}>Không có bài tập nào trong 7 ngày.</Text>
        ) : (
          (showAllAssignments ? upcomingAssignments : upcomingAssignments.slice(0, 4)).map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.assignmentCard}
              activeOpacity={0.9}
              onPress={() =>
                setSelectedItem({
                  type: 'assignment',
                  title: item.title,
                  class: item.class,
                  teacher: item.teacher,
                  dateLabel: 'Hạn chót',
                  dateValue: item.dueDate,
                  description: item.description,
                })
              }
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.assignmentTitle}>{item.title}</Text>
                <Text style={styles.assignmentClass}>{item.class}</Text>
                {item.teacher ? (
                  <Text style={styles.assignmentTeacher}>GV: {item.teacher}</Text>
                ) : null}
              </View>
              <Text style={styles.assignmentDue}>
                {item.dueDate
                  ? new Date(item.dueDate).toLocaleDateString('vi-VN')
                  : 'Chưa rõ hạn'}
              </Text>
            </TouchableOpacity>
          ))
        )}
        {upcomingAssignments.length > 4 && (
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => setShowAllAssignments(prev => !prev)}
          >
            <Text style={styles.viewAllText}>
              {showAllAssignments
                ? 'Thu gọn'
                : `Xem tất cả (${upcomingAssignments.length})`}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kỳ thi sắp diễn ra</Text>
        {upcomingExams.length === 0 ? (
          <Text style={styles.emptyText}>Không có kỳ thi nào trong 7 ngày.</Text>
        ) : (
          (showAllExams ? upcomingExams : upcomingExams.slice(0, 4)).map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.examCard}
              activeOpacity={0.9}
              onPress={() =>
                setSelectedItem({
                  type: 'exam',
                  title: item.title,
                  class: item.class,
                  teacher: item.teacher,
                  dateLabel: 'Thời gian bắt đầu',
                  dateValue: item.startAt,
                  description: item.description,
                  duration: item.duration,
                })
              }
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.assignmentTitle}>{item.title}</Text>
                <Text style={styles.assignmentClass}>{item.class}</Text>
                {item.teacher ? (
                  <Text style={styles.assignmentTeacher}>GV: {item.teacher}</Text>
                ) : null}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.assignmentDue}>
                  {item.startAt
                    ? new Date(item.startAt).toLocaleDateString('vi-VN')
                    : 'Chưa rõ thời gian'}
                </Text>
                {item.duration ? (
                  <Text style={styles.examDuration}>{item.duration} phút</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          ))
        )}
        {upcomingExams.length > 4 && (
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => setShowAllExams(prev => !prev)}
          >
            <Text style={styles.viewAllText}>
              {showAllExams ? 'Thu gọn' : `Xem tất cả (${upcomingExams.length})`}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Điểm số gần đây</Text>
        {recentGrades.length === 0 ? (
          <Text style={styles.emptyText}>Bạn chưa có điểm mới nào.</Text>
        ) : (
          (showAllGrades ? recentGrades : recentGrades.slice(0, 4)).map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.gradeCard}
              activeOpacity={0.9}
              onPress={() =>
                setSelectedItem({
                  type: 'grade',
                  title: item.assignment,
                  class: item.class,
                  teacher: item.teacher,
                  dateLabel: 'Ngày chấm',
                  dateValue: item.gradedAt,
                  description: item.notes,
                  score: item.score,
                  maxGrade: item.maxGrade,
                })
              }
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.assignmentTitle}>{item.assignment}</Text>
                <Text style={styles.assignmentClass}>{item.class}</Text>
                {item.teacher ? (
                  <Text style={styles.assignmentTeacher}>GV: {item.teacher}</Text>
                ) : null}
                {item.notes ? (
                  <Text style={styles.gradeNote}>{item.notes}</Text>
                ) : null}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.gradeScore}>
                  {item.score ?? '--'}
                  {item.maxGrade ? `/${item.maxGrade}` : ''}
                </Text>
                <Text style={styles.assignmentDue}>
                  {item.gradedAt
                    ? new Date(item.gradedAt).toLocaleDateString('vi-VN')
                    : ''}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
        {recentGrades.length > 4 && (
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => setShowAllGrades(prev => !prev)}
          >
            <Text style={styles.viewAllText}>
              {showAllGrades ? 'Thu gọn' : `Xem tất cả (${recentGrades.length})`}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {selectedItem && (
        <Modal
          transparent
          animationType="fade"
          visible
          onRequestClose={() => setSelectedItem(null)}
        >
          <TouchableOpacity
            style={styles.detailOverlay}
            activeOpacity={1}
            onPress={() => setSelectedItem(null)}
          >
            <View style={styles.detailModal}>
              <Text style={styles.detailTitle}>{selectedItem.title}</Text>
              {selectedItem.class ? (
                <Text style={styles.detailMeta}>Lớp: {selectedItem.class}</Text>
              ) : null}
              {selectedItem.teacher ? (
                <Text style={styles.detailMeta}>Giảng viên: {selectedItem.teacher}</Text>
              ) : null}
              <Text style={styles.detailMeta}>
                {selectedItem.dateLabel}:{' '}
                {selectedItem.dateValue
                  ? new Date(selectedItem.dateValue).toLocaleString('vi-VN')
                  : 'Chưa rõ'}
              </Text>
              {selectedItem.type === 'exam' && selectedItem.duration ? (
                <Text style={styles.detailMeta}>
                  Thời lượng: {selectedItem.duration} phút
                </Text>
              ) : null}
              {selectedItem.type === 'grade' && (
                <Text style={styles.detailMeta}>
                  Điểm: {selectedItem.score ?? '--'}
                  {selectedItem.maxGrade ? `/${selectedItem.maxGrade}` : ''}
                </Text>
              )}
              {selectedItem.type === 'grade' ? (
                <Text style={styles.detailContent}>
                  {selectedItem.description?.trim()
                    ? `Nhận xét: ${selectedItem.description}`
                    : 'Không có nhận xét.'}
                </Text>
              ) : (
                <Text style={styles.detailContent}>
                  {selectedItem.description?.trim()
                    ? selectedItem.description
                    : 'Không có mô tả chi tiết.'}
                </Text>
              )}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedItem(null)}
              >
                <Text style={styles.closeButtonText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.secondary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flexBasis: '48%',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  statLabel: {
    fontSize: 14,
    marginBottom: 8,
    color: colors.textSecondary,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.secondary,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: colors.secondary,
  },
  emptyText: {
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  assignmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#fff7f8',
  },
  assignmentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.secondary,
  },
  assignmentClass: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  assignmentTeacher: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  assignmentDue: {
    fontSize: 13,
    color: colors.secondary,
    marginLeft: 12,
  },
  examCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: colors.surface,
  },
  examDuration: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  viewAllButton: {
    marginTop: 8,
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  viewAllText: {
    color: colors.primary,
    fontWeight: '600',
  },
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  detailModal: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    width: '100%',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.secondary,
    marginBottom: 8,
  },
  detailMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  detailContent: {
    marginTop: 12,
    color: colors.secondary,
    lineHeight: 20,
  },
  closeButton: {
    marginTop: 16,
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  gradeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.primaryLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: colors.surface,
  },
  gradeScore: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  gradeNote: {
    marginTop: 4,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});

export default StudentDashboardScreen;


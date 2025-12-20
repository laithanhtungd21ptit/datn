import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../../api/client';
import { colors } from '../../theme/colors';

type AdminSystemStats = {
  users?: number;
  teachers?: number;
  students?: number;
  admins?: number;
  classes?: number;
  assignments?: number;
  enrollments?: number;
  submissions?: number;
  totalUsers?: number;
  totalStudents?: number;
  totalTeachers?: number;
  totalClasses?: number;
  totalAssignments?: number;
  activeSessions?: number;
};

type ActivityItem = {
  id: string;
  message: string;
  createdAt: string;
  actor?: string;
};

const AdminDashboardScreen: React.FC = () => {
  const [system, setSystem] = useState<AdminSystemStats>({});
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activityPage, setActivityPage] = useState(1);
  const pageSize = 10;

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [dashboardData, activitiesData] = await Promise.all([
        api.adminDashboard?.(),
        api.adminGetActivities?.(50),
      ]);

      if (dashboardData?.system || dashboardData?.stats) {
        setSystem(prev => ({
          ...prev,
          ...dashboardData?.system,
          totalUsers:
            dashboardData?.stats?.totalUsers ??
            dashboardData?.system?.users ??
            prev.totalUsers,
          totalStudents:
            dashboardData?.stats?.totalStudents ??
            dashboardData?.system?.students ??
            prev.totalStudents,
          totalTeachers:
            dashboardData?.stats?.totalTeachers ??
            dashboardData?.system?.teachers ??
            prev.totalTeachers,
          totalClasses:
            dashboardData?.stats?.totalClasses ??
            dashboardData?.system?.classes ??
            prev.totalClasses,
          totalAssignments:
            dashboardData?.stats?.totalAssignments ??
            dashboardData?.system?.assignments ??
            prev.totalAssignments,
          activeSessions:
            dashboardData?.stats?.activeSessions ?? prev.activeSessions,
        }));
      }

      const fetchedActivities = Array.isArray(activitiesData)
        ? activitiesData
        : Array.isArray((activitiesData as any)?.items)
          ? (activitiesData as any).items
          : [];
      const fallbackActivities = Array.isArray(dashboardData?.activities)
        ? dashboardData?.activities
        : Array.isArray((dashboardData as any)?.activities?.items)
          ? (dashboardData as any)?.activities?.items
          : [];

      const activitySource =
        (fetchedActivities.length > 0 ? fetchedActivities : fallbackActivities) ||
        [];

      setActivities(
        activitySource.map((item: any, index: number) => ({
          id: item.id || item._id || String(index),
          message: item.message || item.description || '',
          createdAt: item.createdAt || item.time || item.timestamp || '',
          actor: item.actor || item.user || item.username || 'Hệ thống',
        })),
      );
      setActivityPage(1);
    } catch (error) {
      console.warn('Không thể tải dashboard admin:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const pagedActivities = useMemo(() => {
    const start = (activityPage - 1) * pageSize;
    return activities.slice(start, start + pageSize);
  }, [activities, activityPage]);

  const totalPages = Math.max(1, Math.ceil(activities.length / pageSize));

  const statCards = [
    {
      label: 'Tổng tài khoản',
      value: system.totalUsers ?? system.users,
      highlight: true,
    },
    { label: 'Sinh viên', value: system.totalStudents ?? system.students },
    { label: 'Giảng viên', value: system.totalTeachers ?? system.teachers },
    { label: 'Lớp học', value: system.totalClasses ?? system.classes },
    { label: 'Bài tập', value: system.totalAssignments ?? system.assignments },
    { label: 'Nộp bài', value: system.submissions },
  ];

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadDashboard} />
      }
    >
      <Text style={styles.title}>Dashboard quản trị</Text>
      <Text style={styles.subtitle}>
        Theo dõi nhanh số liệu hệ thống và hoạt động gần đây.
      </Text>

      <View style={styles.statsGrid}>
        {statCards.map(card => (
          <View
            key={card.label}
            style={[styles.statCard, card.highlight && styles.statCardHighlight]}
          >
            <Text style={styles.statLabel}>{card.label}</Text>
            <Text style={styles.statValue}>{card.value ?? '--'}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Hoạt động gần đây</Text>
          {activities.length > 0 && (
            <TouchableOpacity>
              <Text style={styles.viewAll}>Xem tất cả</Text>
            </TouchableOpacity>
          )}
        </View>
        {activities.length === 0 ? (
          <Text style={styles.emptyText}>Chưa có hoạt động nào.</Text>
        ) : (
          pagedActivities.map(item => (
            <View key={item.id} style={styles.activityItem}>
              <Text style={styles.activityMessage}>{item.message}</Text>
              <Text style={styles.activityMeta}>
                {item.actor} •{' '}
                {item.createdAt
                  ? new Date(item.createdAt).toLocaleString('vi-VN')
                  : ''}
              </Text>
            </View>
          ))
        )}
        {activities.length > pageSize && (
          <View style={styles.pagination}>
            <TouchableOpacity
              style={[styles.pageButton, activityPage === 1 && styles.pageButtonDisabled]}
              onPress={() => setActivityPage(prev => Math.max(1, prev - 1))}
              disabled={activityPage === 1}
            >
              <Text style={styles.pageButtonText}>Trước</Text>
            </TouchableOpacity>
            <Text style={styles.pageIndicator}>
              {activityPage}/{totalPages}
            </Text>
            <TouchableOpacity
              style={[
                styles.pageButton,
                activityPage === totalPages && styles.pageButtonDisabled,
              ]}
              onPress={() => setActivityPage(prev => Math.min(totalPages, prev + 1))}
              disabled={activityPage === totalPages}
            >
              <Text style={styles.pageButtonText}>Tiếp</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flexBasis: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1e0e0',
  },
  statCardHighlight: {
    backgroundColor: '#fdecee',
    borderColor: '#f5cdd1',
  },
  statLabel: {
    color: '#475569',
    fontSize: 13,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ad171c',
    marginTop: 6,
  },
  section: {
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1e0e0',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  viewAll: {
    color: colors.primary,
    fontWeight: '600',
  },
  activityItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  activityMessage: {
    color: '#0f172a',
    fontWeight: '600',
  },
  activityMeta: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  pageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  pageButtonDisabled: {
    opacity: 0.4,
  },
  pageButtonText: {
    color: colors.primary,
    fontWeight: '600',
  },
  pageIndicator: {
    color: colors.secondary,
    fontWeight: '600',
  },
});

export default AdminDashboardScreen;


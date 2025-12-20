import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../../api/client';
import { colors } from '../../theme/colors';

type TeacherStats = {
  classes?: number;
  assignments?: number;
  exams?: number;
};

type Notification = {
  id: string;
  title: string;
  time?: string;
  type?: 'success' | 'warning' | 'info';
  content?: string;
};

type ScheduleItem = {
  id: string;
  time: string;
  subject: string;
  class: string;
  room?: string;
  description?: string;
};

const TeacherDashboardScreen: React.FC = () => {
  const [stats, setStats] = useState<TeacherStats>({});
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [showAllSchedule, setShowAllSchedule] = useState(false);
  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);

  const closeNotificationModal = () => setSelectedNotification(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.teacherDashboard?.();
      if (data?.stats) {
        setStats({
          classes: data.stats.classes,
          assignments: data.stats.assignments,
          exams: data.stats.exams,
        });
      }
      if (Array.isArray(data?.notifications)) {
        setNotifications(
          data.notifications.map((item: any) => ({
            id: item.id || String(Math.random()),
            title: item.title || item.message || '',
            time: item.time || item.createdAt || '',
            type: item.type || 'info',
            content: item.content || item.description || '',
          })),
        );
      }
      if (Array.isArray(data?.schedule)) {
        setSchedule(
          data.schedule.map((item: any) => ({
            id: item.id || String(Math.random()),
            time: item.time || '',
            subject: item.subject || '',
            class: item.class || item.className || '',
            room: item.room,
            description: item.description,
          })),
        );
      }
    } catch (error) {
      console.warn('Không thể tải dashboard giáo viên:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const displayedNotifications = showAllNotifications
    ? notifications
    : notifications.slice(0, 3);
  const displayedSchedule = showAllSchedule ? schedule : schedule.slice(0, 3);

  const statCards = [
    { label: 'Tổng lớp học', value: stats.classes ?? 0 },
    { label: 'Bài tập chưa chấm', value: stats.assignments ?? 0 },
    { label: 'Kỳ thi', value: stats.exams ?? 0 },
  ];

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadDashboard} />
      }
    >
      <Text style={styles.title}>Dashboard Giảng viên</Text>
      <Text style={styles.subtitle}>
        Chào mừng bạn trở lại! Đây là tổng quan về hoạt động giảng dạy của bạn.
      </Text>

      <View style={styles.statsGrid}>
        {statCards.map((card, index) => (
          <View key={index} style={styles.statCard}>
            <Text style={styles.statValue}>{card.value}</Text>
            <Text style={styles.statLabel}>{card.label}</Text>
          </View>
        ))}
      </View>

      {notifications.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Thông báo gần đây</Text>
            {notifications.length > 3 && (
              <TouchableOpacity
                onPress={() => setShowAllNotifications(!showAllNotifications)}
              >
                <Text style={styles.viewAll}>
                  {showAllNotifications ? 'Thu gọn' : `Xem tất cả (${notifications.length})`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {displayedNotifications.map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.notificationItem}
              activeOpacity={0.7}
              onPress={() => setSelectedNotification(item)}
            >
              <View style={styles.notificationHeader}>
                <Text style={styles.notificationTitle}>{item.title}</Text>
                <View
                  style={[
                    styles.notificationBadge,
                    item.type === 'success' && styles.badgeSuccess,
                    item.type === 'warning' && styles.badgeWarning,
                    item.type === 'info' && styles.badgeInfo,
                  ]}
                />
              </View>
              {item.time && (
                <Text style={styles.notificationTime}>{item.time}</Text>
              )}
              {item.content && (
                <Text style={styles.notificationContent} numberOfLines={2}>
                  {item.content}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {schedule.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Lịch dạy hôm nay</Text>
            {schedule.length > 3 && (
              <TouchableOpacity
                onPress={() => setShowAllSchedule(!showAllSchedule)}
              >
                <Text style={styles.viewAll}>
                  {showAllSchedule ? 'Thu gọn' : `Xem tất cả (${schedule.length})`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {displayedSchedule.map(item => (
            <View key={item.id} style={styles.scheduleItem}>
              <View style={styles.scheduleTime}>
                <Text style={styles.scheduleTimeText}>{item.time}</Text>
              </View>
              <View style={styles.scheduleContent}>
                <Text style={styles.scheduleSubject}>{item.subject}</Text>
                <Text style={styles.scheduleClass}>{item.class}</Text>
                {item.room && (
                  <Text style={styles.scheduleRoom}>Phòng: {item.room}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {!loading && notifications.length === 0 && schedule.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Chưa có dữ liệu</Text>
        </View>
      )}

      <Modal
        transparent
        visible={!!selectedNotification}
        animationType="fade"
        onRequestClose={closeNotificationModal}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalBackdrop}
          onPress={closeNotificationModal}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedNotification?.title || 'Thông báo'}
            </Text>
            {selectedNotification?.time && (
              <Text style={styles.modalTime}>{selectedNotification.time}</Text>
            )}
            {selectedNotification?.content ? (
              <Text style={styles.modalBody}>{selectedNotification.content}</Text>
            ) : (
              <Text style={styles.modalBodyMuted}>
                Không có nội dung chi tiết
              </Text>
            )}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={closeNotificationModal}
            >
              <Text style={styles.modalCloseText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flexBasis: '31%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    marginTop: 8,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.secondary,
  },
  viewAll: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  notificationItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.secondary,
  },
  notificationBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  badgeSuccess: {
    backgroundColor: colors.success,
  },
  badgeWarning: {
    backgroundColor: colors.warning,
  },
  badgeInfo: {
    backgroundColor: colors.primary,
  },
  notificationTime: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  notificationContent: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  scheduleItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  scheduleTime: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleTimeText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  scheduleContent: {
    flex: 1,
  },
  scheduleSubject: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.secondary,
  },
  scheduleClass: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  scheduleRoom: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.secondary,
  },
  modalTime: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textSecondary,
  },
  modalBody: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  modalBodyMuted: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  modalCloseButton: {
    marginTop: 20,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default TeacherDashboardScreen;

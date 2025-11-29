import React, { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Pressable,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api/client';
import { colors } from '../theme/colors';

type TeacherNotification = {
  id: string;
  title: string;
  content?: string;
  sender?: string;
  class?: string;
  time?: string;
  type?: string;
  isRead?: boolean;
};

const TeacherNotificationsButton: React.FC = () => {
  const [notifications, setNotifications] = useState<TeacherNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState<TeacherNotification | null>(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.teacherNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.warn('Failed to load notifications', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications]),
  );

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.isRead).length,
    [notifications],
  );

  const handleOpen = () => {
    setVisible(true);
  };

  const handleClose = () => {
    setVisible(false);
    setSelected(null);
  };

  const handleSelect = async (item: TeacherNotification) => {
    setSelected(item);
    if (!item.isRead) {
      try {
        await api.teacherMarkNotificationRead(item.id);
        // Reload notifications from server to ensure sync
        const data = await api.teacherNotifications();
        setNotifications(Array.isArray(data) ? data : []);
      } catch (error) {
        console.warn('Failed to mark notification read', error);
      }
    }
  };

  const handleMarkAll = async () => {
    try {
      await api.teacherMarkAllNotificationsRead();
      // Reload notifications from server to ensure sync
      const data = await api.teacherNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.warn('Failed to mark all notifications', error);
    }
  };

  return (
    <>
      <TouchableOpacity style={styles.button} onPress={handleOpen}>
        <Ionicons name="notifications-outline" size={22} color={colors.secondary} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
        <Pressable style={styles.modalOverlay} onPress={handleClose}>
          <TouchableWithoutFeedback>
            <View style={styles.dropdownCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thông báo</Text>
              <View style={styles.modalHeaderActions}>
                {notifications.some(n => !n.isRead) && (
                  <TouchableOpacity onPress={handleMarkAll}>
                    <Text style={styles.markAll}>Đánh dấu tất cả đã đọc</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={handleClose}>
                  <Ionicons name="close" size={20} color={colors.secondary} />
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView style={styles.dropdownList}>
              {loading ? (
                <Text style={styles.empty}>Đang tải...</Text>
              ) : notifications.length === 0 ? (
                <Text style={styles.empty}>Không có thông báo mới.</Text>
              ) : (
                notifications.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.notificationItem,
                      !item.isRead && styles.notificationUnread,
                    ]}
                    onPress={() => handleSelect(item)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.notificationTitle,
                          !item.isRead && styles.notificationTitleUnread,
                        ]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      {item.time ? (
                        <Text style={styles.notificationTime}>{item.time}</Text>
                      ) : null}
                      {item.content ? (
                        <Text style={styles.notificationSnippet} numberOfLines={2}>
                          {item.content}
                        </Text>
                      ) : null}
                    </View>
                    {!item.isRead && (
                      <View style={styles.unreadDot} />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            {selected ? (
              <View style={styles.detailBox}>
                <Text style={styles.detailTitle}>{selected.title}</Text>
                {selected.sender ? (
                  <Text style={styles.detailMeta}>Người gửi: {selected.sender}</Text>
                ) : null}
                {selected.class ? (
                  <Text style={styles.detailMeta}>Lớp: {selected.class}</Text>
                ) : null}
                {selected.time ? (
                  <Text style={styles.detailMeta}>{selected.time}</Text>
                ) : null}
                <Text style={styles.detailContent}>{selected.content || 'Không có nội dung.'}</Text>
              </View>
            ) : null}
            </View>
          </TouchableWithoutFeedback>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    marginRight: 12,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: 4,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingHorizontal: 12,
  },
  dropdownCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    width: 320,
    maxHeight: 420,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.secondary,
  },
  markAll: {
    color: colors.primary,
    fontWeight: '600',
  },
  empty: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginVertical: 20,
  },
  notificationItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownList: { maxHeight: 260 },
  notificationUnread: {
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  notificationTitle: {
    fontSize: 15,
    color: colors.secondary,
    fontWeight: '500',
  },
  notificationTitleUnread: {
    fontWeight: '700',
    color: colors.primary,
  },
  notificationTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  notificationSnippet: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  detailBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  detailMeta: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  detailContent: {
    marginTop: 10,
    color: colors.secondary,
    lineHeight: 20,
  },
});

export default TeacherNotificationsButton;


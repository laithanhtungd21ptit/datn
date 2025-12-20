import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { api } from '../../api/client';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../theme/colors';

type ClassItem = {
  id: string;
  name: string;
  teacher?: string;
  code?: string;
  description?: string;
  students?: number;
  assignments?: number;
  announcements?: number;
  documents?: number;
};

const StudentClassesScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  const loadClasses = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const result = await api.studentClasses();
      setClasses(
        (result || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          teacher: item.teacher,
          code: item.code,
          description: item.description,
          students: item.students,
          assignments: item.assignments,
          announcements: item.announcements,
          documents: item.documents,
        })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tải lớp học');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadClasses();
    }, [loadClasses]),
  );

  const handleJoinClass = async () => {
    if (!joinCode.trim()) {
      return;
    }
    setLoading(true);
    try {
      await api.studentJoinClass(joinCode.trim());
      setJoinModalVisible(false);
      setJoinCode('');
      await loadClasses();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tham gia lớp học');
    } finally {
      setLoading(false);
    }
  };

  const statsBlocks = useMemo(
    () => [
      { label: 'Lớp học', value: classes.length },
      {
        label: 'Giảng viên',
        value: new Set(classes.map(item => item.teacher)).size,
      },
      {
        label: 'Bài tập',
        value: classes.reduce((sum, item) => sum + (item.assignments || 0), 0),
      },
    ],
    [classes],
  );

  const renderClassCard = ({ item }: { item: ClassItem }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('StudentClassDetail', { id: item.id })}
      activeOpacity={0.85}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardMeta}>
            {item.code} • {item.teacher || 'Chưa có GV'}
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.students || 0}</Text>
          <Text style={styles.badgeLabel}>SV</Text>
        </View>
      </View>
      {item.description ? (
        <Text style={styles.cardDescription} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}
      <View style={styles.cardFooter}>
        <View style={styles.statPill}>
          <Text style={styles.statValue}>{item.assignments || 0}</Text>
          <Text style={styles.statLabel}>Bài tập</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statValue}>{item.documents || 0}</Text>
          <Text style={styles.statLabel}>Tài liệu</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statValue}>{item.announcements || 0}</Text>
          <Text style={styles.statLabel}>Thông báo</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Lớp học của tôi</Text>
        <TouchableOpacity
          style={styles.joinButton}
          onPress={() => setJoinModalVisible(true)}
        >
          <Text style={styles.joinButtonText}>+ Tham gia lớp</Text>
        </TouchableOpacity>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.statsRow}>
        {statsBlocks.map(block => (
          <View key={block.label} style={styles.statsCard}>
            <Text style={styles.statsValue}>{block.value}</Text>
            <Text style={styles.statsLabel}>{block.label}</Text>
          </View>
        ))}
      </View>

      <FlatList
        data={classes}
        keyExtractor={item => item.id}
        renderItem={renderClassCard}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={loadClasses} />
        }
        ListEmptyComponent={
          !isRefreshing ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Chưa có lớp nào</Text>
              <Text style={styles.emptySubtitle}>
                Nhấn “Tham gia lớp” và nhập mã do giảng viên cung cấp.
              </Text>
            </View>
          ) : null
        }
      />

      <Modal
        animationType="slide"
        transparent
        visible={joinModalVisible}
        onRequestClose={() => setJoinModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tham gia lớp học</Text>
            <Text style={styles.modalSubtitle}>
              Nhập mã được giảng viên chia sẻ để tham gia.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ví dụ: WEB001"
              autoCapitalize="characters"
              value={joinCode}
              onChangeText={setJoinCode}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancel]}
                onPress={() => setJoinModalVisible(false)}
              >
                <Text>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalPrimary,
                  !joinCode.trim() && { opacity: 0.5 },
                ]}
                disabled={!joinCode.trim() || loading}
                onPress={handleJoinClass}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalPrimaryText}>Tham gia</Text>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.secondary,
  },
  joinButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  joinButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  errorText: {
    color: '#dc2626',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statsCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  statsValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.secondary,
  },
  statsLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.secondary,
  },
  cardMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  badge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  badgeLabel: {
    fontSize: 10,
    color: colors.primaryDark,
  },
  cardDescription: {
    fontSize: 14,
    color: '#475569',
    marginTop: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  statPill: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.secondary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptyState: {
    marginTop: 40,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.secondary,
    marginBottom: 8,
  },
  emptySubtitle: {
    textAlign: 'center',
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 6,
    color: colors.secondary,
  },
  modalSubtitle: {
    color: colors.textSecondary,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
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

export default StudentClassesScreen;


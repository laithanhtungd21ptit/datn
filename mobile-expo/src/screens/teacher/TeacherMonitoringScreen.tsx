import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api } from '../../api/client';
import { colors } from '../../theme/colors';

const TeacherMonitoringScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    activeClasses: 0,
    activeStudents: 0,
    warnings: 0,
  });

  const loadMonitoring = useCallback(async () => {
    setLoading(true);
    try {
      // TODO: Implement monitoring API when backend is ready
      // const data = await api.teacherMonitoring?.();
      // setStats(data);
    } catch (error) {
      console.warn('Không thể tải dữ liệu giám sát:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMonitoring();
  }, [loadMonitoring]);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadMonitoring} />
      }
    >
      <Text style={styles.title}>Giám sát học tập</Text>
      <Text style={styles.subtitle}>
        Theo dõi hoạt động của sinh viên trong các lớp học và kỳ thi.
      </Text>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.activeClasses}</Text>
          <Text style={styles.statLabel}>Lớp đang giám sát</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.activeStudents}</Text>
          <Text style={styles.statLabel}>Sinh viên đang hoạt động</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.warnings}</Text>
          <Text style={styles.statLabel}>Cảnh báo mới</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tính năng giám sát</Text>
        <View style={styles.featureItem}>
          <Text style={styles.featureTitle}>• Theo dõi thời gian thực</Text>
          <Text style={styles.featureDescription}>
            Giám sát hoạt động của sinh viên trong quá trình làm bài thi trực tuyến
          </Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.featureTitle}>• Phát hiện bất thường</Text>
          <Text style={styles.featureDescription}>
            Cảnh báo khi phát hiện hành vi đáng ngờ như rời khỏi màn hình, có tiếng động lạ
          </Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.featureTitle}>• Báo cáo chi tiết</Text>
          <Text style={styles.featureDescription}>
            Xem lại lịch sử hoạt động và các cảnh báo đã phát hiện
          </Text>
        </View>
      </View>

      <View style={styles.noteBox}>
        <Text style={styles.noteText}>
          Tính năng này sẽ được triển khai đầy đủ khi backend hỗ trợ API giám sát.
        </Text>
      </View>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.secondary,
    marginBottom: 12,
  },
  featureItem: {
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.secondary,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  noteBox: {
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  noteText: {
    fontSize: 13,
    color: colors.secondary,
    lineHeight: 20,
  },
});

export default TeacherMonitoringScreen;


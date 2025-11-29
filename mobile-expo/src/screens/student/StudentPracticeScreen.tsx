import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

const practiceModules = [
  {
    id: 'image',
    title: 'Xử lý hình ảnh',
    description: 'Ôn tập histogram, bộ lọc, nhận dạng biên.',
  },
  {
    id: 'audio',
    title: 'Xử lý âm thanh',
    description: 'Thực hành equalizer, noise reduction.',
  },
  {
    id: 'photo',
    title: 'Nhiếp ảnh',
    description: 'Bài tập phơi sáng, bố cục.',
  },
  {
    id: 'video',
    title: 'Quay dựng video',
    description: 'Bố cục khung hình, chuyển cảnh, storyboard.',
  },
];

const StudentPracticeScreen: React.FC = () => (
  <View style={styles.container}>
    <Text style={styles.title}>Khu vực thực hành</Text>
    <Text style={styles.subtitle}>
      Chọn một module để luyện tập. Các bài tập tương tác sẽ được mở trong bản
      cập nhật tiếp theo.
    </Text>
    {practiceModules.map(module => (
      <View key={module.id} style={styles.card}>
        <Text style={styles.cardTitle}>{module.title}</Text>
        <Text style={styles.cardDescription}>{module.description}</Text>
        <View style={styles.pill}>
          <Text style={styles.pillText}>Sắp ra mắt</Text>
        </View>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  title: { fontSize: 24, fontWeight: '700', color: colors.secondary },
  subtitle: { color: colors.textSecondary, marginTop: 6, marginBottom: 20 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  cardTitle: { fontSize: 18, fontWeight: '600', color: colors.secondary },
  cardDescription: { color: colors.textSecondary, marginTop: 6 },
  pill: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillText: { color: colors.primaryDark, fontWeight: '600' },
});

export default StudentPracticeScreen;


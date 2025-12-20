import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

const StudentExamScreen: React.FC = () => (
  <View style={styles.container}>
    <Text style={styles.title}>Phòng thi</Text>
    <Text style={styles.subtitle}>
      Giao diện thi thật (camera, countdown, câu hỏi) sẽ được tích hợp sau khi
      backend final. Hiện tại hãy vào bài thi từ web để đảm bảo không gián đoạn.
    </Text>
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>Coming soon</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.secondary,
    padding: 24,
    justifyContent: 'center',
  },
  title: { fontSize: 28, fontWeight: '700', color: '#fff' },
  subtitle: { color: '#f8fafc', marginTop: 12, lineHeight: 22 },
  placeholder: {
    marginTop: 30,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.primaryLight,
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
  },
  placeholderText: { color: colors.primaryLight, fontSize: 18, fontWeight: '600' },
});

export default StudentExamScreen;


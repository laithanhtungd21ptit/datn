import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '../../theme/colors';

const TeacherMonitoringScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Hệ thống đang phát triển</Text>
        <Text style={styles.subtitle}>
          Tính năng giám sát học tập đang được phát triển và sẽ sớm ra mắt trên thiết bị di động.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.secondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default TeacherMonitoringScreen;

import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../../api/client';
import { colors } from '../../theme/colors';

const steps = ['Nhập email', 'Xác nhận mã', 'Hoàn tất'];

type Props = {
  onClose: () => void;
};

const ForgotPasswordScreen: React.FC<Props> = ({ onClose }) => {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState(0);
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmitEmail = async () => {
    if (!email.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập email');
      return;
    }
    setLoading(true);
    // Reset các trường khi bắt đầu quy trình mới
    setToken('');
    setNewPassword('');
    setConfirmPassword('');
    setInfo('');
    try {
      await api.forgotPassword(email.trim());
      setInfo('Mã xác nhận đã được gửi đến email. Vui lòng kiểm tra hộp thư.');
      setStep(1);
    } catch (error) {
      Alert.alert(
        'Lỗi',
        error instanceof Error ? error.message : 'Không thể gửi yêu cầu',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!token || !newPassword || !confirmPassword) {
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ thông tin');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Thông báo', 'Mật khẩu mới phải có ít nhất 8 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Thông báo', 'Mật khẩu mới không khớp');
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword({ token, newPassword });
      setInfo('Đặt lại mật khẩu thành công. Bạn có thể đăng nhập lại.');
      setStep(2);
      setTimeout(() => onClose(), 2000);
    } catch (error) {
      Alert.alert(
        'Lỗi',
        error instanceof Error ? error.message : 'Không thể đặt lại mật khẩu',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.card}>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.backLink}>← Quay lại đăng nhập</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Quên mật khẩu</Text>
        <Text style={styles.subtitle}>
          Làm theo các bước dưới đây để đặt lại mật khẩu của bạn.
        </Text>

        <View style={styles.stepper}>
          {steps.map((label, index) => (
            <View key={label} style={styles.stepItem}>
              <View
                style={[
                  styles.stepCircle,
                  index <= step && styles.stepCircleActive,
                ]}
              >
                <Text
                  style={[
                    styles.stepIndex,
                    index <= step && styles.stepIndexActive,
                  ]}
                >
                  {index + 1}
                </Text>
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  index <= step && styles.stepLabelActive,
                ]}
              >
                {label}
              </Text>
            </View>
          ))}
        </View>

        {info ? <Text style={styles.info}>{info}</Text> : null}

        {step === 0 && (
          <View>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
            />
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmitEmail}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Đang gửi...' : 'Gửi mã xác nhận'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 1 && (
          <View>
            <Text style={styles.label}>Mã xác nhận</Text>
            <TextInput
              style={styles.input}
              value={token}
              onChangeText={setToken}
              placeholder="Nhập mã gửi qua email"
            />
            <Text style={styles.label}>Mật khẩu mới</Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Tối thiểu 8 ký tự"
              secureTextEntry
            />
            <Text style={styles.label}>Xác nhận mật khẩu mới</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Nhập lại mật khẩu mới"
              secureTextEntry
            />
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleReset}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View style={styles.successBox}>
            <Text style={styles.successTitle}>Thành công!</Text>
            <Text style={styles.successText}>
              Mật khẩu mới đã được cập nhật. Bạn sẽ được chuyển về trang đăng
              nhập trong giây lát.
            </Text>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    elevation: 4,
  },
  backLink: {
    color: colors.primary,
    marginBottom: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.secondary,
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 16,
  },
  stepper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
  },
  stepItem: { alignItems: 'center' },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepIndex: { color: colors.textSecondary, fontWeight: '600' },
  stepIndexActive: { color: '#fff' },
  stepLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  stepLabelActive: { color: colors.primary, fontWeight: '600' },
  info: {
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    padding: 12,
    color: colors.primaryDark,
    marginBottom: 16,
  },
  label: {
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff7f8',
    marginBottom: 16,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '600' },
  successBox: {
    backgroundColor: colors.primaryLight,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
  },
  successText: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default ForgotPasswordScreen;


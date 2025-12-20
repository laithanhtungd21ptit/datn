import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, 
  Paper, 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Alert,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  Divider
} from '@mui/material';
import { 
  Email, 
  Lock, 
  ArrowBack, 
  CheckCircle,
  Security
} from '@mui/icons-material';
import { api } from '../../api/client';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const navigate = useNavigate();

  const steps = ['Nhập email', 'Xác nhận token', 'Đặt mật khẩu mới'];

  const submitEmail = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!email) {
      setError('Vui lòng nhập email.');
      return;
    }
    setLoading(true);
    try {
      await api.authForgotPassword(email);
      setInfo('Mã xác nhận đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.');
      setStep(1);
    } catch (err) {
      setError(err?.message || 'Lỗi gửi yêu cầu');
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!resetToken) {
      setError('Vui lòng nhập mã xác nhận.');
      return;
    }
    if (!newPassword || !confirmPassword) {
      setError('Vui lòng nhập đầy đủ mật khẩu mới.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Mật khẩu mới phải có ít nhất 8 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu mới không khớp.');
      return;
    }
    setResetting(true);
    try {
      await api.authResetPassword({ token: resetToken, newPassword });
      setInfo('Đặt lại mật khẩu thành công. Vui lòng đăng nhập.');
      setStep(2);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err?.message || 'Không thể đặt lại mật khẩu');
    } finally {
      setResetting(false);
    }
  };

  return (
    <Container 
      component="main" 
      maxWidth="md"
      sx={{ 
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        py: { xs: 2, sm: 4 }
      }}
    >
      <Box sx={{ 
        width: '100%',
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center' 
      }}>
        <Button 
          startIcon={<ArrowBack />} 
          onClick={() => navigate('/login')}
          sx={{ 
            alignSelf: 'flex-start', 
            mb: 2,
            fontSize: { xs: '0.875rem', sm: '1rem' }
          }}
        >
          Quay lại đăng nhập
        </Button>
        
        <Paper elevation={3} sx={{ p: { xs: 3, sm: 4 }, width: '100%', maxWidth: 600 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Security sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Quên mật khẩu
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Nhập email để nhận mã xác nhận đặt lại mật khẩu
            </Typography>
          </Box>

          <Stepper activeStep={step} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          {info && (
            <Alert severity="info" sx={{ mb: 3 }}>
              {info}
            </Alert>
          )}

          {/* Step 0: Email Input */}
          {step === 0 && (
            <Card>
              <CardContent>
                <Box component="form" onSubmit={submitEmail}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    margin="normal"
                    InputProps={{
                      startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                  />
                  <Button 
                    type="submit" 
                    variant="contained" 
                    fullWidth
                    sx={{ mt: 3 }}
                    startIcon={<Email />}
                    disabled={loading}
                  >
                    {loading ? 'Đang gửi...' : 'Gửi mã xác nhận'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Step 1: Token Input */}
          {step === 1 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Security color="primary" />
                  Nhập mã xác nhận
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Vui lòng kiểm tra email và nhập mã xác nhận
                </Typography>
                <Box component="form" onSubmit={submitReset}>
                  <TextField
                    fullWidth
                    label="Mã xác nhận"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    margin="normal"
                    InputProps={{
                      startAdornment: <Security sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Mật khẩu mới"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    margin="normal"
                    InputProps={{
                      startAdornment: <Lock sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Xác nhận mật khẩu mới"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    margin="normal"
                    InputProps={{
                      startAdornment: <Lock sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                  />
                  <Button 
                    type="submit" 
                    variant="contained" 
                    fullWidth
                    sx={{ mt: 3 }}
                    startIcon={<Lock />}
                    disabled={resetting}
                  >
                    {resetting ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Success */}
          {step === 2 && (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Thành công!
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Mật khẩu đã được đặt lại thành công. Bạn sẽ được chuyển đến trang đăng nhập.
                </Typography>
              </CardContent>
            </Card>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default ForgotPassword;



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
} from '@mui/material';
import { Login as LoginIcon } from '@mui/icons-material';
import { api, setAuthToken } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';

const Login = () => {
  const [loginData, setLoginData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setLoginData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!loginData.username || !loginData.password) {
      setError('Vui lòng nhập đầy đủ thông tin đăng nhập');
      return;
    }
    try {
      const result = await api.login(loginData);
      const token = result?.accessToken;
      const user = result?.user;
      if (token && user) {
        setAuthToken(token);
        login(token, user);
      }
      const userRole = user?.role;
      if (userRole === 'teacher') navigate('/teacher');
      else if (userRole === 'student') navigate('/student');
      else navigate('/admin');
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại');
    }
  };

  return (
    <Container 
      component="main" 
      maxWidth="sm"
      sx={{ 
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        py: { xs: 2, sm: 4 }
      }}
    >
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper 
          elevation={3} 
          sx={{ 
            padding: { xs: 3, sm: 4 }, 
            width: '100%',
            maxWidth: { xs: '100%', sm: '500px' }
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <LoginIcon 
              sx={{ 
                fontSize: { xs: 40, sm: 48 }, 
                color: 'primary.main', 
                mb: 2 
              }} 
            />
            <Typography 
              component="h1" 
              variant="h4" 
              gutterBottom
              sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}
            >
              Đăng nhập
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
            >
              Hệ thống Quản lý Bài tập và Giám sát Học tập
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleLogin}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Tên đăng nhập"
              name="username"
              autoComplete="username"
              autoFocus
              value={loginData.username}
              onChange={handleInputChange}
              sx={{
                '& .MuiInputBase-root': {
                  fontSize: { xs: '0.875rem', sm: '1rem' }
                }
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Mật khẩu"
              type="password"
              id="password"
              autoComplete="current-password"
              value={loginData.password}
              onChange={handleInputChange}
              sx={{
                '& .MuiInputBase-root': {
                  fontSize: { xs: '0.875rem', sm: '1rem' }
                }
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ 
                mt: 3, 
                mb: 2,
                py: { xs: 1.5, sm: 2 },
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }}
              size="large"
              startIcon={<LoginIcon />}
            >
              Đăng nhập
            </Button>
          </Box>

          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Button size="small" onClick={() => navigate('/forgot-password')}>
              Quên mật khẩu?
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;

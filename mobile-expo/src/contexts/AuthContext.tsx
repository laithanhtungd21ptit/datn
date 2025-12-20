import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, setAuthToken } from '../api/client';

type User = {
  id: string;
  role: 'student' | 'teacher' | 'admin';
  fullName?: string;
  username?: string;
};

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [[, storedToken], [, storedUser]] = await AsyncStorage.multiGet([
          'accessToken',
          'currentUser',
        ]);

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          await setAuthToken(storedToken);
        }
      } catch (err) {
        console.warn('Không thể khởi tạo phiên đăng nhập:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setError(null);
    try {
      const result = await api.login({ username, password });
      const accessToken = result?.accessToken;
      let userData = result?.user;

      if (!accessToken || !userData) {
        throw new Error('Dữ liệu phản hồi không hợp lệ');
      }

      // Normalize role to lowercase to handle "Teacher" vs "teacher"
      if (userData.role) {
        userData = {
          ...userData,
          role: userData.role.toLowerCase() as 'student' | 'teacher' | 'admin',
        };
      }

      // Validate role
      if (!['student', 'teacher', 'admin'].includes(userData.role)) {
        console.warn('Invalid role received:', userData.role);
        throw new Error(`Vai trò không hợp lệ: ${userData.role}`);
      }

      setToken(accessToken);
      setUser(userData);
      await AsyncStorage.multiSet([
        ['accessToken', accessToken],
        ['currentUser', JSON.stringify(userData)],
      ]);
      await setAuthToken(accessToken);

      return userData;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    setToken(null);
    await AsyncStorage.multiRemove(['accessToken', 'currentUser']);
    await setAuthToken('');
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      error,
      login,
      logout,
      clearError,
    }),
    [user, token, loading, error, login, logout, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được dùng bên trong AuthProvider');
  }
  return context;
};


import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { setAuthToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('accessToken') || '');
  const [currentUser, setCurrentUser] = useState(() => {
    const raw = localStorage.getItem('currentUser');
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  });

  useEffect(() => {
    if (accessToken) localStorage.setItem('accessToken', accessToken);
    else localStorage.removeItem('accessToken');
    // sync to api client
    setAuthToken(accessToken);
  }, [accessToken]);

  useEffect(() => {
    if (currentUser) localStorage.setItem('currentUser', JSON.stringify(currentUser));
    else localStorage.removeItem('currentUser');
  }, [currentUser]);

  const login = (token, user) => {
    setAccessToken(token);
    setCurrentUser(user);
  };

  const logout = () => {
    setAccessToken('');
    setCurrentUser(null);
  };

  const value = useMemo(() => ({ accessToken, currentUser, login, logout }), [accessToken, currentUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}



import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function ProtectedRoute({ role, children }) {
  const { accessToken, currentUser } = useAuth();
  if (!accessToken || !currentUser) return <Navigate to="/login" replace />;
  if (role && currentUser.role !== role) return <Navigate to="/login" replace />;
  return children;
}



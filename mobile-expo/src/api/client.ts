import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '../config/constants';

export type StudentDashboardStats = {
  enrolledClasses?: number;
  totalClasses?: number;
  submittedAssignments?: number;
  totalAssignments?: number;
  gradedAssignments?: number;
};

export type StudentDashboardDeadline = {
  id?: string | number;
  title?: string;
  class?: string;
  subject?: string;
  dueDate?: string;
  deadline?: string;
  startAt?: string;
  duration?: number;
  durationMinutes?: number;
  description?: string;
  teacher?: string;
};

export type StudentDashboardResponse = {
  stats?: StudentDashboardStats;
  upcomingDeadlines?: StudentDashboardDeadline[];
  upcomingExams?: StudentDashboardDeadline[];
  grades?: {
    id?: string | number;
    assignment?: string;
    class?: string;
    score?: number;
    maxGrade?: number;
    gradedAt?: string;
    submittedAt?: string;
    comment?: string;
    notes?: string;
    teacher?: string;
  }[];
};

export type AdminDashboardResponse = {
  stats?: {
    totalUsers?: number;
    totalStudents?: number;
    totalTeachers?: number;
    totalClasses?: number;
    totalAssignments?: number;
    activeSessions?: number;
  };
  system?: {
    users?: number;
    teachers?: number;
    students?: number;
    admins?: number;
    classes?: number;
    assignments?: number;
    enrollments?: number;
    submissions?: number;
  };
  activities?: Array<{
    id?: string;
    message?: string;
    createdAt?: string;
    actor?: string;
    type?: string;
  }>;
};

export type AdminClassMember = {
  id?: string;
  fullName?: string;
  email?: string;
  role?: string;
};

export type AdminClassResource = {
  id?: string;
  title?: string;
  type?: string;
  dueDate?: string;
  url?: string;
  author?: string;
};

export type AdminClassSummary = {
  id: string;
  name?: string;
  code?: string;
  subject?: string;
  teacher?: string;
  teacherId?: string;
  department?: string;
  studentCount?: number;
  status?: 'active' | 'archived' | 'draft';
  schedule?: string;
  semester?: string;
};

export type AdminClassDetail = AdminClassSummary & {
  description?: string;
  startDate?: string;
  endDate?: string;
  room?: string;
  credits?: number;
  teachers?: AdminClassMember[];
  students?: AdminClassMember[];
  documents?: AdminClassResource[];
  assignments?: AdminClassResource[];
};

let authToken: string = '';

const resolveToken = async (): Promise<string> => {
  if (authToken) {
    return authToken;
  }
  const stored = await AsyncStorage.getItem('accessToken');
  authToken = stored || '';
  return authToken;
};

export const setAuthToken = async (token?: string) => {
  authToken = token || '';
  if (token) {
    await AsyncStorage.setItem('accessToken', token);
  } else {
    await AsyncStorage.removeItem('accessToken');
  }
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  config: { retries?: number; retryDelay?: number } = {},
): Promise<T> {
  const maxRetries = config.retries ?? 2;
  const retryDelay = config.retryDelay ?? 500;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const token = await resolveToken();
      const headers: Record<string, string> = {
        ...(options.headers as Record<string, string>),
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      if (!(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }

      const cleanBackendUrl = BACKEND_URL.replace(/\/$/, '');
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      const fullUrl = path.startsWith('http')
        ? path
        : `${cleanBackendUrl}${cleanPath}`;

      // Log request for debugging (only in development)
      if (__DEV__ && path.includes('/login')) {
        console.log('Login request:', {
          url: fullUrl,
          method: options.method,
          hasBody: !!options.body,
        });
      }

      const response = await fetch(fullUrl, {
        ...options,
        headers,
      });

      const contentType = response.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      const data = isJson ? await response.json() : await response.text();

      // Log response for debugging (only in development)
      if (__DEV__ && path.includes('/login')) {
        console.log('Login response:', {
          status: response.status,
          ok: response.ok,
          error: typeof data === 'object' ? data?.error : data,
        });
      }

      if (!response.ok) {
        const errorMessage =
          typeof data === 'string'
            ? data
            : data?.error || `HTTP ${response.status}: ${response.statusText}`;

        // Map backend error codes to user-friendly messages
        let userFriendlyMessage = errorMessage;
        if (errorMessage === 'INVALID_CREDENTIALS') {
          userFriendlyMessage = 'Tên đăng nhập hoặc mật khẩu không đúng';
        } else if (errorMessage === 'ACCOUNT_DISABLED') {
          userFriendlyMessage = 'Tài khoản đã bị khóa';
        } else if (errorMessage === 'ROLE_MISMATCH') {
          userFriendlyMessage = 'Vai trò không khớp';
        }

        if (response.status === 401) {
          await setAuthToken('');
          await AsyncStorage.multiRemove(['accessToken', 'currentUser']);
          throw new Error(userFriendlyMessage);
        }

        if (response.status >= 500 || response.status === 404) {
          throw new Error(
            userFriendlyMessage || 'Máy chủ đang bận, thử lại sau',
          );
        }

        throw new Error(userFriendlyMessage || 'Yêu cầu thất bại');
      }

      return data as T;
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries) {
        throw error;
      }
      await delay(retryDelay * Math.pow(2, attempt));
    }
  }

  throw lastError;
}

type ForgotPasswordResponse = {
  success?: boolean;
  resetToken?: string;
  expiresAt?: string;
};

export const api = {
  login: (payload: { username: string; password: string }) =>
    apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  studentDashboard: () =>
    apiRequest<StudentDashboardResponse>('/api/student/dashboard'),
  studentClasses: () => apiRequest('/api/student/classes'),
  studentJoinClass: (code: string) =>
    apiRequest('/api/student/classes/join', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
  studentClassDetail: (id: string) =>
    apiRequest(`/api/student/classes/${id}`),
  studentClassAssignments: (id: string) =>
    apiRequest(`/api/student/classes/${id}/assignments`),
  studentGetComments: (classId: string) =>
    apiRequest(`/api/student/classes/${classId}/comments`),
  studentCreateComment: (classId: string, payload: { content: string }) =>
    apiRequest(`/api/student/classes/${classId}/comments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  studentAssignments: () => apiRequest('/api/student/assignments'),
  studentSubmit: (formData: FormData) =>
    apiRequest('/api/student/submissions', {
      method: 'POST',
      body: formData,
    }),
  studentNotifications: () => apiRequest('/api/student/notifications'),
  studentMarkNotificationRead: (id: string) =>
    apiRequest(`/api/student/notifications/${id}/read`, { method: 'POST' }),
  studentMarkAllNotificationsRead: () =>
    apiRequest('/api/student/notifications/mark-all-read', { method: 'POST' }),
  studentProfile: () => apiRequest('/api/student/profile'),
  studentUpdateProfile: (payload: Record<string, unknown>) =>
    apiRequest('/api/student/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  studentUploadAvatar: (formData: FormData) =>
    apiRequest('/api/student/profile/avatar', {
      method: 'POST',
      body: formData,
    }),
  forgotPassword: (email: string) =>
    apiRequest<ForgotPasswordResponse>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  resetPassword: (payload: { token: string; newPassword: string }) =>
    apiRequest('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  adminDashboard: () =>
    apiRequest<AdminDashboardResponse>('/api/admin/dashboard'),
  adminAccounts: (params: Record<string, string | number | undefined> = {}) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        const stringValue = String(value);
        if (stringValue.trim().length > 0) {
          sp.set(key, stringValue.trim());
        }
      }
    });
    const query = sp.toString();
    const path = query ? `/api/admin/accounts?${query}` : '/api/admin/accounts';
    return apiRequest(path);
  },
  adminUpdateAccount: (id: string, payload: any) =>
    apiRequest(`/api/admin/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  adminDeleteAccount: (id: string) =>
    apiRequest(`/api/admin/accounts/${id}`, {
      method: 'DELETE',
    }),
  adminCreateAccount: (payload: any) =>
    apiRequest('/api/admin/accounts', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  adminSendNotification: (payload: { recipientId: string; title: string; content: string; type?: string }) =>
    apiRequest('/api/admin/send-notification', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  adminGetReportsUsers: (period: string = 'all') =>
    apiRequest(`/api/admin/reports/users?period=${encodeURIComponent(period)}`),
  adminGetReportsClasses: () =>
    apiRequest('/api/admin/reports/classes'),
  adminGetReportsAssignments: () =>
    apiRequest('/api/admin/reports/assignments'),
  adminGetActivities: (limit: number = 50) =>
    apiRequest(`/api/admin/activities?limit=${limit}`),
  adminExportReport: (reportType: string) =>
    apiRequest('/api/admin/reports/export', {
      method: 'POST',
      body: JSON.stringify({ reportType }),
    }),
  adminClasses: (params: Record<string, string | undefined> = {}) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value && value.trim().length > 0) {
        sp.set(key, value.trim());
      }
    });
    const query = sp.toString();
    const path = query ? `/api/admin/classes?${query}` : '/api/admin/classes';
    return apiRequest<AdminClassSummary[]>(path);
  },
  adminClassDetail: (id: string) =>
    apiRequest<AdminClassDetail>(`/api/admin/classes/${id}`),
  adminCreateClass: (payload: Record<string, unknown>) =>
    apiRequest('/api/admin/classes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  adminUpdateClass: (id: string, payload: Record<string, unknown>) =>
    apiRequest(`/api/admin/classes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  adminDeleteClass: (id: string) =>
    apiRequest(`/api/admin/classes/${id}`, {
      method: 'DELETE',
    }),
  // Teacher endpoints
  teacherDashboard: () =>
    apiRequest('/api/teacher/dashboard'),
  teacherClasses: () =>
    apiRequest('/api/teacher/classes'),
  teacherClassDetail: (id: string) =>
    apiRequest(`/api/teacher/classes/${id}`),
  teacherCreateClass: (payload: Record<string, unknown>) =>
    apiRequest('/api/teacher/classes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  teacherAssignmentsList: (params: Record<string, string | undefined> = {}) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value && value.trim().length > 0) {
        sp.set(key, value.trim());
      }
    });
    const query = sp.toString();
    const path = query ? `/api/teacher/assignments?${query}` : '/api/teacher/assignments';
    return apiRequest(path);
  },
  teacherSubmissions: (assignmentId: string) =>
    apiRequest(`/api/teacher/submissions?assignmentId=${encodeURIComponent(assignmentId)}`),
  teacherGradeSubmission: (id: string, payload: Record<string, unknown>) =>
    apiRequest(`/api/teacher/submissions/${id}/grade`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  teacherCreateAssignment: (payload: Record<string, unknown>) =>
    apiRequest('/api/teacher/assignments', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  teacherUpdateAssignment: (id: string, payload: Record<string, unknown>) =>
    apiRequest(`/api/teacher/assignments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  teacherDeleteAssignment: (id: string) =>
    apiRequest(`/api/teacher/assignments/${id}`, {
      method: 'DELETE',
    }),
  teacherGetDocuments: (classId: string) =>
    apiRequest(`/api/teacher/classes/${classId}/documents`),
  teacherUploadDocument: (classId: string, formData: FormData) =>
    apiRequest(`/api/teacher/classes/${classId}/documents`, {
      method: 'POST',
      body: formData,
    }),
  teacherDeleteDocument: (id: string) =>
    apiRequest(`/api/teacher/documents/${id}`, {
      method: 'DELETE',
    }),
  teacherGetAnnouncements: (classId: string) =>
    apiRequest(`/api/teacher/classes/${classId}/announcements`),
  teacherCreateAnnouncement: (classId: string, payload: Record<string, unknown>) =>
    apiRequest(`/api/teacher/classes/${classId}/announcements`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  teacherDeleteAnnouncement: (id: string) =>
    apiRequest(`/api/teacher/announcements/${id}`, {
      method: 'DELETE',
    }),
  teacherGetComments: (classId: string) =>
    apiRequest(`/api/teacher/classes/${classId}/comments`),
  teacherCreateComment: (classId: string, payload: Record<string, unknown>) =>
    apiRequest(`/api/teacher/classes/${classId}/comments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  teacherNotifications: () =>
    apiRequest('/api/teacher/notifications'),
  teacherMarkNotificationRead: (id: string) =>
    apiRequest(`/api/teacher/notifications/${id}/read`, { method: 'POST' }),
  teacherMarkAllNotificationsRead: () =>
    apiRequest('/api/teacher/notifications/mark-all-read', { method: 'POST' }),
  teacherRemoveStudentFromClass: (classId: string, studentId: string) =>
    apiRequest(`/api/teacher/classes/${classId}/students/${studentId}`, {
      method: 'DELETE',
    }),
};


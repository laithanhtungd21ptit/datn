const defaultHeaders = { 'Content-Type': 'application/json' };
let authToken = '';

export function setAuthToken(token) {
  authToken = token || '';
}

export async function apiRequest(path, options = {}) {
  const maxRetries = options.retries || 3;
  const retryDelay = options.retryDelay || 500;
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Always check localStorage first, then module-level authToken
      // This ensures we always use the most up-to-date token
      const tokenFromStorage = (typeof localStorage !== 'undefined') ? localStorage.getItem('accessToken') : '';
      const bearer = tokenFromStorage || authToken || '';
      
      // Update module-level token if localStorage has a different token
      if (tokenFromStorage && tokenFromStorage !== authToken) {
        authToken = tokenFromStorage;
      }
      
      // Debug logging in development
      if (process.env.NODE_ENV === 'development' && !bearer) {
        console.warn('No token available for API request to:', path);
      }
      
      const headers = { ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}), ...(options.headers || {}) };

      // Don't set Content-Type for FormData, let browser set it
      if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
      }

      // Use backend URL from environment
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';
      console.log('Using backend URL:', backendUrl, 'for path:', path);

      // Ensure no double slashes
      const cleanBackendUrl = backendUrl.replace(/\/$/, ''); // Remove trailing slash
      const cleanPath = path.startsWith('/') ? path : `/${path}`; // Ensure leading slash
      const fullUrl = path.startsWith('http') ? path : `${cleanBackendUrl}${cleanPath}`;

      const response = await fetch(fullUrl, {
        credentials: 'include',
        headers,
        ...options,
      });
      const contentType = response.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      const data = isJson ? await response.json() : await response.text();
      
      if (!response.ok) {
        // Don't retry on 401 or 403
        if (response.status === 401) {
          try {
            authToken = '';
            if (typeof localStorage !== 'undefined') {
              localStorage.removeItem('accessToken');
              localStorage.removeItem('currentUser');
            }
          } finally {
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
          }
          throw new Error(data?.error || response.statusText);
        }
        
        if (response.status === 403) {
          // 403 means token is valid but role/access is denied
          // This could be a token sync issue - try refreshing from localStorage
          if (attempt === 0 && typeof localStorage !== 'undefined') {
            const freshToken = localStorage.getItem('accessToken');
            if (freshToken && freshToken !== bearer) {
              // Token exists in storage but wasn't used - retry with fresh token
              console.warn('403 error, retrying with fresh token from localStorage');
              authToken = freshToken;
              continue; // Retry with fresh token
            }
          }
          // Don't retry 403 errors - they indicate permission issues, not transient failures
          throw new Error(data?.error || 'FORBIDDEN');
        }

        // Retry on 5xx errors or 404 (might be cold start)
        if (response.status >= 500 || response.status === 404) {
          throw new Error(data?.error || response.statusText);
        }

        // Don't retry on other 4xx errors
        throw new Error(data?.error || response.statusText);
      }
      
      return data;
    } catch (error) {
      lastError = error;
      
      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      const delay = retryDelay * Math.pow(2, attempt);
      console.warn(`API request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export const api = {
  login: (payload) => apiRequest('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  teacherDashboard: () => apiRequest('/api/teacher/dashboard'),
  teacherClasses: () => apiRequest('/api/teacher/classes'),
  teacherClassDetail: (id) => apiRequest(`/api/teacher/classes/${id}`),
  studentDashboard: () => apiRequest('/api/student/dashboard'),
  studentAssignments: () => apiRequest('/api/student/assignments'),
  studentSubmit: (formData) => apiRequest('/api/student/submissions', { method: 'POST', body: formData }),
  studentClasses: () => apiRequest('/api/student/classes'),
  studentClassDetail: (id) => apiRequest(`/api/student/classes/${id}`),
  studentClassAssignments: (id) => apiRequest(`/api/student/classes/${id}/assignments`),
  studentJoinClass: (code) => apiRequest('/api/student/classes/join', { method: 'POST', body: JSON.stringify({ code }) }),
  adminAccounts: (params = {}) => {
    const sp = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== '') sp.set(k, String(v));
    });
    const query = sp.toString();
    const path = query ? `/api/admin/accounts?${query}` : '/api/admin/accounts';
    return apiRequest(path);
  },
  adminUpdateAccount: (id, payload) => apiRequest(`/api/admin/accounts/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  adminDeleteAccount: (id) => apiRequest(`/api/admin/accounts/${id}`, { method: 'DELETE' }),
  adminDashboard: () => apiRequest('/api/admin/dashboard'),
  // Admin: Classes
  adminClasses: () => apiRequest('/api/admin/classes'),
  adminCreateClass: (payload) => apiRequest('/api/admin/classes', { method: 'POST', body: JSON.stringify(payload) }),
  adminUpdateClass: (id, payload) => apiRequest(`/api/admin/classes/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  adminDeleteClass: (id) => apiRequest(`/api/admin/classes/${id}`, { method: 'DELETE' }),
  // Admin: Assignments
  adminAssignments: () => apiRequest('/api/admin/assignments'),
  adminCreateAssignment: (payload) => apiRequest('/api/admin/assignments', { method: 'POST', body: JSON.stringify(payload) }),
  adminUpdateAssignment: (id, payload) => apiRequest(`/api/admin/assignments/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  adminDeleteAssignment: (id) => apiRequest(`/api/admin/assignments/${id}`, { method: 'DELETE' }),
  // Admin: Enrollments
  adminEnrollments: () => apiRequest('/api/admin/enrollments'),
  adminCreateEnrollment: (payload) => apiRequest('/api/admin/enrollments', { method: 'POST', body: JSON.stringify(payload) }),
  adminUpdateEnrollment: (id, payload) => apiRequest(`/api/admin/enrollments/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  adminDeleteEnrollment: (id) => apiRequest(`/api/admin/enrollments/${id}`, { method: 'DELETE' }),
  // Classes
  adminGetClassDetail: (id) => apiRequest(`/api/admin/classes/${id}`),
  // Reports
  adminGetReportsUsers: (period = 'all') => apiRequest(`/api/admin/reports/users?period=${period}`),
  adminGetReportsClasses: () => apiRequest('/api/admin/reports/classes'),
  adminGetReportsAssignments: () => apiRequest('/api/admin/reports/assignments'),
  adminExportReport: (reportType) => apiRequest('/api/admin/reports/export', { method: 'POST', body: JSON.stringify({ reportType }) }),
  // Activity Logs
  adminGetActivities: (limit = 50) => apiRequest(`/api/admin/activities?limit=${limit}`),
  adminGetSystemLogs: (level = null, limit = 100) => apiRequest(`/api/admin/system-logs?${level ? `level=${level}&` : ''}limit=${limit}`),
  adminSendNotification: (payload) => apiRequest('/api/admin/send-notification', { method: 'POST', body: JSON.stringify(payload) }),
  // Teacher: assignments and submissions
  teacherAssignmentsList: (params = {}) => {
    const sp = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== '') sp.set(k, String(v));
    });
    const query = sp.toString();
    const path = query ? `/api/teacher/assignments?${query}` : '/api/teacher/assignments';
    return apiRequest(path);
  },
  teacherSubmissions: (assignmentId) => apiRequest(`/api/teacher/submissions?assignmentId=${encodeURIComponent(assignmentId)}`),
  teacherGradeSubmission: (id, payload) => apiRequest(`/api/teacher/submissions/${id}/grade`, { method: 'PUT', body: JSON.stringify(payload) }),
  teacherCreateAssignment: (payload) => apiRequest('/api/teacher/assignments', { method: 'POST', body: JSON.stringify(payload) }),
  teacherUpdateAssignment: (id, payload) => apiRequest(`/api/teacher/assignments/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  teacherDeleteAssignment: (id) => apiRequest(`/api/teacher/assignments/${id}`, { method: 'DELETE' }),
  // Documents
  teacherGetDocuments: (classId) => apiRequest(`/api/teacher/classes/${classId}/documents`),
  teacherUploadDocument: (classId, formData) => apiRequest(`/api/teacher/classes/${classId}/documents`, { method: 'POST', body: formData }),
  teacherDeleteDocument: (id) => apiRequest(`/api/teacher/documents/${id}`, { method: 'DELETE' }),
  // Announcements
  teacherGetAnnouncements: (classId) => apiRequest(`/api/teacher/classes/${classId}/announcements`),
  teacherCreateAnnouncement: (classId, payload) => apiRequest(`/api/teacher/classes/${classId}/announcements`, { method: 'POST', body: JSON.stringify(payload) }),
  teacherDeleteAnnouncement: (id) => apiRequest(`/api/teacher/announcements/${id}`, { method: 'DELETE' }),
  // Student Management
  teacherRemoveStudentFromClass: (classId, studentId) => apiRequest(`/api/teacher/classes/${classId}/students/${studentId}`, { method: 'DELETE' }),
  // Comments
  teacherGetComments: (classId) => apiRequest(`/api/teacher/classes/${classId}/comments`),
  teacherCreateComment: (classId, payload) => apiRequest(`/api/teacher/classes/${classId}/comments`, { method: 'POST', body: JSON.stringify(payload) }),
  studentGetComments: (classId) => apiRequest(`/api/student/classes/${classId}/comments`),
  studentCreateComment: (classId, payload) => apiRequest(`/api/student/classes/${classId}/comments`, { method: 'POST', body: JSON.stringify(payload) }),
  studentProfile: () => apiRequest('/api/student/profile'),
  studentUpdateProfile: (payload) => apiRequest('/api/student/profile', { method: 'PUT', body: JSON.stringify(payload) }),
  studentUploadAvatar: (formData) => apiRequest('/api/student/profile/avatar', { method: 'POST', body: formData }),
  studentGetNotificationSettings: () => apiRequest('/api/student/notifications/settings'),
  studentUpdateNotificationSettings: (payload) => apiRequest('/api/student/notifications/settings', { method: 'PUT', body: JSON.stringify(payload) }),
  studentNotifications: () => apiRequest('/api/student/notifications'),
  studentMarkNotificationRead: (id) => apiRequest(`/api/student/notifications/${id}/read`, { method: 'POST' }),
  studentMarkAllNotificationsRead: () => apiRequest('/api/student/notifications/mark-all-read', { method: 'POST' }),
  studentExamDetail: (id) => apiRequest(`/api/student/exams/${id}`),
  // Teacher Notifications
  teacherNotifications: () => apiRequest('/api/teacher/notifications'),
  teacherMarkNotificationRead: (id) => apiRequest(`/api/teacher/notifications/${id}/read`, { method: 'POST' }),
  teacherMarkAllNotificationsRead: () => apiRequest('/api/teacher/notifications/mark-all-read', { method: 'POST' }),
  // Student Chat
  studentChatContacts: () => apiRequest('/api/student/chat/contacts'),
  studentChatMessages: (userId) => apiRequest(`/api/student/chat/messages/${userId}`),
  studentSendMessage: (data) => apiRequest('/api/student/chat/messages', { method: 'POST', body: JSON.stringify(data) }),
  studentMarkMessagesRead: (userId) => apiRequest(`/api/student/chat/messages/${userId}/read`, { method: 'POST' }),

  // Chat APIs (for all roles)
  chatConversations: () => apiRequest('/api/chat/conversations'),
  chatMessages: (conversationId, params = {}) => {
    const sp = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== '') sp.set(k, String(v));
    });
    const query = sp.toString();
    const path = query ? `/api/chat/conversations/${conversationId}/messages?${query}` : `/api/chat/conversations/${conversationId}/messages`;
    return apiRequest(path);
  },
  chatCreateConversation: (payload) => apiRequest('/api/chat/conversations', { method: 'POST', body: JSON.stringify(payload) }),
  chatSendMessage: (payload) => {
    const options = { method: 'POST' };
    if (payload instanceof FormData) {
      options.body = payload;
    } else {
      options.body = JSON.stringify(payload);
    }
    return apiRequest('/api/chat/messages', options);
  },
  chatRecipients: () => apiRequest('/api/chat/recipients'),
  chatMarkAsRead: (conversationId) => apiRequest(`/api/chat/conversations/${conversationId}/read`, { method: 'POST' }),

  authForgotPassword: (email) => apiRequest('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  authResetPassword: (payload) => apiRequest('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) }),
};



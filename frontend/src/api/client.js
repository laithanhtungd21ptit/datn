const defaultHeaders = { 'Content-Type': 'application/json' };
let authToken = '';

export function setAuthToken(token) {
  authToken = token || '';
}

export async function apiRequest(path, options = {}) {
  const tokenFromStorage = (typeof localStorage !== 'undefined') ? localStorage.getItem('accessToken') : '';
  const bearer = authToken || tokenFromStorage || '';
  const headers = { ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}), ...(options.headers || {}) };

  // Don't set Content-Type for FormData, let browser set it
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(path, {
    credentials: 'include',
    headers,
    ...options,
  });
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await response.json() : await response.text();
  if (!response.ok) {
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
    }
    throw new Error(data?.error || response.statusText);
  }
  return data;
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
  // Teacher: assignments and submissions
  teacherAssignmentsList: () => apiRequest('/api/teacher/assignments'),
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
  // Comments
  teacherGetComments: (classId) => apiRequest(`/api/teacher/classes/${classId}/comments`),
  teacherCreateComment: (classId, payload) => apiRequest(`/api/teacher/classes/${classId}/comments`, { method: 'POST', body: JSON.stringify(payload) }),
  studentGetComments: (classId) => apiRequest(`/api/student/classes/${classId}/comments`),
  studentCreateComment: (classId, payload) => apiRequest(`/api/student/classes/${classId}/comments`, { method: 'POST', body: JSON.stringify(payload) }),
  studentProfile: () => apiRequest('/api/student/profile'),
};



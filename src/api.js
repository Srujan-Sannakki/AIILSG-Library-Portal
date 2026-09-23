import axios from 'axios';
const API = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || '/api', timeout: 30000 });
// Remove prototype sessions. New sessions are scoped to this browser tab.
window.localStorage.removeItem('token');
export const getToken = () => window.sessionStorage.getItem('token');
export const setToken = token => token ? window.sessionStorage.setItem('token', token) : window.sessionStorage.removeItem('token');
API.interceptors.request.use(req => {
  const token = getToken();
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});
API.interceptors.response.use(response => response, error => {
  // A forbidden action does not mean the user's authenticated session is invalid.
  if (error.response?.status === 401 && error.config?.headers?.Authorization === `Bearer ${getToken()}`) {
    setToken(null);
    window.dispatchEvent(new Event('auth-expired'));
  }
  return Promise.reject(error);
});
export const errorMessage = error => error.response?.data?.error || (error.code === 'ERR_NETWORK' ? 'Unable to reach the server. Please retry.' : error.message);
export const login = data => API.post('/login', data);
export const me = () => API.get('/me');
export const logout = () => API.post('/logout');
export const fetchUsers = (params) => API.get('/users', { params });
export const createUser = data => API.post('/users', data);
export const updateUser = (id, data) => API.put(`/users/${encodeURIComponent(id)}/profile`, data);
export const updateFees = (id, data) => API.put(`/users/${encodeURIComponent(id)}/fees`, data);
export const updatePermissions = (id, data) => API.put(`/users/${encodeURIComponent(id)}/permissions`, data);
export const changePassword = (id, data) => API.put(`/users/${encodeURIComponent(id)}/password`, data);
export const resetPassword = (id, newPassword) => API.post(`/users/${encodeURIComponent(id)}/reset-password`, { newPassword });
export const deleteUser = id => API.delete(`/users/${encodeURIComponent(id)}`);
export const fetchBooks = params => API.get('/books', { params });
export const addBook = data => API.post('/books', data);
export const deleteBook = id => API.delete(`/books/${encodeURIComponent(id)}`);
export const fetchPage = (id, page, signal) => API.get(`/books/${encodeURIComponent(id)}/pages/${page}`, { responseType: 'arraybuffer', signal });
export const fetchInventory = params => API.get('/inventory', { params });
export const createInventory = data => API.post('/inventory', data);
export const fetchTransactions = params => API.get('/transactions', { params });
export const createTransaction = data => API.post('/transactions', data);
export const fetchVisitors = params => API.get('/visitors', { params });
export const createVisitor = ({ date, sid, name, course, purpose, timeIn, timeOut, phone, feedback }) => API.post('/visitors', { date, sid, name, course, purpose, timeIn, timeOut, phone, feedback });
export const fetchAdmins = params => API.get('/admins', { params });
export const createAdmin = data => API.post('/admins', data);
export const deleteAdmin = id => API.delete(`/admins/${encodeURIComponent(id)}`);
export const fetchSettings = () => API.get('/settings');
export const updateSettings = data => API.put('/settings', data);
export const fetchLogs = params => API.get('/logs', { params });
export const fetchReports = params => API.get('/reports', { params });
export const createReport = data => API.post('/reports', data);
export const updateReport = (id, data) => API.put(`/reports/${id}`, data);
export const createEnquiry = ({ name, phone, purpose, message }) => API.post('/enquiries', { name, phone, purpose, message });

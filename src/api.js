import axios from 'axios';

// Ensure this matches your backend URL exactly
const API = axios.create({ baseURL: '/api' });

// Add token to requests if it exists
API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// Handle 401/403 errors (token expired or invalid)
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Token expired or invalid
      localStorage.removeItem('token');
      // Redirect to login if not already there
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

// API Endpoints
export const login = (data) => API.post('/login', data);
export const fetchUsers = () => API.get('/users');
export const createUser = (data) => API.post('/users', data);
export const fetchBooks = () => API.get('/books');
export const addBook = (data) => API.post('/books', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
});
export const fetchInventory = () => API.get('/inventory');
export const fetchTransactions = () => API.get('/transactions');
export const createTransaction = (data) => API.post('/transactions', data);
export const fetchVisitors = () => API.get('/visitors');
export const createVisitor = (data) => API.post('/visitors', data);
export const updateUser = (id, data) => API.put(`/users/${id}`, data);
export const checkHealth = () => API.get('/health');
export const fetchAdmins = () => API.get('/admins');
export const createAdmin = (data) => API.post('/admins', data);
export const deleteAdmin = (id) => API.delete(`/admins/${id}`);
export const fetchSettings = () => API.get('/settings');
export const updateSettings = (data) => API.put('/settings', data);
export const fetchLogs = () => API.get('/logs');
export const createLog = (data) => API.post('/logs', data);
export const clearLogs = () => API.delete('/logs');
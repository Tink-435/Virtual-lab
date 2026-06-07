import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

/**
 * AUTH CONTEXT
 *
 * React Context provides a "global state" accessible anywhere in the component
 * tree without prop drilling. We use it to store:
 *   - user: the logged-in user object (or null)
 *   - token: the JWT (stored in localStorage for persistence)
 *   - login/logout/register functions
 *
 * Why Context over Redux here?
 * - Auth state is simple: one user, a few actions
 * - Context + hooks is sufficient; Redux adds boilerplate without benefit
 *
 * Security note on localStorage:
 * JWT in localStorage is vulnerable to XSS attacks. In a production
 * hardened app you'd use httpOnly cookies. For this project, localStorage
 * is acceptable — mention the tradeoff in interviews.
 */

const AuthContext = createContext(null);

// Axios instance with base URL + auto-attach token to every request
export const api = axios.create({
  baseURL: 'http://localhost:5001/api',
});

// Interceptor: add Authorization header if token exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vlab_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: handle 401 globally (token expired → logout)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('vlab_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true while checking stored token

  // On mount: check if there's a valid stored token
  useEffect(() => {
    const token = localStorage.getItem('vlab_token');
    if (token) {
      api.get('/auth/me')
        .then(res => setUser(res.data.user))
        .catch(() => localStorage.removeItem('vlab_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('vlab_token', res.data.token);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const register = useCallback(async (name, email, password, role) => {
    const res = await api.post('/auth/register', { name, email, password, role });
    localStorage.setItem('vlab_token', res.data.token);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('vlab_token');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

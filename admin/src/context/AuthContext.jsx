import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { adminAuth } from '../services/adminService';

const AuthContext = createContext(null);

const TOKEN_KEY = 'pingload_admin_token';
const USER_KEY = 'pingload_admin_user';

const storage = typeof sessionStorage !== 'undefined' ? sessionStorage : localStorage;

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const persistSession = useCallback((authToken, adminUser) => {
    storage.setItem(TOKEN_KEY, authToken);
    storage.setItem(USER_KEY, JSON.stringify(adminUser));
    setToken(authToken);
    setAdmin(adminUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      await adminAuth.logout();
    } catch {
      // Clear local session even when offline.
    }
    storage.removeItem(TOKEN_KEY);
    storage.removeItem(USER_KEY);
    setToken(null);
    setAdmin(null);
  }, []);

  useEffect(() => {
    const init = async () => {
      const saved = storage.getItem(TOKEN_KEY);
      if (!saved) {
        setLoading(false);
        return;
      }
      try {
        const res = await adminAuth.me();
        persistSession(saved, res.data.data);
      } catch {
        logout();
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [logout, persistSession]);

  const login = useCallback(async (email, password) => {
    const res = await adminAuth.login(email, password);
    const { token: authToken, admin: adminUser } = res.data.data;
    persistSession(authToken, adminUser);
    return res.data;
  }, [persistSession]);

  return (
    <AuthContext.Provider value={{ admin, token, loading, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

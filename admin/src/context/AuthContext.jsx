import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { adminAuth } from '../services/adminService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const persistSession = useCallback((authToken, adminUser) => {
    localStorage.setItem('pingload_admin_token', authToken);
    localStorage.setItem('pingload_admin_user', JSON.stringify(adminUser));
    setToken(authToken);
    setAdmin(adminUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('pingload_admin_token');
    localStorage.removeItem('pingload_admin_user');
    setToken(null);
    setAdmin(null);
  }, []);

  useEffect(() => {
    const init = async () => {
      const saved = localStorage.getItem('pingload_admin_token');
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

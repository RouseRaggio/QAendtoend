import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const AuthContext = createContext<AuthContextType>({} as any);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  useEffect(() => {
    if (token) {
      api.get<User>('/auth/me')
        .then(u => setUser(u))
        .catch(() => logout());
    } else {
      // Auto-login default QA user for instant smooth experience
      login('qa@gestadoc.com', 'qa123456').catch(() => {});
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await api.post<{ access_token: string; user: User }>('/auth/login', { email, password });
    localStorage.setItem('token', res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    showToast('Bienvenido, ' + res.user.full_name);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, toastMessage, showToast }}>
      {children}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          right: '24px',
          bottom: '24px',
          background: '#102a43',
          color: 'white',
          padding: '13px 17px',
          borderRadius: '9px',
          zIndex: 9999,
          fontSize: '13px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          borderLeft: '4px solid #14b8a6'
        }}>
          {toastMessage}
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

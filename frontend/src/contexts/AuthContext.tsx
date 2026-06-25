import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { AuthUser } from '../types';
import { authService } from '../services';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (login: string, motDePasse: string) => Promise<void>;
  logout: () => void;
  isResponsable: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser]   = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser  = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (loginStr: string, motDePasse: string) => {
    const data = await authService.login(loginStr, motDePasse);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  if (loading) return null;

  return (
    <AuthContext.Provider value={{
      user, token, login, logout,
      isResponsable: user?.role === 'RESPONSABLE',
      isAuthenticated: !!user && !!token,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
};

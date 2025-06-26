import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { userAPI, authAPI } from '../services/api';

interface User {
  id: number;
  username: string;
  name: string;
  role: string;
  subject: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUser: (userData: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(false);

  const checkAuth = async () => {
    if (checkingAuth) {
      return;
    }

    setCheckingAuth(true);
    try {
      const userData = await userAPI.getProfile();
      setUser(userData);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
      setCheckingAuth(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await authAPI.login(username, password);
      setUser(response.user);
    } catch (error: any) {
      throw new Error(error.message || '로그인에 실패했습니다.');
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
    }
  };

  const updateUser = (userData: User) => {
    setUser(userData);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const value = {
    user,
    loading,
    login,
    logout,
    checkAuth,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 
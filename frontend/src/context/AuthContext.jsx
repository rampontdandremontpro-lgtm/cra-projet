import { createContext, useContext, useEffect, useState } from 'react';
import { getMe, login as loginApi, logout as logoutApi } from '../services/authApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('cra_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('cra_token');
  });

  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!token && !!user;

  const login = async (credentials) => {
    const data = await loginApi(credentials);

    localStorage.setItem('cra_token', data.access_token);
    localStorage.setItem('cra_user', JSON.stringify(data.user));

    setToken(data.access_token);
    setUser(data.user);

    return data.user;
  };

  const logout = () => {
    logoutApi();
    setToken(null);
    setUser(null);
  };

  const restoreSession = async () => {
    const savedToken = localStorage.getItem('cra_token');

    if (!savedToken) {
      setLoading(false);
      return;
    }

    try {
      const currentUser = await getMe();

      localStorage.setItem('cra_user', JSON.stringify(currentUser));

      setToken(savedToken);
      setUser(currentUser);
    } catch (error) {
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    restoreSession();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }

  return context;
};
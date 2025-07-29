import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  user: any | null;
  login: (token: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);

  const login = (token: string) => {
    console.log(token)
    // localStorage.setItem('token', token);
    // // const userData = getUserFromToken(token);
    // setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  useEffect(() => {
    // const token = localStorage.getItem('token');
    // if (token) {
    //   const userData = getUserFromToken(token);
    //   setUser(userData);
    // }
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuthContext must be used inside AuthProvider');
  return context;
};

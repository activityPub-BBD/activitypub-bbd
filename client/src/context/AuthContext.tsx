import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  displayName?: string;
  avatarUrl?: string;
  username: string;
}

interface AuthContextType {
  user: User | null;
  jwt: string | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setJwt: (jwt: string | null) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [jwt, setJwt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = () => {
    localStorage.removeItem('jwt');
    localStorage.removeItem('user');
    setJwt(null);
    setUser(null);
  };
  useEffect(() => {
    const savedJwt = localStorage.getItem('jwt');
    const savedUser = localStorage.getItem('user');
    
    if (savedJwt && savedUser) {
      setJwt(savedJwt);
      setUser(JSON.parse(savedUser));
    }
    
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (jwt) {
      localStorage.setItem('jwt', jwt);
    }
  }, [jwt]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      jwt, 
      isLoading,
      setUser, 
      setJwt,
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuthContext must be used inside AuthProvider');
  return context;
};

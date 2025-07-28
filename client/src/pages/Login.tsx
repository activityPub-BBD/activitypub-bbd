// src/pages/Login.tsx
import React from 'react';
import LoginForm from '../components/Auth/LoginForm';
import { useAuthContext } from '../context/AuthContext';
import '../styles/Login.css';

const Login: React.FC = () => {
  const { login } = useAuthContext();

  const handleLogin = async (email: string, password: string) => {
    // Simulate login and token handling
    const fakeToken = btoa(`${email}:${password}`);
    login(fakeToken); // Replace with real auth logic
  };

  return (
    <div className="login-page">
      <LoginForm onSubmit={handleLogin} />
    </div>
  );
};

export default Login;

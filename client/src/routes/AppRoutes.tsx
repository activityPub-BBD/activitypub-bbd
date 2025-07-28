// routes/AppRoutes.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import Home from '../pages/Home';
import Login from '../pages/Login';
import Profile from '../pages/Profile';
import type { JSX } from 'react';

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const { user } = useAuthContext();
  return user ? children : <Navigate to="/login" />;
};

export const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Login />} />
    <Route path="/home" element={<Home/>} />
    <Route path="/profile" element={<Profile/>} />
  </Routes>
);

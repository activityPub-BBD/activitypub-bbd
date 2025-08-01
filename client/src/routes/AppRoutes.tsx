// routes/AppRoutes.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import Home from '../pages/Home';
import Profile from '../pages/Profile';
import LandingPage from '../pages/LandingPage';
import type { JSX } from 'react';

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const { user } = useAuthContext();
  return user && user.username ? children : <Navigate to="/" />;
};

export const AppRoutes = () => {
  const { user } = useAuthContext();
 return (
     <Routes>
      <Route 
        path="/" 
        element={
          user && user.username ? <Navigate to="/home" /> : <LandingPage />
        } 
      />
      <Route 
        path="/auth/callback" 
        element={<LandingPage />} 
      />
      <Route 
        path="/home" 
        element={
          <PrivateRoute>
            <Home />
          </PrivateRoute>
        } 
      />
      <Route 
        path="/profile" 
        element={
          <PrivateRoute>
            <Profile />
          </PrivateRoute>
        } 
      />
      <Route 
        path="*" 
        element={
          user && user.username ? <Navigate to="/home" /> : <Navigate to="/" />
        } 
      />
    </Routes>
  );
};
// routes/AppRoutes.tsx
import { Routes, Route } from 'react-router-dom';
//import { useAuthContext } from '../context/AuthContext';
import Home from '../pages/Home';
import Profile from '../pages/Profile';
import LandingPage from '../pages/LandingPage';
// import type { JSX } from 'react';

// const PrivateRoute = ({ children }: { children: JSX.Element }) => {
//   const { user } = useAuthContext();
//   return user ? children : <Navigate to="/login" />;
// };

export const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/home" element={<Home/>} />
    <Route path="/profile" element={<Profile/>} />
  </Routes>
);

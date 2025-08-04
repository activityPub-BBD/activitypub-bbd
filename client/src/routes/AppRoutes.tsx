// routes/AppRoutes.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import Home from '../pages/Home';
import Profile from '../pages/Profile';
import LandingPage from '../pages/LandingPage';
import type { JSX } from 'react';
import UserSearch from '../pages/UserSearch';
import { FollowersList } from '../pages/FollowersTab';
import { FollowingList } from '../pages/FollowingTab';
import Notifications from '../pages/Notifications';
import UserProfilePage from '../pages/UserProfilePage';


const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const { user } = useAuthContext();
  return user && user.displayName ? children : <Navigate to="/" />;
};

export const AppRoutes = () => {
  const { user } = useAuthContext();
 return (
     <Routes>
      <Route 
        path="/" 
        element={
          user && user.displayName ? <Navigate to="/home" /> : <LandingPage />
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
        path="/follower-tab" 
        element={
          <PrivateRoute>
            <FollowersList />
          </PrivateRoute>
        } 
      />
      <Route 
        path="/following-tab" 
        element={
          <PrivateRoute>
            <FollowingList />
          </PrivateRoute>
        } 
      />
      <Route 
        path="/notifications" 
        element={
          <PrivateRoute>
            <Notifications />
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
        path="/search" 
        element={
          <PrivateRoute>
            <UserSearch />
          </PrivateRoute>
        } 
      />
      <Route 
        path="/users/:username" 
        element={
          <PrivateRoute>
            <UserProfilePage />
          </PrivateRoute>
        } 
      />
      <Route 
        path="*" 
        element={
          user && user.displayName ? <Navigate to="/home" /> : <Navigate to="/" />
        } 
      />
    </Routes>
  );
};
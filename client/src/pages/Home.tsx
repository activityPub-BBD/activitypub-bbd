// src/pages/Home.tsx
import React, { useState } from 'react';
import SideBar from '../components/SideBar';
import Feed from '../components/Feed';
import '../styles/Home.css';
import '../styles/SideBar.css';
import { useAuthContext } from '../context/AuthContext';

const Home: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { user } = useAuthContext();

  const toggleSidebar = () => setSidebarOpen((open) => !open);

  return (
    <div className={`home-layout ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <SideBar 
        isOpen={sidebarOpen} 
        onToggle={toggleSidebar}
        displayName={user?.displayName || 'User'}
        avatarUrl={user?.avatarUrl || 'https://cdn.jsdelivr.net/gh/alohe/memojis/png/vibrent_4.png'}
      />
      <Feed />
    </div>
  );
};

export default Home;

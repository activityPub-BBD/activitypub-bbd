// src/pages/Home.tsx
import React, { useState } from 'react';
import SideBar from '../components/SideBar';
import Feed from '../components/Feed';
import '../styles/Home.css';
import '../styles/SideBar.css';

const Home: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen((open) => !open);

  return (
    <div className={`home-layout ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <SideBar isOpen={sidebarOpen} onToggle={toggleSidebar} />
      <Feed />
    </div>
  );
};

export default Home;

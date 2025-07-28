import React from 'react';
import '../styles/SideBar.css';
import { Link, useNavigate } from 'react-router-dom';

interface SidebarProps {
  username?: string;
  avatarUrl?: string;
  followers?: number;
  following?: number;
  isOpen: boolean;
  onToggle: () => void;
}

const SideBar: React.FC<SidebarProps> = ({
  username = 'Cindi',
  avatarUrl = 'https://cdn.jsdelivr.net/gh/alohe/memojis/png/vibrent_4.png',
  followers = 39,
  following = 2000,
  isOpen,
  onToggle
}) => {
  const navigate = useNavigate();
  return (
    <>
      <button
        className="hamburger"
        onClick={onToggle}
        aria-label="Toggle menu"
        aria-expanded={isOpen}
      >
        ☰
      </button>

      <aside className={`sidebar ${isOpen ? 'open' : 'collapsed'}`}>
        
            {/* User Profile Section */}
            <div className="sidebar-profile">
                <div className="sidebar-user">
                    <img className="sidebar-avatar" src={avatarUrl} onClick={() => navigate('/profile')} />
                    <div className="sidebar-username">{username}</div>
                </div>
                <div className="sidebar-stats">
                    <div><span className="count">{followers}</span>Followers</div>
                    <div><span className="count">{following}</span>Following</div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="nav-links">
                <Link to="/profile">Profile</Link>
                <Link to="/explore-communities">Explore Communities</Link>
                <Link to="/">Logout</Link>
            </nav>
      </aside>

      {/* Optional overlay when sidebar open on mobile */}
      {isOpen && <div className="overlay" onClick={onToggle} />}
    </>
  );
};

export default SideBar;

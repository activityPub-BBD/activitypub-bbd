import React from "react";
import "../styles/SideBar.css";
import { Link, useNavigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";

interface SidebarProps {
  displayName?: string;
  avatarUrl?: string;
  followers?: number;
  following?: number;
  isOpen: boolean;
  onToggle: () => void;
}

const SideBar: React.FC<SidebarProps> = ({
  displayName = "User",
  avatarUrl,
  followers = 39,
  following = 2000,
  isOpen,
  onToggle,
}) => {
  const navigate = useNavigate();
  const { logout } = useAuthContext();
  
  const handleLogout = () => {
    logout();
    navigate("/");
  };

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

      <aside className={`sidebar ${isOpen ? "open" : "collapsed"}`}>
        {/* User Profile Section */}
        <div className="sidebar-profile">
          <div className="sidebar-user">
            <img
              className="sidebar-avatar"
              src={avatarUrl}
              onClick={() =>
                navigate("/profile")
              }
            />
            <div className="sidebar-username">{displayName}</div>
          </div>
          <div className="sidebar-stats">
            <div>
              <span className="count">{followers}</span>Followers
            </div>
            <div>
              <span className="count">{following}</span>Following
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="nav-links">
          <Link to="/profile">Profile</Link>
          <Link to="/explore-communities">Explore Communities</Link>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </nav>
      </aside>

      {/* Optional overlay when sidebar open on mobile */}
      {isOpen && <div className="overlay" onClick={onToggle} />}
    </>
  );
};

export default SideBar;

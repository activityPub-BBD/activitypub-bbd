import React, { useEffect, useState } from "react";
import "../styles/SideBar.css";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";

interface SidebarProps {
  followers?: number;
  following?: number;
  isOpen: boolean;
  onToggle: () => void;
}

const SideBar: React.FC<SidebarProps> = React.memo(({
  isOpen,
  onToggle,
}) => {
  const navigate = useNavigate();
  const { logout, user } = useAuthContext();
  const [stats, setStats] = useState({ followers: 0, following: 0 });
  const [loading, setLoading] = useState(true);
  const handleLogout = () => {
    logout();
    navigate("/");
  };

  useEffect(() => {
    if (!user?.id) return;

    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/follows/follow-summary/${user.id}`);
        if (!res.ok) throw new Error("Failed to fetch user stats");
        const data = await res.json();
        setStats({ followers: data.followerCount || 0, following: data.followingCount || 0 });
      } catch (err) {
        console.error("Error fetching stats:", err);
        setStats({ followers: 0, following: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user?.id]);

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
              src={user?.avatarUrl}
              onClick={() =>
                navigate("/profile", {
                  state: {
                    displayName: user?.displayName || user?.username || "User",
                    avatarUrl: user?.avatarUrl || "https://cdn.jsdelivr.net/gh/alohe/memojis/png/vibrent_4.png",
                  },
                })
              }
            />
            <div className="sidebar-username" onClick={() => navigate("/profile")} style={{ cursor: "pointer" }}>{user?.displayName || user?.username || "User"}</div>
          </div>
          {!loading && (
            <div className="sidebar-stats">
              <div onClick={() => navigate("/follower-tab")} style={{ cursor: "pointer" }}>
                <span className="count"> {stats.followers}</span>Followers
              </div>
              <div onClick={() => navigate("/following-tab")} style={{ cursor: "pointer" }}>
                <span className="count"> {stats.following}</span>Following
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="nav-links">
          <NavLink to="/home" className={({ isActive }) => isActive ? "active" : ""}>Home</NavLink>
          <NavLink to="/profile" className={({ isActive }) => isActive ? "active" : ""}>Profile</NavLink>
          <NavLink to="/follower-tab" className={({ isActive }) => isActive ? "active" : ""}>Followers</NavLink>
          <NavLink to="/following-tab" className={({ isActive }) => isActive ? "active" : ""}>Following</NavLink>
          <NavLink to="/search" className={({ isActive }) => isActive ? "active" : ""}>Search</NavLink>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </nav>
      </aside>

      {/* Optional overlay when sidebar open on mobile */}
      {isOpen && <div className="overlay" onClick={onToggle} />}
    </>
  );
});

export default SideBar;

import React, { useEffect, useState } from "react";
import SideBar from "../components/SideBar";
import "../styles/Home.css";
import "../styles/SideBar.css";
import "../styles/SuggestedFollowers.css";
import { useAuthContext } from "../context/AuthContext";

interface SuggestedUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  followers: number;
}

const SuggestedFollowers: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [suggested, setSuggested] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { jwt } = useAuthContext();

  const toggleSidebar = () => setSidebarOpen((open) => !open);

  useEffect(() => {
    const fetchSuggested = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || ""}/api/follows/follow/popular`,
          {
            headers: {
              Authorization: jwt ? `Bearer ${jwt}` : "",
            },
          }
        );
        if (!res.ok) throw new Error("Failed to fetch suggested followers");
        const data = await res.json();
        setSuggested(data);
      } catch (err: any) {
        setError(err.message || "Error fetching suggestions");
      } finally {
        setLoading(false);
      }
    };
    fetchSuggested();
  }, [jwt]);

  return (
    <div className={`home-layout ${sidebarOpen ? "sidebar-open" : ""}`}>
      <SideBar isOpen={sidebarOpen} onToggle={toggleSidebar} />
      <div className="suggested-followers-feed">
        <h2 className="suggested-title">Suggested Followers</h2>
        {loading && <div className="suggested-loading">Loading...</div>}
        {error && <div className="suggested-error">{error}</div>}
        <ul className="suggested-list">
          {!loading && !error && suggested.length === 0 && (
            <li className="no-suggestions">No suggestions found.</li>
          )}
          {suggested.map((u) => (
            <li className="suggested-user-card" key={u.id}>
              <img className="suggested-avatar" src={u.avatarUrl} alt={u.username} />
              <div className="suggested-user-info">
                <span className="suggested-username">{u.displayName || u.username}</span>
                <span className="suggested-user-followers">
                  {u.followers} follower{u.followers !== 1 ? "s" : ""}
                </span>
              </div>
              {/* Optionally, add a follow button here */}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default SuggestedFollowers;
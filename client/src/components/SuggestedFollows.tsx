import React, { useEffect, useState } from "react";
import "../styles/SuggestedFollowers.css";
import { useAuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

interface SuggestedUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  followersCount: number;
}

const SuggestedFollows: React.FC = () => {
  const [suggested, setSuggested] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { jwt } = useAuthContext();
  const [title, setTitle] = useState("");
  const navigate = useNavigate();

  async function fetchData(apiUrl: string) {
    const res = await fetch(
        `${import.meta.env.VITE_API_URL || ""}${apiUrl}`, 
        {
        headers: {
            Authorization: jwt ? `Bearer ${jwt}` : "",
        },
    });
    if (!res.ok) throw new Error("Failed to fetch suggested followers");
    return await res.json();
  }

  const handleUserClick = (user: SuggestedUser) => {
    navigate(`/user/${user.username}`);
  };

  useEffect(() => {
    const fetchSuggested = async () => {
      setLoading(true);
      setError(null);
      try {
        const suggestedMutuals = await fetchData("/api/follows/suggested-mutuals");
        console.log(suggestedMutuals);
        if(suggestedMutuals.length > 0) {
          setSuggested(suggestedMutuals);
          setTitle("Suggested Mutuals based on who you follow");
        } else{
          const suggestedFollows = await fetchData("/api/follows/follow/popular");
          setSuggested(suggestedFollows);
          setTitle("Suggested popular follows");
        }
      } catch (err: any) {
        setError(err.message || "Error fetching suggestions");
      } finally {
        setLoading(false);
      }
    };
    fetchSuggested();
  }, [jwt]);

  return (
    <div className="suggested-followers-feed">
    <h2 className="suggested-title">{title}</h2>
    {loading && <div className="suggested-loading">Loading...</div>}
    {error && <div className="suggested-error">{error}</div>}
    <ul className="suggested-list">
        {!loading && !error && suggested.length === 0 && (
        <li className="no-suggestions">No suggestions found.</li>
        )}
        {suggested.map((u) => (
        <li className="suggested-user-card" key={u.id} onClick={() => handleUserClick(u)}>
            <img className="suggested-avatar" src={u.avatarUrl || '/no-avatar.jpg'} alt={u.username} />
            <div className="suggested-user-info">
            <span className="suggested-username">{u.displayName || u.username}</span>
            <span className="suggested-user-followers">
                {u.followersCount} follower{u.followersCount !== 1 ? "s" : ""}
            </span>
            </div>
            {/* Optionally, add a follow button here */}
        </li>
        ))}
    </ul>
    </div>
  );
};

export default SuggestedFollows;
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import "../styles/FollowersList.css";

interface IUser {
  id: string;
  displayName: string;
  avatarUrl: string;
  username: string;
}

export function FollowersList() {
  const { jwt } = useAuthContext();
  const navigate = useNavigate();

  const [followers, setFollowers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!jwt) {
      setLoading(false);
      return;
    }

    const fetchFollowers = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/follows/followers`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });

        if (!res.ok) throw new Error(`Error fetching followers: ${res.status}`);
        const data = await res.json();
        setFollowers(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load followers");
      } finally {
        setLoading(false);
      }
    };

    fetchFollowers();
  }, [jwt]);

  const goBack = () => navigate(-1);

  const handleUserClick = (author: {
    avatarUrl: string;
    displayName: string;
    username: string;
  }) => {
    navigate(`/user/${author.username}`);
  };

  return (
    <div className="followers-container">
      <button className="back-button" onClick={goBack}>← Back</button>
      <h3>Your Followers</h3>

      {loading && <p>Loading followers...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && followers.length === 0 && <p>No followers yet.</p>}

      <ul className="followers-list">
        {followers.map((user) => (
          <li key={user.id} className="follower-item" onClick={() => handleUserClick(user)}>
            <img
              src={user.avatarUrl || "/no-avatar.jpg"}
              alt={`${user.displayName}'s avatar`}
              className="follower-avatar"
            />
            <div className="follower-info">
              <strong>{user.displayName}</strong>
              <span>@{user.username}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

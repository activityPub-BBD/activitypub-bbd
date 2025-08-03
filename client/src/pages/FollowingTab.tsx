import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import "../styles/FollowingList.css";

interface IUser {
  id: string;
  displayName: string;
  avatarUrl: string;
  username: string;
}

export function FollowingList() {
  const { jwt } = useAuthContext();
  const navigate = useNavigate();

  const [following, setFollowing] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!jwt) {
      setLoading(false);
      return;
    }

    const fetchFollowing = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/follows/following`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });

        if (!res.ok) throw new Error(`Error fetching following: ${res.status}`);
        const data = await res.json();
        setFollowing(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load following");
      } finally {
        setLoading(false);
      }
    };

    fetchFollowing();
  }, [jwt]);

  const goBack = () => navigate(-1);

  return (
    <div className="following-container">
      <button className="back-button" onClick={goBack}>← Back</button>
      <h3>People You Follow</h3>

      {loading && <p>Loading following list...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && following.length === 0 && <p>You aren't following anyone yet.</p>}

      <ul className="following-list">
        {following.map((user) => (
          <li key={user.id} className="following-item">
            <img
              src={user.avatarUrl || "/no-avatar.jpg"}
              alt={`${user.displayName}'s avatar`}
              className="following-avatar"
            />
            <div className="following-info">
              <strong>{user.displayName}</strong>
              <span>@{user.username}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

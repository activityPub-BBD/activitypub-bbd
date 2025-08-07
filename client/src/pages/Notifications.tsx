import React, { useState, useEffect } from 'react';
import SideBar from '../components/SideBar';
import '../styles/Home.css';
import '../styles/SideBar.css';
import '../styles/Notifications.css';
import { useAuthContext } from '../context/AuthContext';

// Dummy data for demonstration; replace with real API call as needed
const dummyFollowers = [
  { id: 1, username: 'Alice' },
  { id: 2, username: 'Bob' },
  { id: 3, username: 'Charlie' },
];

const Notifications: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [followers] = useState(dummyFollowers);

  const { user } = useAuthContext();

  const toggleSidebar = () => setSidebarOpen((open) => !open);

  // Replace this with a real API call to fetch followers
  useEffect(() => {
    // Example: fetchFollowers(user.id).then(setFollowers);
  }, [user]);

  return (
    <div className={`home-layout ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <SideBar
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
      />
      <div className="notifications-feed">
        <h2 className="notifications-title">Notifications</h2>
        <ul className="notifications-list">
          {followers.length === 0 ? (
            <li className="no-followers">No new followers.</li>
          ) : (
            followers.map((follower) => (
              <li className="notification-card" key={follower.id}>
                <div className="follower-avatar">
                  {/* Placeholder avatar, replace src with follower.avatar if available */}
                  <img
                    src={`https://ui-avatars.com/api/?name=${follower.username}&background=random`}
                    alt={follower.username}
                  />
                </div>
                <div className="follower-info">
                  <span className="follower-username">{follower.username}</span>
                  <span className="follower-action">followed you</span>
                </div>
                {/* <button className="follow-back-btn">Follow Back</button> */}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};

export default Notifications;
import React, { useState } from 'react';
import SideBar from '../components/SideBar';
import '../styles/Home.css';
import '../styles/SideBar.css';
import '../styles/UserSearch.css';
import { useAuthContext } from '../context/AuthContext';

// Dummy users for demonstration; replace with real API data
const dummyUsers = [
  { id: 1, username: 'Alice', avatarUrl: 'https://ui-avatars.com/api/?name=alice&background=random', followers: 120 },
  { id: 2, username: 'Bob', avatarUrl: 'https://ui-avatars.com/api/?name=bob&background=random', followers: 87 },
  { id: 3, username: 'Charlie', avatarUrl: 'https://ui-avatars.com/api/?name=charlie&background=random', followers: 203 },
  { id: 4, username: 'David', avatarUrl: 'https://ui-avatars.com/api/?name=david&background=random', followers: 45 },
];

const UserSearch: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const { user } = useAuthContext();

  // Filter users based on query
  const filteredUsers = dummyUsers.filter(u =>
    u.username.toLowerCase().includes(query.toLowerCase())
  );

  const toggleSidebar = () => setSidebarOpen((open) => !open);

  // Handle search input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  // Handle clicking a user in the search results
  const handleUserClick = (username: string) => {
    if (!recentSearches.includes(username)) {
      setRecentSearches([username, ...recentSearches].slice(0, 10)); // Keep max 10
    }
    setQuery('');
  };

  return (
    <div className={`home-layout ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <SideBar
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
        displayName={user?.displayName || 'User'}
        avatarUrl={user?.avatarUrl}
      />
      <div className="search-feed">
        <h2 className="search-title">Search Users</h2>
        <input
          className="search-input"
          type="text"
          placeholder="Search for users..."
          value={query}
          onChange={handleInputChange}
        />



        {/* Search Results */}
        <ul className="search-results">
          {query && filteredUsers.length === 0 ? (
            <li className="no-results">No users found.</li>
          ) : (
            filteredUsers.map(u => (
              <li
                className="search-user-card"
                key={u.id}
                onClick={() => handleUserClick(u.username)}
                tabIndex={0}
                style={{ cursor: 'pointer' }}
              >
                <img className="search-avatar" src={u.avatarUrl} alt={u.username} />
                <div className="search-user-info">
                  <span className="search-username">{u.username}</span>
                  <span className="search-user-followers">
                    {u.followers} follower{u.followers !== 1 ? 's' : ''}
                  </span>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};

export default UserSearch;
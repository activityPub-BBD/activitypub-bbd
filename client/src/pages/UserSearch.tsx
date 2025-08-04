import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import SideBar from '../components/SideBar';
import '../styles/Home.css';
import '../styles/SideBar.css';
import '../styles/UserSearch.css';
import { useAuthContext } from '../context/AuthContext';

interface SearchUser {
  username: string;
  displayName: string;
  avatarUrl: string;
}

const UserSearch: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const { user, jwt, logout } = useAuthContext();
  const navigate = useNavigate();

  // Debounce search to avoid too many API calls
  const [searchTimeout, setSearchTimeout] = useState<number | null>(null);

  // Function to search users via API
  const searchUsers = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setUsers([]);
      setError('');
      return;
    }

    if (!user?.id || !jwt) {
      setError('You must be logged in to search users.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/users/search?q=${encodeURIComponent(searchQuery)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data: SearchUser[] = await response.json();
        setUsers(Array.isArray(data) ? data : []);
      } else {
        if (response.status === 401) {
          logout();
          navigate('/');
          return;
        } else if (response.status === 400) {
          setError('Please enter a search query.');
        } else {
          console.error('Failed to search users:', response.status);
          setError('Failed to search users. Please try again.');
        }
        setUsers([]);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setError('Failed to search users. Please try again.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, jwt, logout, navigate]);

  // Handle search input with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Clear users and error when query is empty
    if (!value.trim()) {
      setUsers([]);
      setError('');
      return;
    }

    // Set new timeout for debounced search
    const newTimeout = setTimeout(() => {
      searchUsers(value);
    }, 300); // 300ms delay

    setSearchTimeout(newTimeout);
  };

  // Handle clicking a user in the search results
  const handleUserClick = (username: string) => {
    // Add to recent searches
    if (!recentSearches.includes(username)) {
      const newRecentSearches = [username, ...recentSearches].slice(0, 10);
      setRecentSearches(newRecentSearches);
      
      // Persist to localStorage
      try {
        localStorage.setItem('recentUserSearches', JSON.stringify(newRecentSearches));
      } catch (err) {
        console.error('Error saving recent searches:', err);
      }
    }
    
    // Navigate to user profile
    navigate(`/users/${username}`);
  };

  // Handle clicking on recent search
  const handleRecentSearchClick = (username: string) => {
    setQuery(username);
    searchUsers(username);
  };

  // Load recent searches from localStorage on component mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('recentUserSearches');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed);
        }
      }
    } catch (err) {
      console.error('Error loading recent searches:', err);
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  // Clear recent searches
  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem('recentUserSearches');
    } catch (err) {
      console.error('Error clearing recent searches:', err);
    }
  };

  const toggleSidebar = () => setSidebarOpen((open) => !open);

  // Loading state
  if (loading && query) {
    return (
      <div className="home-container">
        <SideBar isOpen={sidebarOpen} onToggle={toggleSidebar} />
        <div className={`main-content ${sidebarOpen ? 'shifted' : ''}`}>
          <div className="user-search-container">
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '200px' 
            }}>
              Searching users...
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state (when not authenticated)
  if (!user?.id || !jwt) {
    return (
      <div className="home-container">
        <SideBar isOpen={sidebarOpen} onToggle={toggleSidebar} />
        <div className={`main-content ${sidebarOpen ? 'shifted' : ''}`}>
          <div className="user-search-container">
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '200px' 
            }}>
              Please log in to search for users.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="home-container">
      <SideBar isOpen={sidebarOpen} onToggle={toggleSidebar} />
      
      <div className={`main-content ${sidebarOpen ? 'shifted' : ''}`}>
        <div className="user-search-container">
          {/* Back Button */}
          <button className="back-button" onClick={() => navigate(-1)}>
            ← Back
          </button>
          
          <h2>Search Users</h2>
          
          {/* Search Input */}
          <div className="search-input-container">
            <input
              type="text"
              placeholder="Search for users..."
              value={query}
              onChange={handleInputChange}
              className="search-input"
            />
            {loading && <div className="search-loading">Searching</div>}
          </div>

          {/* Error Message */}
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {/* Search Results */}
          <div className="search-results">
            {query && !loading && users.length === 0 && !error ? (
              <div className="no-results">
                No users found for "{query}".
              </div>
            ) : (
              users.map((u, index) => (
                <div
                  key={`${u.username}-${index}`}
                  className="user-result"
                  onClick={() => handleUserClick(u.username)}
                  tabIndex={0}
                  role="button"
                  aria-label={`View profile of ${u.displayName || u.username}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleUserClick(u.username);
                    }
                  }}
                >
                  <div className="user-avatar">
                    <img 
                      src={u.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username)}&background=random`} 
                      alt={`${u.username}'s avatar`}
                      onError={(e) => {
                        // Fallback to generated avatar if image fails to load
                        const target = e.currentTarget;
                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username)}&background=random`;
                      }}
                    />
                  </div>
                  <div className="user-info">
                    <div className="username">@{u.username}</div>
                    {u.displayName && u.displayName !== u.username && (
                      <div className="display-name">{u.displayName}</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Recent Searches */}
          {recentSearches.length > 0 && !query && (
            <div className="recent-searches">
              <h3>Recent Searches</h3>
              <div className="recent-searches-list">
                {recentSearches.map((username, index) => (
                  <div
                    key={`recent-${username}-${index}`}
                    className="recent-search-item"
                    onClick={() => handleRecentSearchClick(username)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleRecentSearchClick(username);
                      }
                    }}
                  >
                    @{username}
                  </div>
                ))}
              </div>
              <button
                className="clear-recent-btn"
                onClick={clearRecentSearches}
                type="button"
              >
                Clear Recent Searches
              </button>
            </div>
          )}

          {/* Help Text */}
          {!query && recentSearches.length === 0 && (
            <div className="no-results">
              Start typing to search for users by username or display name.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSearch;
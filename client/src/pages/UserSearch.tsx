import React, { useState, useEffect } from 'react';
import SideBar from '../components/SideBar';
import '../styles/Home.css';
import '../styles/SideBar.css';
import '../styles/UserSearch.css';
import { useAuthContext } from '../context/AuthContext';

interface SearchUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  isRemote?: boolean;
  domain?: string;
  actorId?: string;
}

const UserSearch: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const { user } = useAuthContext();

  useEffect(() => {
    const savedSearches = localStorage.getItem("recentSearches");
    if (savedSearches) {
      setRecentSearches(JSON.parse(savedSearches));
    }
    searchUsers("");
  }, []);

  const toggleSidebar = () => setSidebarOpen((open) => !open);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setError(null);

    // Only auto-search when input is empty (to show first 5 users)
    // struggled with live searching, so this is a compromise
    if (value.trim() === "") {
      searchUsers("");
    }
  };

  const handleSearch = () => {
    if (query.trim() !== "") {
      addToRecentSearches(query);
    }
    searchUsers(query);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const searchUsers = async (searchQuery: string) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("jwt");
      if (!token) {
        throw new Error("Authentication required");
      }

      let processedQuery = searchQuery;
      if (searchQuery.startsWith("@")) {
        processedQuery = searchQuery.substring(1);
      }

      const apiUrl = import.meta.env.VITE_API_URL || "";
      const response = await fetch(
        `${apiUrl}/api/users/search?q=${encodeURIComponent(processedQuery)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to search users");
      }

      const data = await response.json();
      setSearchResults(data);
      setLoading(false);
    } catch (err) {
      console.error("Search error:", err);
      setError(err instanceof Error ? err.message : "Failed to search users");
      setSearchResults([]);
      setLoading(false);
    }
  };

  // Add search to recent searches (FIFO - max 5 items)
  const addToRecentSearches = (searchTerm: string) => {
    if (searchTerm.trim() === "") return;

    const newSearches = [
      searchTerm,
      ...recentSearches.filter((s) => s !== searchTerm),
    ].slice(0, 5);
    setRecentSearches(newSearches);
    localStorage.setItem("recentSearches", JSON.stringify(newSearches));
  };

  const handleUserClick = (username: string) => {
    addToRecentSearches(username);
    setQuery("");
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
        <div className="search-container">
          <input
            className="search-input"
            type="text"
            placeholder="Search for users... (try @username@domain for remote users)"
            value={query}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
          />
          <button
            className="search-button"
            onClick={handleSearch}
            disabled={loading}
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>

        {error && <div className="search-error">{error}</div>}

        {loading && <div className="search-loading">Searching...</div>}

        {/* Search Results */}
        <ul className="search-results">
          {!loading && searchResults.length === 0 ? (
            <li className="no-results">No users found.</li>
          ) : (
            searchResults.map((user) => (
              <li
                className="search-user-card"
                key={user.id}
                onClick={() => handleUserClick(user.username)}
                tabIndex={0}
                style={{ cursor: 'pointer' }}
              >
                <img
                  className="search-avatar"
                  src={user.avatarUrl || "/no-avatar.jpg"}
                  alt={user.username}
                />
                <div className="search-user-info">
                  <span className="search-username">
                    {user.username}
                    {user.domain && (
                      <span
                        className={`domain-indicator ${
                          user.isRemote ? "remote" : "local"
                        }`}
                      >
                        @{user.domain}
                      </span>
                    )}
                  </span>
                  <span className="search-display-name">
                    {user.displayName}
                  </span>
                </div>
              </li>
            ))
          )}
        </ul>

        {recentSearches.length > 0 && searchResults.length > 0 && (
          <div className="recent-searches">
            <h3>Recent Searches</h3>
            <ul>
              {recentSearches.map((search, index) => (
                <li
                  key={index}
                  onClick={() => setQuery(search)}
                  style={{ cursor: "pointer" }}
                >
                  {search}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Show message when no results and not loading */}
        {!loading && searchResults.length === 0 && query && (
          <div className="no-results">No users found for "{query}"</div>
        )}
      </div>
    </div>
  );
};

export default UserSearch;

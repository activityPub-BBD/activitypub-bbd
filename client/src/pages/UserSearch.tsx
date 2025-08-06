import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

interface SearchPost {
  _id: string;
  caption: string;
  mediaUrl: string;
  mediaType: string;
  createdAt: string;
  likesCount: number;
  author: {
    username: string;
    displayName: string;
    avatarUrl: string;
  };
}

type SearchMode = 'users' | 'posts';

const UserSearch: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>('users');
  const [userResults, setUserResults] = useState<SearchUser[]>([]);
  const [postResults, setPostResults] = useState<SearchPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const { user } = useAuthContext();
  const navigate = useNavigate();

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

    if (value.trim() === "") {
      setHasSearched(false);
      if (searchMode === 'users') {
        searchUsers("");
      } else {
        setPostResults([]);
      }
    }
  };

  const handleSearch = () => {
    setHasSearched(true);
    
    if (query.trim() !== "") {
      addToRecentSearches(query);
    }
    
    if (searchMode === 'users') {
      searchUsers(query);
    } else {
      searchPosts(query);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleModeChange = (mode: SearchMode) => {
    setSearchMode(mode);
    setError(null);
    setHasSearched(false); 

    if (mode === 'users') {
      setPostResults([]);
      searchUsers(query);
    } else {
      setUserResults([]);
      if (query.trim()) {
        setHasSearched(true); 
        searchPosts(query);
      }
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
      setUserResults(data);
    } catch (err) {
      console.error("User search error:", err);
      setError(err instanceof Error ? err.message : "Failed to search users");
      setUserResults([]);
    } finally {
      setLoading(false);
    }
  };

  const searchPosts = async (searchQuery: string) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("jwt");
      if (!token) {
        throw new Error("Authentication required");
      }

      if (!searchQuery.trim()) {
        setPostResults([]);
        setLoading(false);
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL || "";
      const response = await fetch(
        `${apiUrl}/api/posts/search?q=${encodeURIComponent(searchQuery)}&page=1&limit=20`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to search posts");
      }

      const data = await response.json();
      setPostResults(data);
    } catch (err) {
      console.error("Post search error:", err);
      setError(err instanceof Error ? err.message : "Failed to search posts");
      setPostResults([]);
    } finally {
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

  const handleUserClick = (user: SearchUser) => {
    addToRecentSearches(user.username);
    setQuery("");
    
    // For remote users, use the full username@domain format
    const usernameForNavigation = user.isRemote && user.domain 
      ? `${user.username}@${user.domain}`
      : user.username;
    
    navigate(`/user/${usernameForNavigation}`);
  };

  const handlePostClick = (post: SearchPost) => {
    // will have implement post detail view or scroll to post in feed
    // For now navigate to the author's profile
    navigate(`/user/${post.author.username}`);
  };

  return (
    <div className={`home-layout ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <SideBar
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
      />
      <div className="search-feed">

        <button className="back-button" onClick={() => navigate(-1)}>
          ← Back
        </button>
        
        <h2 className="search-title">Search</h2>

        <div className="search-tabs">
          <button
            className={`search-tab ${searchMode === 'users' ? 'active' : ''}`}
            onClick={() => handleModeChange('users')}
          >
            👥 Users
          </button>
          <button
            className={`search-tab ${searchMode === 'posts' ? 'active' : ''}`}
            onClick={() => handleModeChange('posts')}
          >
            📝 Posts
          </button>
        </div>

        <div className="search-container">
          <input
            className="search-input"
            type="text"
            placeholder={
              searchMode === 'users' 
                ? "Search for users... (try @username@domain for remote users)"
                : "Search posts by caption..."
            }
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
        <div className="search-results">
          {searchMode === 'users' ? (
            <ul className="search-results">
              {!loading && userResults.length === 0 ? (
                <li className="no-results">No users found.</li>
              ) : (
                userResults.map((user) => (
                  <li
                    className="search-user-card"
                    key={user.id}
                    onClick={() => handleUserClick(user)}
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
          ) : (
            /* Post Results */
            <div className="post-results">
              {!loading && postResults.length === 0 && hasSearched && query ? (
                <div className="no-results">No posts found for "{query}"</div>
              ) : (
                postResults.map((post) => (
                  <div
                    key={post._id}
                    className="search-post-card"
                    onClick={() => handlePostClick(post)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="post-header">
                      <div className="post-user-info">
                        <img
                          src={post.author.avatarUrl || "/no-avatar.jpg"}
                          alt={post.author.displayName}
                          className="post-author-avatar"
                        />
                        <div className="post-author-info">
                          <span className="post-author-name">{post.author.displayName}</span>
                          <span className="post-author-username">@{post.author.username}</span>
                        </div>
                      </div>
                      <span className="post-date">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {post.mediaUrl && (
                      <div className="post-media">
                        {post.mediaType?.startsWith('video/') ? (
                          <video src={post.mediaUrl} className="post-image" />
                        ) : (
                          <img src={post.mediaUrl} alt="Post media" className="post-image" />
                        )}
                      </div>
                    )}
                    
                    <div className="post-caption">
                      {post.caption}
                    </div>
                    
                    <div className="post-stats">
                      <span>❤️ {post.likesCount}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {recentSearches.length > 0 && (
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
      </div>
    </div>
  );
};

export default UserSearch;
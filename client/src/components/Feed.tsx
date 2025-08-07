import React, { useState, useEffect, useRef, useCallback } from 'react';
import CreatePost from "./CreatePost";
import '../styles/Feed.css';
import { useAuthContext } from '../context/AuthContext';
import Post from './Post';
import {useNavigate} from "react-router-dom"
import type { IPost } from './UserProfile';

type FeedType = 'following' | 'global';

const Feed: React.FC = () => {
  const { jwt, logout } = useAuthContext();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<IPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [currentFeed, setCurrentFeed] = useState<FeedType>('global');

  const feedRef = useRef<HTMLDivElement>(null);

  // Reset feed when switching between following/global
  const switchFeed = (feedType: FeedType) => {
    if (feedType === currentFeed) return;
    
    setCurrentFeed(feedType);
    setPosts([]);
    setPage(1);
    setHasMore(true);
    setError('');
  };

  // Fetch posts for given page and feed type
  const fetchPosts = useCallback(async (pageToLoad: number, feedType: FeedType) => {
    if (!jwt) return;

    setLoading(true);
    try {
      let response;
      
      if (feedType === 'following') {
        response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/posts/following?page=${pageToLoad}&limit=20`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${jwt}`,
              'Content-Type': 'application/json',
            },
          }
        );
      } else {
        const ownFeed = false;
        response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/posts/feed?page=${pageToLoad}&limit=20`,
          {
            method: 'POST',
            body: JSON.stringify({ ownFeed }),
            headers: {
              'Authorization': `Bearer ${jwt}`,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      if (response.ok) {
        const data = await response.json();
        
        setPosts(prev => pageToLoad === 1 ? (data.posts || []) : [...prev, ...(data.posts || [])]);

        if ((data.posts?.length ?? 0) < 20) {
          setHasMore(false);
        }
      } else {
        if (response.status === 401) {
          logout();
          navigate('/');
          return;
        }
        setError('Failed to load posts');
      }
    } catch {
      setError('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [jwt, logout, navigate]);

  useEffect(() => {
    if (hasMore) {
      fetchPosts(page, currentFeed);
    }
  }, [page, fetchPosts, hasMore, currentFeed]);

  const handleScroll = () => {
    if (loading || !hasMore || !feedRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = feedRef.current;
    if (scrollHeight - scrollTop - clientHeight < 150) {
      setPage(prevPage => prevPage + 1);
    }
  };

  useEffect(() => {
    const feedEl = feedRef.current;
    if (!feedEl) return;
    feedEl.addEventListener('scroll', handleScroll);
    return () => feedEl.removeEventListener('scroll', handleScroll);
  }, [loading, hasMore]);

  const handlePostCreated = (newPost: any) => {
    if (!newPost.mediaUrl) {
      console.warn('Post creation failed: Media is required');
      setError('Post creation failed: Media is required')
      return;
    }

    const frontendPost = {
      _id: newPost.id,
      caption: newPost.caption,
      mediaUrl: newPost.mediaUrl,
      mediaType: newPost.mediaType,
      createdAt: new Date().toISOString(),
      author: {
        displayName: newPost.author.displayName,
        avatarUrl: newPost.author.avatarUrl,
        username: newPost.author.username
      },
      likes: [],
      likesCount: 0
    };

    setPosts(prevPosts => [frontendPost, ...prevPosts]);
  };

  const handleSearchClick = () => {
    navigate('/search');
  }

  const handleProfileClick = () => {
    navigate('/profile');
  }

   const handleFollowersClick = () => {
    navigate('/follower-tab');
  }

  const handleFollowingClick = () => {
    navigate('/following-tab');
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  }

  return (
    <>
      <div className="feed-container" ref={feedRef} style={{ overflowY: 'auto', height: '100vh' }}>
        {/* Header */}
        <div className="feed-header">
          <img src="chirp-landing-logo.png" className="logo" alt="Chirp Logo" width={65} />
          <div className="header-buttons">
            <button className="search-btn" onClick={handleSearchClick}>
              🔍 Search
            </button>
            <button className="create-post-btn" onClick={() => setShowCreatePost(true)}>
              + Create Post
            </button>
          </div>
        </div>

        {/* Feed Tabs */}
        <div className="feed-tabs">
          <button 
            className={`feed-tab ${currentFeed === 'global' ? 'active' : ''}`}
            onClick={() => switchFeed('global')}
          >
            Global
          </button>
          <button 
            className={`feed-tab ${currentFeed === 'following' ? 'active' : ''}`}
            onClick={() => switchFeed('following')}
          >
            Following
          </button>
        </div>

        {/* Main Feed */}
        <main className="feed">
          <div className="posts-container">
            {posts.length === 0 && !loading && (
              <div className="empty-feed">
                {currentFeed === 'following' 
                  ? "No posts from people you follow yet. Try following some users!" 
                  : "No posts available."
                }
              </div>
            )}
            
            {posts.map(post => (
              <Post
                key={post._id}
                _id={post._id}
                caption={post.caption}
                createdAt={post.createdAt}
                mediaType={post.mediaType}
                mediaUrl={post.mediaUrl}
                author={post.author}
                likes={post.likes}
                likesCount={post.likesCount}
              />
            ))}
            {loading && <div style={{ textAlign: 'center', padding: '1rem' }}>Loading more...</div>}
            {!hasMore && posts.length > 0 && <div style={{ textAlign: 'center', padding: '1rem' }}>No more posts.</div>}
            {error && <div style={{ color: 'red', textAlign: 'center' }}>{error}</div>}
          </div>
        </main>

        {/* Create Post Modal */}
        {showCreatePost && (
          <CreatePost
            onClose={() => setShowCreatePost(false)}
            onPostCreated={handlePostCreated}
          />
        )}
      </div>

      {/* Bottom Tab Bar (Mobile Only)*/}
      <div className="bottom-tab-bar">
        <button className="bottom-tab active">
          <div className="bottom-tab-icon">🏠</div>
          <div className="bottom-tab-label">Home</div>
        </button>
        <button className="bottom-tab" onClick={handleFollowersClick}>
          <div className="bottom-tab-icon">👥</div>
          <div className="bottom-tab-label">Followers</div>
        </button>
        <button className="bottom-tab" onClick={handleFollowingClick}>
          <div className="bottom-tab-icon">➡️</div>
          <div className="bottom-tab-label">Following</div>
        </button>
          <button className="bottom-tab" onClick={handleProfileClick}>
          <div className="bottom-tab-icon">👤</div>
          <div className="bottom-tab-label">Profile</div>
        </button>
         <button className="bottom-tab logout-tab" onClick={handleLogout}>
          <div className="bottom-tab-icon">🚪</div>
          <div className="bottom-tab-label">Logout</div>
        </button>
      </div>
    </>
  );
};

export default Feed;
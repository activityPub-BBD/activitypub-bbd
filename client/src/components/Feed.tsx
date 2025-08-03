import React, { useState, useEffect, useRef, useCallback } from 'react';
import CreatePost from "./CreatePost";
import '../styles/Feed.css';
import { useAuthContext } from '../context/AuthContext';
import Post from './Post';
import {useNavigate} from "react-router-dom"

interface Post {
  id: string;
  caption: string;
  mediaUrl: string;
  mediaType: string;
  createdAt: string;
  author: {
    username: string;
    displayName: string;
    avatarUrl: string;
  };
}

const Feed: React.FC = () => {
  const { jwt, logout } = useAuthContext();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const feedRef = useRef<HTMLDivElement>(null);

  // Fetch posts for given page
  const fetchPosts = useCallback(async (pageToLoad: number) => {
    if (!jwt) return;

    setLoading(true);
    try {
      const ownFeed = false;
      const response = await fetch(
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

      if (response.ok) {
        const data = await response.json();
        // Handle token expiration
        setPosts(prev => [...prev, ...(data.posts || [])]);

        // If returned posts are less than limit, no more pages
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
  }, [jwt]);

  // On component mount and page change, load posts
  useEffect(() => {
    if (hasMore) {
      fetchPosts(page);
    }
  }, [page, fetchPosts, hasMore]);

  // Scroll handler to detect near bottom
  const handleScroll = () => {
    if (loading || !hasMore || !feedRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = feedRef.current;
    if (scrollHeight - scrollTop - clientHeight < 150) {
      setPage(prevPage => prevPage + 1);
    }
  };

  // Attach scroll listener
  useEffect(() => {
    const feedEl = feedRef.current;
    if (!feedEl) return;
    feedEl.addEventListener('scroll', handleScroll);
    return () => feedEl.removeEventListener('scroll', handleScroll);
  }, [loading, hasMore]);

  // Handle new post created
  const handlePostCreated = (newPost: any) => {
    if (!newPost.mediaUrl) {
      console.warn('Post creation failed: Media is required');
      setError('Post creation failed: Media is required')
      return;
    }

    const frontendPost = {
      id: newPost.id,
      caption: newPost.caption,
      mediaUrl: newPost.mediaUrl,
      mediaType: newPost.mediaType,
      createdAt: new Date().toISOString(),
      author: {
        id: newPost.author.id,
        displayName: newPost.author.displayName,
        avatarUrl: newPost.author.avatarUrl,
      },
    };

    setPosts(prevPosts => [frontendPost, ...prevPosts]);
  };

  const formattedPosts = posts.map(post => ({
    id: post.id,
    content: post.caption,
    date: new Date(post.createdAt).toLocaleDateString(),
    mediaUrl: post.mediaUrl,
    mediaType: post.mediaType,
    author: {
      displayName: post.author.displayName,
      avatarUrl: post.author.avatarUrl,
      username: post.author.username
    }
  }));

  return (
    <div className="feed-container" ref={feedRef} style={{ overflowY: 'auto', height: '100vh' }}>
      {/* Header */}
      <div className="feed-header">
        <img src="chirp-landing-logo.png" className="logo" alt="Chirp Logo" width={65} />
        <button className="create-post-btn" onClick={() => setShowCreatePost(true)}>
          + Create Post
        </button>
      </div>

      {/* Main Feed */}
      <main className="feed">
        <div className="posts-container">
          {formattedPosts.map(post => (
            <Post
              key={post.id}
              id={post.id}
              content={post.content}
              date={post.date}
              mediaType={post.mediaType}
              mediaUrl={post.mediaUrl}
              author={post.author}
            />
          ))}
          {loading && <div style={{ textAlign: 'center', padding: '1rem' }}>Loading more...</div>}
          {!hasMore && <div style={{ textAlign: 'center', padding: '1rem' }}>No more posts.</div>}
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
  );
};

export default Feed;

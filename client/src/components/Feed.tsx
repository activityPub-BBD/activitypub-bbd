import React, { useState, useEffect, useRef } from 'react';
import '../styles/Feed.css';

const createDummyPosts = (startId: number, count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: startId + i,
    username: `user${startId + i}`,
    userAvatar: `https://i.pravatar.cc/150?img=${(startId + i) % 70 + 1}`, // pravatar has ~70 images
    postImage: `https://picsum.photos/400/400?random=${startId + i}`,
    caption: `This is an amazing moment captured! #chirp #life #moment${startId + i}`,
    likes: Math.floor(Math.random() * 1000) + 10,
    timeAgo: `${Math.floor(Math.random() * 24) + 1}h`,
    isLiked: false,
    isSaved: false,
  }));

const Feed: React.FC = () => {
  const [posts, setPosts] = useState(() => createDummyPosts(1, 20));
  const [loading, setLoading] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  const toggleLike = (postId: number) => {
    setPosts(posts.map(post => 
      post.id === postId 
        ? { 
            ...post, 
            isLiked: !post.isLiked,
            likes: post.isLiked ? post.likes - 1 : post.likes + 1
          }
        : post
    ));
  };

  const toggleSave = (postId: number) => {
    setPosts(posts.map(post => 
      post.id === postId 
        ? { ...post, isSaved: !post.isSaved }
        : post
    ));
  };

  // Handler to load more posts when near bottom
  const handleScroll = () => {
    if (!feedRef.current || loading) return;

    const { scrollTop, scrollHeight, clientHeight } = feedRef.current;
    // Load more when scrolled within 150px of bottom
    if (scrollHeight - scrollTop - clientHeight < 150) {
      loadMorePosts();
    }
  };

  // Append 20 more posts, simulating network delay
  const loadMorePosts = () => {
    setLoading(true);
    setTimeout(() => {
      setPosts(prevPosts => [
        ...prevPosts,
        ...createDummyPosts(prevPosts.length + 1, 20),
      ]);
      setLoading(false);
    }, 1000);
  };

  useEffect(() => {
    const feedEl = feedRef.current;
    if (!feedEl) return;

    feedEl.addEventListener('scroll', handleScroll);
    return () => {
      feedEl.removeEventListener('scroll', handleScroll);
    };
  }, [loading]);

  return (
    <div className="feed-container">
      {/* Header */}
      <div className="feed-header">
        <img src='chirp-landing-logo.png' className='logo' width={65} />
      </div>

      {/* Main Feed */}
      <main className="feed"  style={{ overflowY: 'auto' }}>
        <div className="posts-container" ref={feedRef}>
          {posts.map(post => (
            <article key={post.id} className="post">
              {/* Post Header */}
              <div className="post-header">
                <div className="post-user-info">
                  <img 
                    src={post.userAvatar} 
                    alt={post.username}
                    className="user-avatar"
                  />
                  <span className="username">{post.username}</span>
                </div>
                <button className="post-options">⋯</button>
              </div>

              {/* Post Image */}
              <div className="post-image-container">
                <img 
                  src={post.postImage} 
                  alt="Post content"
                  className="post-image"
                />
              </div>

              {/* Post Actions */}
              <div className="post-actions">
                <div className="action-buttons">
                  <button 
                    className={`action-btn like-btn ${post.isLiked ? 'liked' : ''}`}
                    onClick={() => toggleLike(post.id)}
                  >
                    {post.isLiked ? '❤️' : '🤍'}
                  </button>
                  <button className="action-btn">💬</button>
                  <button className="action-btn">📤</button>
                </div>
                <button 
                  className={`save-btn ${post.isSaved ? 'saved' : ''}`}
                  onClick={() => toggleSave(post.id)}
                >
                  {post.isSaved ? '🔖' : '📋'}
                </button>
              </div>

              {/* Post Info */}
              <div className="post-info">
                <div className="likes-count">
                  {post.likes.toLocaleString()} likes
                </div>
                <div className="post-caption">
                  <span className="username">{post.username}</span>
                  <span className="caption-text">{post.caption}</span>
                </div>
                <div className="post-time">{post.timeAgo}</div>
              </div>
            </article>
          ))}

          {loading && <div style={{ textAlign: 'center', padding: '1rem' }}>Loading more...</div>}
        </div>
      </main>
    </div>
  );
};

export default Feed;

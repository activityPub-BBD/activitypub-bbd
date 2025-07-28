// src/components/Feed.tsx
import React from 'react';
import '../styles/Feed.css';

const dummyPosts = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  user: `User ${i + 1}`,
  content: `This is post number ${i + 1}`,
}));

const Feed: React.FC = () => {
  return (
    <main className="feed">
      <h2 className="logo">Chirp</h2>
      <ul className="post-list">
        {dummyPosts.map(post => (
          <li key={post.id} className="post">
            <strong>{post.user}</strong>
            <p>{post.content}</p>
          </li>
        ))}
      </ul>
    </main>
  );
};

export default Feed;

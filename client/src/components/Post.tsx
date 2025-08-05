import { useAuthContext } from "../context/AuthContext";
import { useState } from "react";
import type { IPost } from "./UserProfile";


export const Post = ({
  _id,
  author,
  content,
  createdAt,
  mediaUrl,
  mediaType,
  likes,
  likesCount,
}:IPost) => {
  const { user: authedUser, jwt } = useAuthContext();
  const [isLiked, setIsLiked] = useState(likes.some(user => user.id === authedUser?.id));

  const [count, setCount] = useState(likesCount);
  const [loading, setLoading] = useState(false);

  const handleLikeToggle = async () => {
    if (loading) return; // prevent spamming
    setLoading(true);
     try {
      const id = _id;
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/posts/like/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to like post. Status: ${response.status}`);
      }
      // UI update
      if (isLiked) {
        setCount(prev => prev - 1);
      } else {
        setCount(prev => prev + 1);
      }
      setIsLiked(prev => !prev);
    } catch (err) {
      console.error('Error liking post:', err);
    } finally {
      setLoading(false);
    }
  };

  const formattedDate = new Date(createdAt).toLocaleString();
  const likeText = count === 0 ? "No likes yet" : `${count} ${count === 1 ? "like" : "likes"}`;

  return (
    <div key={_id} className="post-item">
      {/* Author Info */}
      <div className="post-author" style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
        <img
          src={author.avatarUrl || '/no-avatar.jpg'}
          alt={`${author.displayName} avatar`}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            objectFit: 'cover',
            marginRight: 10,
          }}
        />
        <div>
          <strong>{author.displayName}</strong>
          <br />
          <small style={{ color: '#666' }}>@{author.username}</small>
        </div>
      </div>

      {/* Media */}
      {mediaUrl && (
        <div className="post-media" style={{ marginBottom: '0.5rem' }}>
          {mediaType?.startsWith('video/') ? (
            <video src={mediaUrl} controls className="post-video" />
          ) : (
            <img src={mediaUrl} alt="Post media" className="post-image" />
          )}
        </div>
      )}

      {/* Content */}
      <p className="post-content">{content}</p>

      {/* Metadata */}
      <div
        className="post-meta"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.85rem',
          color: '#666',
        }}
      >
        <small>{formattedDate}</small>
        <button
          onClick={handleLikeToggle}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: isLiked ? 'red' : '#666',
            fontSize: '1rem',
          }}
          aria-label={isLiked ? "Unlike" : "Like"}
        >
          {isLiked ? '❤️' : '♡'} {likeText}
        </button>
      </div>
    </div>
  );
};

export default Post;

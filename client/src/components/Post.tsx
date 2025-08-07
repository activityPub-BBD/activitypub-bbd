import { useAuthContext } from "../context/AuthContext";
import { useState, useEffect } from "react";
import type { IPost } from "./UserProfile";
import { useNavigate } from "react-router-dom";

interface Comment {
  commentId: string;
  commentContent: string;
  commentCreatedAt: string;
  commentAuthorId: string;
  _id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
}

export const Post = ({
  _id,
  author,
  caption,
  createdAt,
  mediaUrl,
  mediaType,
  likes = [],
  likesCount = 0,
  comments = []
}: IPost & { comments?: Comment[] }) => {
  const { user: authedUser, jwt } = useAuthContext();
  const [isLiked, setIsLiked] = useState(false);
  const [count, setCount] = useState(likesCount);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [postComments, setPostComments] = useState<Comment[]>(comments);
  const [commentCount, setCommentCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    const fetchCommentCount = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/posts/comments/${_id}?page=1&limit=1`,
          {
            headers: {
              'Authorization': `Bearer ${jwt}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          const commentsData = await response.json();
          setCommentCount(commentsData.length);
          if (commentsData.length > 0) {
            setPostComments(commentsData);
          }
        }
      } catch (error) {
        console.error('Error fetching comment count:', error);
      }
    };

    fetchCommentCount();
  }, [_id, jwt]);

  useEffect(() => {
    if (authedUser) {
      setIsLiked(likes.some(likeUserId => likeUserId === authedUser.id));
    }
  }, [authedUser, likes]);


  const handleLikeToggle = async () => {
    if (loading) return;
    setLoading(true);
    
    try {
      const method = isLiked ? 'DELETE' : 'POST';
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/posts/like/${_id}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to ${isLiked ? 'unlike' : 'like'} post. Status: ${response.status}`);
      }
      
      // Update UI
      if (isLiked) {
        setCount(prev => Math.max(0, prev - 1));
        setIsLiked(false);
      } else {
        setCount(prev => prev + 1);
        setIsLiked(true);
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch comments
  const fetchComments = async () => {
    if (loadingComments) return;
    setLoadingComments(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/posts/comments/${_id}?page=1&limit=20`,
        {
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const commentsData = await response.json();
        setPostComments(commentsData);
      } else {
        console.error('Failed to fetch comments:', response.status);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  // Add comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || addingComment) return;

    setAddingComment(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/posts/comments/${_id}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ comment: newComment.trim() }),
        }
      );

      if (response.ok) {
        setNewComment('');
        setCommentCount(prev => prev + 1);
        await fetchComments();
      } else {
        console.error('Failed to add comment:', response.status);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setAddingComment(false);
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/posts/comments/${_id}/${commentId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        setCommentCount(prev => Math.max(0, prev - 1));
        setPostComments(prev => prev.filter(comment => comment.commentId !== commentId));
      } else {
        console.error('Failed to delete comment:', response.status);
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleToggleComments = () => {
    if (!showComments && postComments.length === 0) {
      fetchComments();
    }
    setShowComments(!showComments);
  };

  const handleUserClick = (author: {
    avatarUrl: string;
    displayName: string;
    username: string;
}) => {
    navigate(`/user/${author.username}`);
  };

  const formattedDate = new Date(createdAt).toLocaleString();
  const likeText = count === 0 ? "No likes yet" : `${count} ${count === 1 ? "like" : "likes"}`;


  return (
    <div key={_id} className="post-item">
      {/* Author Info */}
      <div className="post-author" style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem', cursor: 'pointer' }} onClick={() => handleUserClick(author)}>
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
      <p className="post-content">{caption}</p>

      {/* Post Actions */}
      <div className="post-actions" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '1rem',
        padding: '0.5rem 0',
        borderTop: '1px solid #f0f0f0',
        borderBottom: '1px solid #f0f0f0',
        margin: '0.5rem 0'
      }}>
        {/* Like Button */}
        <button
          onClick={handleLikeToggle}
          disabled={loading}
          style={{
            background: 'none',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            color: isLiked ? '#e91e63' : '#666',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.25rem 0.5rem',
            borderRadius: '20px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (!loading) e.currentTarget.style.backgroundColor = '#f5f5f5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>
            {isLiked ? '❤️' : '🤍'}
          </span>
          <span style={{ fontSize: '1.1rem' }}>
            {likeText}
          </span>
        </button>

        {/* Comment Button */}
        <button
          onClick={handleToggleComments}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#666',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.25rem 0.5rem',
            borderRadius: '20px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f5f5f5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>💬</span>
          <span>{commentCount}</span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="comments-section" style={{ marginTop: '1rem' }}>
          {/* Add Comment Form */}
          <form onSubmit={handleAddComment} style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <img
                src={authedUser?.avatarUrl || '/no-avatar.jpg'}
                alt="Your avatar"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1 }}>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  style={{
                    width: '100%',
                    minHeight: '60px',
                    padding: '0.5rem',
                    border: '1px solid #e1e5e9',
                    borderRadius: '8px',
                    resize: 'none',
                    fontFamily: 'inherit',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                  }}
                  maxLength={500}
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || addingComment}
                  style={{
                    background: newComment.trim() ? '#1da1f2' : '#ccc',
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    cursor: newComment.trim() && !addingComment ? 'pointer' : 'not-allowed',
                    marginTop: '0.5rem',
                    transition: 'background 0.2s ease',
                  }}
                >
                  {addingComment ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          </form>

          {/* Comments List */}
          <div className="comments-list">
            {loadingComments ? (
              <div style={{ textAlign: 'center', padding: '1rem', color: '#666' }}>
                Loading comments...
              </div>
            ) : postComments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1rem', color: '#666' }}>
                No comments yet. Be the first to comment!
              </div>
            ) : (
              postComments.map((comment) => (
                <div key={comment.commentId} className="comment-item" style={{
                  display: 'flex',
                  gap: '0.5rem',
                  marginBottom: '1rem',
                  padding: '0.75rem',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                }}>
                  <img
                    src={comment.avatarUrl || '/no-avatar.jpg'}
                    alt={`${comment.displayName} avatar`}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start',
                      marginBottom: '0.25rem'
                    }}>
                      <div>
                        <strong style={{ fontSize: '0.9rem' }}>{comment.displayName}</strong>
                        <span style={{ color: '#666', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                          @{comment.username}
                        </span>
                        <span style={{ color: '#999', fontSize: '0.75rem', marginLeft: '0.5rem' }}>
                          {new Date(comment.commentCreatedAt).toLocaleString()}
                        </span>
                      </div>
                      {/* Delete button for comment author */}
                      {comment.commentAuthorId === authedUser?.id && (
                        <button
                          onClick={() => handleDeleteComment(comment.commentId)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#999',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            padding: '0.25rem',
                            borderRadius: '4px',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f0f0f0';
                            e.currentTarget.style.color = '#e91e63';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = '#999';
                          }}
                          title="Delete comment"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '0.9rem', 
                      lineHeight: '1.4',
                      wordWrap: 'break-word'
                    }}>
                      {comment.commentContent}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Post Meta */}
      <div className="post-meta" style={{ marginTop: '0.5rem' }}>
        <small style={{ color: '#999', fontSize: '0.8rem' }}>{formattedDate}</small>
      </div>
    </div>
  );
};

export default Post;
import React, { useState, useRef, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import '../styles/UserProfile.css';

interface Post {
  id: number;
  content: string;
  date: string;
}

interface UserProfileProps {
  initialUsername: string;
  initialBio: string;
  initialAvatarUrl: string;
  posts: Post[];
}

export const UserProfile: React.FC<UserProfileProps> = ({
  initialUsername,
  initialBio,
  initialAvatarUrl,
  posts
}) => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(initialUsername);
  const [bio, setBio] = useState(initialBio);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const handleSave = () => {
    setIsEditing(false);
  };

  const handleCancel = () => {
    setUsername(initialUsername);
    setBio(initialBio);
    setAvatarUrl(initialAvatarUrl);
    setIsEditing(false);
  };

    // Handle file selection
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setAvatarUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Trigger file input click
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
     <div className="user-profile-container">
      <div className="user-profile-header">
        <div style={{ position: 'relative' }}>
          <img
            src={avatarUrl || '/default-avatar.png'}
            alt="Avatar"
            className="user-profile-avatar"
            style={{ cursor: isEditing ? 'pointer' : 'default' }}
            onClick={isEditing ? triggerFileInput : undefined}
          />
          {isEditing && (
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              ref={fileInputRef}
              onChange={handleFileChange}
            />
          )}
        </div>

        {!isEditing ? (
          <div className="user-profile-info">
            <div className="username-back-wrapper">
              <h2 className="user-profile-name">{username}</h2>
              <button
                onClick={() => navigate('/home')}
                className="button-back"
                aria-label="Back to home"
              >
                ← Back
              </button>
            </div>

            <p className="user-profile-bio">{bio || 'No bio added yet.'}</p>
            <button onClick={() => setIsEditing(true)} className="button-edit">
              Edit Profile
            </button>
          </div>
        ) : (
          <div className="user-profile-info">
            <div className="username-back-wrapper">
              <h2 className="user-profile-name">{username}</h2>
              <button
                onClick={() => navigate('/home')}
                className="button-back"
                aria-label="Back to home"
              >
                ← Back
              </button>
            </div>

            <label className="input-label" style={{ marginTop: 16 }}>
              Bio
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={3}
                className="textarea-field"
              />
            </label>

            <div className="edit-buttons">
              <button onClick={handleSave} className="button-save">
                Save
              </button>
              <button onClick={handleCancel} className="button-cancel">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <hr className="divider" />

      {/* Posts section unchanged */}
      <h3 className="posts-header">Your Posts</h3>
      <div className="posts-container">
        {posts.length === 0 ? (
          <p className="no-posts">No posts yet.</p>
        ) : (
          posts.map(post => (
            <div key={post.id} className="post-item">
              <p className="post-content">{post.content}</p>
              <small className="post-date">{post.date}</small>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

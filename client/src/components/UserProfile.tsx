import React, { useState, useRef, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
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
  const { user, jwt, setUser, logout } = useAuthContext();
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(initialUsername);
  const [bio, setBio] = useState(initialBio);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
 
  const handleSave = async () => {
    if (!jwt) {
      setError('Authentication required');
      return;
    }

    setIsLoading(true);
    setError('');

  try {
      // Update profile - send everything including base64 avatar if it's new
      const updateResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          displayName: username,
          bio: bio,
          avatarUrl: avatarUrl, // This will be base64 if user uploaded new image
        }),
      });

      if (updateResponse.ok) {
        const updatedData = await updateResponse.json();
        
        // Update user context
        setUser(prev => prev ? {
          ...prev,
          displayName: username,
          bio: bio,
          avatarUrl: avatarUrl,
        } : null);
        
        setIsEditing(false);
        setError('');
      } else {
        const errorData = await updateResponse.json();
        
        // Handle token expiration
        if (updateResponse.status === 401 && errorData.code === 'TOKEN_EXPIRED') {
          setError('Your session has expired. Please sign in again.');
          logout();
          navigate('/');
          return;
        }
        
        setError(errorData.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      setError('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
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
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be smaller than 5MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
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
            src={avatarUrl || '/no-avatar.jpg'}
            alt="Avatar"
            className="user-profile-avatar"
            style={{ cursor: isEditing ? 'pointer' : 'default' }}
            onClick={isEditing ? triggerFileInput : undefined}
          />
          <div className="avatar-container">
  {isEditing && (
    <div className="avatar-wrapper" style={{ position: 'relative' }}>
      <input
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      <div
        className="avatar-overlay"
        onClick={() => fileInputRef.current?.click()}
      >
        Click to change
      </div>
    </div>
  )}
</div>
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

             {error && (
              <div className="error-message" style={{ marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            <label className="input-label">
              Display Name
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="input-field"
                maxLength={50}
                disabled={isLoading}
              />
            </label>

            <label className="input-label" style={{ marginTop: 16 }}>
              Bio
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={3}
                className="textarea-field"
                maxLength={100}
              />
            </label>

            <div className="edit-buttons">
              <button 
                onClick={handleSave} 
                className="button-save"
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : 'Save'}
              </button>
              <button 
                onClick={handleCancel} 
                className="button-cancel"
                disabled={isLoading}
              >
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

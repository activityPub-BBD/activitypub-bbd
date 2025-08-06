import React, { useState, useRef, type ChangeEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { followService } from '../services/followService';
import '../styles/UserProfile.css';
import Post from './Post';

export interface IUser {
  id: string;
  displayName: string;
  avatarUrl: string;
  username: string;
}
export interface IPost {
  _id: string;
  caption: string;
  createdAt: string;
  mediaUrl: string;
  mediaType: string;
  author: {           
    avatarUrl : string,
    displayName: string,
    username: string,
  }
  likesCount: number,
  likes: string[]
}

interface UserProfileProps {
  initialUsername: string;
  initialBio: string;
  initialAvatarUrl: string;
  initialLocation: string;
  posts: IPost[];
  isOwnProfile?: boolean;
  profileUserId?: string;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  initialUsername,
  initialBio,
  initialAvatarUrl,
  initialLocation = '',
  posts,
  isOwnProfile,
  profileUserId
}) => {
  const navigate = useNavigate();
  const { jwt, setUser, logout, user } = useAuthContext();
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(initialUsername);
  const [bio, setBio] = useState(initialBio);
  const [location, setLocation] = useState(initialLocation);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  // Follow/unfollow state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Check follow status when component mounts or when profileUserId changes
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!jwt || !profileUserId || isOwnProfile || !user?.id) {
        return;
      }

      try {
        const following = await followService.checkFollowStatus(profileUserId, jwt);
        setIsFollowing(following);
      } catch (error) {
        console.error('Error checking follow status:', error);
      }
    };

    checkFollowStatus();
  }, [jwt, profileUserId, isOwnProfile, user?.id]);

  const handleFollow = async () => {
    if (!jwt || !profileUserId || isOwnProfile) {
      return;
    }

    setFollowLoading(true);
    try {
      const success = await followService.followUser(profileUserId, jwt);
      if (success) {
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('Error following user:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleUnfollow = async () => {
    if (!jwt || !profileUserId || isOwnProfile) {
      return;
    }

    setFollowLoading(true);
    try {
      const success = await followService.unfollowUser(profileUserId, jwt);
      if (success) {
        setIsFollowing(false);
      }
    } catch (error) {
      console.error('Error unfollowing user:', error);
    } finally {
      setFollowLoading(false);
    }
  };
  
  const handleSave = async () => {
    if (!jwt) {
      setError('Authentication required');
      return;
    }

    setIsLoading(true);
    setError('');

  try {
      const updateResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          displayName: username,
          bio: bio,
          location: location,
          avatarUrl: avatarUrl,
        }),
      });

      if (updateResponse.ok) {
        
        // Update user context
        setUser(prev => prev ? {
          ...prev,
          displayName: username,
          bio: bio,
          location: location,
          avatarUrl: avatarUrl,
        } : null);
        
        setIsEditing(false);
        setError('');
      } else {
        const errorData = await updateResponse.json();

        if (updateResponse.status === 401) {
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
    setLocation(initialLocation);
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

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleBackClick = () => {
    if (isOwnProfile) {
      navigate('/home');
    } else {
      navigate(-1);
    }
  };

  return (
     <div className="user-profile-container">
      <div className="user-profile-header">
        <div style={{ position: 'relative' }}>
          <img
            src={avatarUrl || '/no-avatar.jpg'}
            alt="Avatar"
            className="user-profile-avatar"
            style={{ cursor: (isEditing && isOwnProfile) ? 'pointer' : 'default' }}
            onClick={(isEditing && isOwnProfile) ? triggerFileInput : undefined}
          />

          <div className="avatar-container">
          {(isEditing && isOwnProfile) && (
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

        {(!isEditing || !isOwnProfile) ? (
          <div className="user-profile-info">
            <div className="username-back-wrapper">
              <h2 className="user-profile-name">{username}</h2>
              <button
                onClick={handleBackClick}
                className="button-back"
                aria-label="Back"
              >
                ← Back
              </button>
            </div>

            <p className="user-profile-bio">{bio || 'No bio added yet.'}</p>
            
            <div className="profile-meta">
              {location && (
                <div className="profile-meta-item">
                  <span className="meta-icon">📍</span>
                  <span className="meta-text">{location}</span>
                </div>
              )}
            </div>

            {isOwnProfile && (
              <button onClick={() => setIsEditing(true)} className="button-edit">
                Edit Profile
              </button>
            )}
            
            {!isOwnProfile && (
              <button 
                onClick={isFollowing ? handleUnfollow : handleFollow}
                disabled={followLoading}
                className={`button-follow ${isFollowing ? 'button-unfollow' : 'button-follow'}`}
              >
                {followLoading ? 'Loading...' : (isFollowing ? 'Unfollow' : 'Follow')}
              </button>
            )}
          </div>
        ) : (
          <div className="user-profile-info">
            <div className="username-back-wrapper">
              <h2 className="user-profile-name">Edit Profile</h2>
              <button
                onClick={handleBackClick}
                className="button-back"
                aria-label="Back"
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
                maxLength={500}
                disabled={isLoading}
              />
            </label>

            <label className="input-label" style={{ marginTop: 16 }}>
              Location
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="input-field"
                placeholder="Where are you located?"
                maxLength={100}
                disabled={isLoading}
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

      <h3 className="posts-header">
        {isOwnProfile ? 'Your Posts' : `${initialUsername}'s Posts`}
      </h3>
      <div className="posts-container">
        {posts.length === 0 ? (
          <p className="no-posts">
            {isOwnProfile 
              ? 'No posts yet. Create your first post!' 
              : `${initialUsername} hasn't posted anything yet.`
            }
          </p>
        ) : (
          posts.map(post => {
            console.log(post)
            return (
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
            );})
        )}
      </div>
    </div>
  );
};
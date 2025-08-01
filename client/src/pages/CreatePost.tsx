import React, { useState } from 'react';
import SideBar from '../components/SideBar';
import '../styles/Home.css';
import '../styles/SideBar.css';
import '../styles/CreatePost.css';
import { useAuthContext } from '../context/AuthContext';

const CreatePost: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [media, setMedia] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const { user } = useAuthContext();

  const toggleSidebar = () => setSidebarOpen((open) => !open);

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMedia(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleCaptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCaption(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Handle post upload logic here (API call)
    setSuccessMessage('Your post was successfully posted!');
    setMedia(null);
    setPreview(null);
    setCaption('');
    setTimeout(() => setSuccessMessage(''), 5000); // Hide after 5 seconds
  };

  return (
    <div className={`home-layout ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <SideBar
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
        username={user?.username || 'User'}
      />
      <div className="create-post-feed">
        <h2 className="create-post-title">Create New Post</h2>
        {successMessage && (
          <div className="success-message">{successMessage}</div>
        )}
        <form className="create-post-form" onSubmit={handleSubmit}>
          <label className="image-upload-label">
            {preview ? (
              media?.type.startsWith('video') ? (
                <video src={preview} className="media-preview" controls />
              ) : (
                <img src={preview} alt="Preview" className="media-preview" />
              )
            ) : (
              <span className="image-upload-placeholder">Click to upload image/video</span>
            )}
            <input
              type="file"
              accept="image/*,video/*"
              onChange={handleMediaChange}
              className="image-upload-input"
              required
              style={{ display: 'none' }}
            />
          </label>
          <textarea
            className="caption-input"
            placeholder="Write a caption..."
            value={caption}
            onChange={handleCaptionChange}
            maxLength={2200}
            rows={3}
          />
          <button
            className="post-btn"
            type="submit"
            disabled={!media || caption.trim() === ''}
          >
            Post
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreatePost;
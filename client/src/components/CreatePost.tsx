import React, { useState, useRef } from "react";
import "../styles/CreatePost.css";
import { useAuthContext } from "../context/AuthContext";

interface CreatePostProps {
  onClose: () => void;
  onPostCreated: (post: any) => void;
}

const CreatePost: React.FC<CreatePostProps> = ({ onClose, onPostCreated }) => {
  const [caption, setCaption] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { jwt } = useAuthContext();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "video/mp4",
      "video/webm",
    ];
    if (!allowedTypes.includes(file.type)) {
      setError(
        "Please select a valid image (JPEG, PNG, WebP) or video (MP4, WebM) file."
      );
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError("File size must be less than 10MB.");
      return;
    }

    setSelectedFile(file);
    setError(null);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!caption.trim()) {
      setError("Please enter a caption.");
      return;
    }

    if (caption.length > 2200) {
      setError("Caption must be 2200 characters or less.");
      return;
    }

    if (!selectedFile) {
      setError("Media is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("caption", caption);

      if (selectedFile) {
        formData.append("image", selectedFile);
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/posts`, {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${jwt}`
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create post");
      }

      const newPost = await response.json();
      onPostCreated(newPost);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create post");
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const isVideo = selectedFile?.type.startsWith("video/");

  return (
    <div className="create-post-overlay" onClick={onClose}>
      <div className="create-post-modal" onClick={(e) => e.stopPropagation()}>
        <div className="create-post-header">
          <h2>Create New Post</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="create-post-form">
          <div className="media-upload-section">
            {!selectedFile ? (
              <div
                className="upload-area"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="upload-icon">📷</div>
                <p>Click to upload photo or video</p>
                <small>JPG, PNG, WebP, MP4, WebM up to 10MB</small>
              </div>
            ) : (
              <div className="media-preview">
                {isVideo ? (
                  <video
                    src={previewUrl || ""}
                    controls
                    className="preview-media"
                  />
                ) : (
                  <img
                    src={previewUrl || ""}
                    alt="Preview"
                    className="preview-media"
                  />
                )}
                <button
                  type="button"
                  className="remove-media-btn"
                  onClick={removeFile}
                >
                  ×
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />
          </div>

          <div className="caption-section">
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption..."
              className="caption-textarea"
              maxLength={2200}
            />
            <div className="character-count">{caption.length}/2200</div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="submit-btn"
              disabled={isSubmitting || !caption.trim()}
            >
              {isSubmitting ? "Posting..." : "Share"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePost;

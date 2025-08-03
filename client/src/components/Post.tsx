import { type IPost } from "./UserProfile";

export const Post = (post: IPost) => {
    console.log(post)
  return (
    <div key={post.id} className="post-item">
      {/* Author info */}
      <div className="post-author" style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
        <img
          src={post.author.avatarUrl || '/no-avatar.jpg'}
          alt={`${post.author.displayName} avatar`}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            objectFit: 'cover',
            marginRight: 10,
          }}
        />
        <div>
          <strong>{post.author.displayName}</strong>
          <br />
          <small style={{ color: '#666' }}>@{post.author.username}</small>
        </div>
      </div>

      {/* Post media */}
      {post.mediaUrl && (
        <div className="post-media" style={{ marginBottom: '0.5rem' }}>
          {post.mediaType?.startsWith('video/') ? (
            <video src={post.mediaUrl} controls className="post-video" />
          ) : (
            <img src={post.mediaUrl} alt="Post media" className="post-image" />
          )}
        </div>
      )}

      {/* Post content */}
      <p className="post-content">{post.content}</p>

      {/* Post meta */}
      <div className="post-meta">
        <small className="post-date">{post.date}</small>
      </div>
    </div>
  );
};

export default Post;

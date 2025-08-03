import { useNavigate } from "react-router-dom";
import { UserProfile } from "../components/UserProfile";
// import { useLocation } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import { useState, useEffect } from "react";

interface Post {
    id: string;
    caption: string;
    mediaUrl: string;
    mediaType: string;
    createdAt: string;
    author: {
        displayName: string;
        avatarUrl: string;
        username: string;
    };
}

const Profile = () => {
    const { user, jwt, logout } = useAuthContext();
    const navigate = useNavigate();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
    const fetchUserPosts = async () => {
      if (!user?.id || !jwt) {
        setLoading(false);
        return;
      }

      try {
        const ownFeed = true;
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/posts/feed?page=1&limit=20`,          
          {
            method:'POST',
            body: JSON.stringify({ ownFeed }),
            headers: {
              'Authorization': `Bearer ${jwt}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setPosts(data.posts || []);
        } else {
          if (response.status === 401) {
            logout();
            navigate('/');
            return;
          }
          console.error('Failed to fetch posts:', response.status);
          setError('Failed to load posts');
        }
      } catch (error) {
        console.error('Error fetching posts:', error);
        setError('Failed to load posts');
      } finally {
        setLoading(false);
      }
    };

    fetchUserPosts();
  }, [user?.id, jwt]);

  // Convert posts to the format expected by UserProfile component
  const formattedPosts = posts.map(post => ({
    id: post.id,
    content: post.caption,
    date: new Date(post.createdAt).toLocaleDateString(),
    mediaUrl: post.mediaUrl,
    mediaType: post.mediaType,
    author: {
      displayName: post.author.displayName,
      avatarUrl: post.author.avatarUrl,
      username: post.author.username
    }
  }));

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        Loading profile...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        Error when trying to display profile
      </div>
    );
  }

    return (
        <UserProfile
            initialUsername={user?.displayName || 'User'}
            initialBio={user?.bio || "Tell us about yourself!"}
            initialLocation={user?.location || ''}
            initialAvatarUrl={user?.avatarUrl || "https://cdn.jsdelivr.net/gh/alohe/memojis/png/vibrent_4.png"}
            posts={formattedPosts}
        />
    )
}

export default Profile;

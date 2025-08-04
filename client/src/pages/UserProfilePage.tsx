import { useNavigate, useParams } from "react-router-dom";
import { UserProfile as UserProfileComponent } from "../components/UserProfile";
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

interface UserData {
    username: string;
    displayName: string;
    bio: string;
    avatarUrl: string;
    joinDate: string;
    activityPubId: string;
}

const UserProfilePage = () => {
    const { username } = useParams<{ username: string }>();
    const { jwt, logout } = useAuthContext();
    const navigate = useNavigate();
    const [userData, setUserData] = useState<UserData | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchUserData = async () => {
            if (!username || !jwt) {
                setLoading(false);
                return;
            }

            try {
        
                const userResponse = await fetch(
                    `${import.meta.env.VITE_API_URL}/api/users/${username}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${jwt}`,
                            'Content-Type': 'application/json',
                        },
                    }
                );

                if (userResponse.ok) {
                    const user = await userResponse.json();
                    setUserData(user);

                } else {
                    if (userResponse.status === 401) {
                        logout();
                        navigate('/');
                        return;
                    } else if (userResponse.status === 404) {
                        setError('User not found');
                    } else {
                        setError('Failed to load user profile');
                    }
                }

                const postsResponse = await fetch(
                    `${import.meta.env.VITE_API_URL}/api/users/${username}/posts?page=1&limit=20`,
                    {
                        headers: {
                            'Authorization': `Bearer ${jwt}`,
                            'Content-Type': 'application/json',
                        },
                    }
                );

                if (postsResponse.ok) {
                    const postsData = await postsResponse.json();
                    setPosts(postsData.posts || []);
                } else {
                    console.error('Failed to fetch user posts:', postsResponse.status);
                }

            } catch (error) {
                console.error('Error fetching user data:', error);
                setError('Failed to load user profile');
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [username, jwt, logout, navigate]);

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
                flexDirection: 'column',
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh',
                gap: '1rem'
            }}>
                <div style={{ fontSize: '1.2rem', color: '#666' }}>
                    {error}
                </div>
                <button 
                    onClick={() => navigate(-1)}
                    style={{
                        background: '#1da1f2',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        cursor: 'pointer'
                    }}
                >
                    Go Back
                </button>
            </div>
        );
    }

    if (!userData) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh' 
            }}>
                User not found
            </div>
        );
    }

    return (
        <UserProfileComponent
            initialUsername={userData.displayName}
            initialBio={userData.bio || "No bio available"}
            initialLocation="" 
            initialAvatarUrl={userData.avatarUrl || "https://cdn.jsdelivr.net/gh/alohe/memojis/png/vibrent_4.png"}
            posts={formattedPosts}
            isOwnProfile={false} 
        />
    );
};

export default UserProfilePage;
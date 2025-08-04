import { useNavigate, useParams } from "react-router-dom";
import { UserProfile } from "../components/UserProfile";
import { useAuthContext } from "../context/AuthContext";
import { useState, useEffect } from "react";

interface Post {
    _id: string;
    caption: string;
    mediaUrl: string;
    mediaType: string;
    createdAt: string;
    author: {
        _id: string;
        displayName: string;
        avatarUrl: string;
        username: string;
    };
}

interface User {
    id: string;
    username: string;
    displayName: string;
    bio: string;
    location?: string;
    avatarUrl: string;
    joinDate: string;
    activityPubId: string;
}

const Profile = () => {
    const { user, jwt, logout } = useAuthContext();
    const navigate = useNavigate();
    const { username: urlUsername } = useParams<{ username: string }>();
    const [posts, setPosts] = useState<Post[]>([]);
    const [profileUser, setProfileUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const isOwnProfile = !urlUsername || urlUsername === user?.username;
    const targetUsername = urlUsername || user?.username;

    useEffect(() => {        
        const fetchUserData = async () => {            
            if (!jwt) {
                setLoading(false);
                return;
            }

            try {
                let userUrl;

                if (isOwnProfile) {
                    // For own profile, use the /me endpoint
                    userUrl = `${import.meta.env.VITE_API_URL}/api/users/me`;
                    // For own posts, use the feed endpoint
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

                    // For own profile, use the user from context
                    if (user) {
                        setProfileUser({
                            id: user.id || '',
                            username: user.username || '',
                            displayName: user.displayName || '',
                            bio: user.bio || '',
                            location: user.location || '',
                            avatarUrl: user.avatarUrl || '',
                            joinDate: '',
                            activityPubId: ''
                        });
                    }
                } else {
                    // For other users, fetch their profile and posts
                    if (!targetUsername) {
                        setError('Username is required');
                        setLoading(false);
                        return;
                    }

                    userUrl = `${import.meta.env.VITE_API_URL}/api/users/${targetUsername}`;
                    const userResponse = await fetch(
                        userUrl,
                        {
                            headers: {
                                'Authorization': `Bearer ${jwt}`,
                                'Content-Type': 'application/json',
                            },
                        }
                    );

                    if (userResponse.ok) {
                        const userData = await userResponse.json();
                        setProfileUser(userData);
                    } else {
                        if (userResponse.status === 401) {
                            logout();
                            navigate('/');
                            return;
                        }
                        console.error('Failed to fetch user data:', userResponse.status);
                        setError('Failed to load user profile');
                        setLoading(false);
                        return;
                    }

                    const postsResponse = await fetch(
                        `${import.meta.env.VITE_API_URL}/api/users/${targetUsername}/posts?page=1&limit=20`,
                        {
                            headers: {
                                'Authorization': `Bearer ${jwt}`,
                                'Content-Type': 'application/json',
                            },
                        }
                    );

                    if (postsResponse.ok) {
                        const data = await postsResponse.json();
                        setPosts(data.posts || data.items || []);
                    } else {
                        if (postsResponse.status === 401) {
                            logout();
                            navigate('/');
                            return;
                        }
                        console.error('Failed to fetch posts:', postsResponse.status);
                        setError('Failed to load posts');
                    }
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                setError('Failed to load profile data');
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [targetUsername, jwt, logout, navigate, isOwnProfile, user]);

    // Convert posts to the format expected by UserProfile component
    const formattedPosts = posts.map(post => ({
        id: post._id,
        content: post.caption,
        date: new Date(post.createdAt).toLocaleDateString(),
        mediaUrl: post.mediaUrl,
        mediaType: post.mediaType,
        author: {
            displayName: post.author?.displayName || '',
            avatarUrl: post.author?.avatarUrl || '',
            username: post.author?.username || ''
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

    if (!profileUser) {
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
        <UserProfile
            initialUsername={profileUser.displayName || 'User'}
            initialBio={profileUser.bio || "Tell us about yourself!"}
            initialLocation={profileUser.location || ''}
            initialAvatarUrl={profileUser.avatarUrl || "https://cdn.jsdelivr.net/gh/alohe/memojis/png/vibrent_4.png"}
            posts={formattedPosts}
            isOwnProfile={isOwnProfile}
            profileUserId={profileUser.id}
        />
    )
}

export default Profile;
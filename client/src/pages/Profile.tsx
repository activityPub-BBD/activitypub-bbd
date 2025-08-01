import { UserProfile } from "../components/UserProfile";
// import { useLocation } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";

const samplePosts = [
  { id: 1, content: 'Hello world! This is my first post.', date: '2025-07-27' },
  { id: 2, content: 'Enjoying building my profile page.', date: '2025-07-28' },
];

const Profile = () => {
   // const location = useLocation();
   // const { displayName, avatarUrl } = location.state || {};
   const { user } = useAuthContext();

    return (
        <UserProfile
            initialUsername={user?.displayName || 'User'}
            initialBio={user?.bio || "Tell us about yourself!"}
            initialLocation={user?.location || ''}
            initialAvatarUrl={user?.avatarUrl || "https://cdn.jsdelivr.net/gh/alohe/memojis/png/vibrent_4.png"}
            posts={samplePosts}
        />
    )
}

export default Profile;

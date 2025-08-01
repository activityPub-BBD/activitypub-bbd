import { UserProfile } from "../components/UserProfile";
import { useLocation } from "react-router-dom";

const samplePosts = [
  { id: 1, content: 'Hello world! This is my first post.', date: '2025-07-27' },
  { id: 2, content: 'Enjoying building my profile page.', date: '2025-07-28' },
];

const Profile = () => {
    const location = useLocation();
    const { displayName, avatarUrl } = location.state || {};

    return (
        <UserProfile
            initialUsername={displayName || 'User'}
            initialBio="Developer & designer"
            initialAvatarUrl={avatarUrl ?? "https://cdn.jsdelivr.net/gh/alohe/memojis/png/vibrent_4.png"}
            posts={samplePosts}
        />
    )
}

export default Profile;

import { UserProfile } from "../components/UserProfile";

const samplePosts = [
  { id: 1, content: 'Hello world! This is my first post.', date: '2025-07-27' },
  { id: 2, content: 'Enjoying building my profile page.', date: '2025-07-28' },
];

const Profile = () => {
    return (
        <UserProfile
            initialUsername="Cindi"
            initialBio="Developer & designer"
            initialAvatarUrl="https://cdn.jsdelivr.net/gh/alohe/memojis/png/vibrent_4.png"
            posts={samplePosts}
        />
    )
}

export default Profile;

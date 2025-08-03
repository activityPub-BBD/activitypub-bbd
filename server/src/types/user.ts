export interface ICreateUserData {
  googleId?: string; // Optional - only for local users with Google auth
  username: string;
  displayName: string;
  avatarUrl?: string;
}
const API_BASE_URL = import.meta.env.VITE_API_URL;

export interface FollowStats {
  id: string;
  followingCount: number;
  followerCount: number;
}

export interface FollowService {
  checkFollowStatus: (targetUserId: string, token: string) => Promise<boolean>;
  followUser: (targetUserId: string, token: string) => Promise<boolean>;
  unfollowUser: (targetUserId: string, token: string) => Promise<boolean>;
  getFollowStats: (userId: string, token?: string) => Promise<FollowStats>;
}

class FollowServiceImpl implements FollowService {
  async checkFollowStatus(targetUserId: string, token: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/follows/is-following/${targetUserId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to check follow status');
      }

      const data = await response.json();
      return data.isFollowing;
    } catch (error) {
      console.error('Error checking follow status:', error);
      return false;
    }
  }

  async followUser(targetUserId: string, token: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/follows/follow/${targetUserId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Error following user:', error);
      return false;
    }
  }

  async unfollowUser(targetUserId: string, token: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/follows/unfollow/${targetUserId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Error unfollowing user:', error);
      return false;
    }
  }

  async getFollowStats(userId: string, token?: string): Promise<FollowStats> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/follows/follow-summary/${userId}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to get follow stats');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting follow stats:', error);
      return {
        id: userId,
        followingCount: 0,
        followerCount: 0,
      };
    }
  }
}

export const followService = new FollowServiceImpl(); 
export interface ICreatePostData {
  authorId: string;
  caption: string;
  mediaUrl: string;
  mediaType: string;
}

export interface IPostResponse {
  id: string;
  author: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
  caption: string;
  mediaUrl: string;
  mediaType: string;
  activityPubURI: string;
  likesCount: number;
  isLiked: boolean;
  createdAt: Date;
}
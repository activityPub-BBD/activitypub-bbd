# 🗄️ Chirp Database Schema (MongoDB)

Chirp uses MongoDB with Mongoose to manage users, posts, and ActivityPub actor data. Below are the schemas and how they relate to each other.

---

## 📌 Overview

| Collection | Purpose                                         |
|------------|-------------------------------------------------|
| `users`    | Stores user profile and Fediverse actor info    |
| `posts`    | Stores text, image, or video posts from users   |
| `follows`  | Stores relationships between users (follows)    |

---

## 👤 User Schema

**Collection:** `users`

Each document represents a single authenticated user.  
On first login via Google, a user is created and a Fedify actor is assigned.

```js
{
  _id: ObjectId,
  googleId: String,             // Google OAuth ID (unique)
  email: string,
  username: string,       
  domain: string,               // Instance domain
  actorId: string,              // Full ActivityPub actor URI
  handle: string,               //@johndoe@example.com
  displayName: string
  avatarUrl?: String,           // Optional user profile image URL
  bio?: string,                 // Optional user bio
  inboxUrl: String,             // Inbox endpoint for ActivityPub
  outboxUrl: String,            // Outbox endpoint for ActivityPub
  isLocal: boolean,             // Local vs remote user
  createdAt: Date,
}
```

## 👤 Post Schema

**Collection:** `posts`

```js
{
  _id: ObjectId,
  author: ObjectId,             // Reference to User
  caption: string,              // Post caption
  mediaUrl: string,             // S3 image URL
  mediaType: string,            // image/jpeg, image/png, image/webp
  uri: string,                  // ActivityPub object URI (unique)
  likes: ObjectId[],            // Array of user IDs who liked
  likesCount: number,        
  createdAt: Date,
}
```

## 👤 Follow Schema

**Collection:** `follow`

```js
{
  _id: ObjectId,
  follower: ObjectId,         // Reference to User who is following
  followee: ObjectId,         // Reference to User being followed
  followerActorId: String,    // URI of the follower's actor
  followeeActorId: String,    // URI of the followee's actor
  inboxUrl: String,           // Inbox of the followee (for sending 'Follow' activity)
  accepted: Boolean,          // Whether the follow was accepted (true = follow back or approved)
  createdAt: Date,
}
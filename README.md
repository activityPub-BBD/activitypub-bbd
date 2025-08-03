# 🗄️ Chirp Database Schema (MongoDB)

Chirp uses MongoDB with Mongoose to manage users, posts, and ActivityPub actor data. Below are the schemas and how they relate to each other.

---

## 📌 Test fedify

```bash
npm i
npm run dev
```
Open new terminal and it should return the dummy user
```bash
fedify lookup http://localhost:8000/users/cindi
```

## API ROUTES

### Users
GET /users/:username — Get public profile by username

GET /users/me — Get current authenticated user's profile

PUT /users/me — Update current authenticated user's profile

GET /users/:username/posts — Get posts by specific user

GET /users/search?q=... — Search users by username/displayName

### Posts
POST /posts — Create a new post

GET /posts/:id — Get a single post by ID

DELETE /posts/:id — Delete a post (own posts only)

GET /feed — Get main feed (posts from followed users, paginated)

### Follows
GET /follow-summary/:oid — Get follow stats for a specific user by ID
GET /follow-summary — Get follow stats for the authenticated user

POST /follow/:oid/:accepted — Follow a user or accept a follow request (authenticated)
DELETE /unfollow/:oid — Unfollow a user (authenticated; uses oid from body)

GET /following/:oid — Get users that a specific user is following (authenticated)
GET /following — Get users that the authenticated user is following

GET /followers/:oid — Get followers of a specific user (authenticated)
GET /followers — Get followers of the authenticated user

GET /suggested-mutuals/:oid — Get suggested mutual connections for a specific user (authenticated)
GET /suggested-mutuals — Get suggested mutual connections for the authenticated user

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
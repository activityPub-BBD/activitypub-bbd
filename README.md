# Chirp 🐦

**Chirp** is a federated social media app inspired by Mastodon and powered by [Fedify](https://github.com/modern-activitypub/fedify). It allows users to create local accounts, publish posts, and follow remote ActivityPub actors. Chirp integrates **MongoDB** (via Mongoose) for core user and content data, and **Neo4j** to efficiently manage and query social graph relationships like followers and mutuals.

---

## 📚 Features

- Federated post sharing and retrieval using ActivityPub
- Follows and unfollows tracked via **Neo4j**
- Local user authentication (e.g. Google login)
- Media posting with support for images and video
- Mutual/follower suggestions via graph traversal
- Fedify-based ActivityPub protocol implementation

---

## 🧱 Tech Stack

| Layer              | Technology                  |
|--------------------|------------------------------|
| Database           | MongoDB + Neo4j              |
| Federated Protocol | Fedify (ActivityPub)         |
| Backend            | Node.js + Express            |
| ORM/ODM            | Mongoose (MongoDB)           |
| Graph DB           | Neo4j (Social Graph)         |

---

## 🗃️ MongoDB Models

### 🔐 Key

Stores public/private key pairs per user.

```ts
type: 'RSASSA-PKCS1-v1_5' | 'Ed25519';
privateKey: string;  // JWK JSON string
publicKey: string;
userId: ObjectId;    // ref: 'User'
```

### 🔐 User

```ts
googleId?: string;   // for local auth
domain: string;
username: string;
actorId: string;     // ActivityPub actor ID
avatarUrl?: string;
bio?: string;
inboxUrl, outboxUrl: string;
followersUrl, followingUrl: string;
isLocal: boolean;
createdAt: Date;
```

### 📝 Post

```ts
author: ObjectId;     // ref: 'User'
caption: string;
mediaUrl: string;
mediaType: 'image/jpeg' | 'image/png' | 'video/mp4' | ...;
activityPubUri: string; // unique
likes: ObjectId[];
likesCount: number;
```

### 🔗 Neo4j Graph Queries

Chirp uses Neo4j to represent and query user relationships (follows, followers, mutuals).

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
#### GET /follow-summary/:oid
Get follow stats for a specific user
```
{
  "id": "string",
  "followingCount": 42,
  "followerCount": 30
}
```

#### GET /follow-summary
Get follow stats for the authenticated user

```
{
  "id": "string",
  "followingCount": 42,
  "followerCount": 30
}
```

#### POST /follow/:oid/:accepted
Follow a user or accept a follow request

```
201 Created
```

#### DELETE /unfollow/:oid
Unfollow a user

```
200 OK
```

#### GET /following/:oid
Get users that a specific user is following

```
[
  {
    "id": "string",
    "inboxUrl": "https://example.com/inbox",
    "createdAt": "2025-08-03T11:00:00.000Z"
  }
]
```

#### GET /following
Get users that the authenticated user is following

```
[
  {
    "id": "string",
    "inboxUrl": "https://example.com/inbox",
    "createdAt": "2025-08-03T11:00:00.000Z"
  }
]
```

#### GET /followers/:oid
Get followers of a specific user

```
[
  {
    "id": "string",
    "inboxUrl": "https://example.com/inbox",
    "createdAt": "2025-08-03T11:00:00.000Z"
  }
]
```

#### GET /followers
Get followers of the authenticated user

```
[
  {
    "id": "string",
    "inboxUrl": "https://example.com/inbox",
    "createdAt": "2025-08-03T11:00:00.000Z"
  }
]
```

#### GET /suggested-mutuals/:oid
Get suggested mutual connections for a specific user

```
[
  {
    "id": "string",
    "inboxUrl": "https://example.com/inbox",
    "createdAt": "2025-08-03T11:00:00.000Z",
    "followers": 12
  }
]
```

#### GET /suggested-mutuals
Get suggested mutual connections for the authenticated user

```
[
  {
    "id": "string",
    "inboxUrl": "https://example.com/inbox",
    "createdAt": "2025-08-03T11:00:00.000Z",
    "followers": 12
  }
]
```

## 📌 Overview

| Collection | Purpose                                         |
|------------|-------------------------------------------------|
| `users`    | Stores user profile and Fediverse actor info    |
| `keys`     | Stores user keypairs for ActivityPub signing    |
| `posts`    | Stores text, image, or video posts from users   |
| `follows`  | Stores relationships between users (follows)    |

---
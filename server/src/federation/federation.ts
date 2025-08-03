import {
  createFederation,
  Person,
  Image,
  Create,
  Note,
  Follow,
  Accept,
  Undo,
  type Recipient,
  PUBLIC_COLLECTION,
  isActor,
  Endpoints,
} from "@fedify/fedify";
import { getLogger } from "@logtape/logtape";
import { MemoryKvStore, InProcessMessageQueue } from "@fedify/fedify";
import { Temporal } from "@js-temporal/polyfill";
import { Types } from "mongoose";
import { ObjectId } from "mongodb";
import { UserService } from "@services/userService.ts";

const logger = getLogger("server");

export const federation = createFederation({
  kv: new MemoryKvStore(),
  queue: new InProcessMessageQueue(),
});

//setup local actor
federation.setActorDispatcher(
  "/users/{identifier}",
  async (ctx, identifier) => {
    logger.debug(`Actor dispatcher called for: ${identifier}`);

    const user = await UserService.getUserByUsername(identifier);
    if (!user) {
      logger.warn(`User not found: ${identifier}`);
      return null;
    }

    logger.info(`User found: ${user.displayName}`);

    return new Person({
      id: ctx.getActorUri(identifier),
      preferredUsername: user.username,
      name: user.displayName,
      url: ctx.getActorUri(identifier),
      summary: user.bio || "",
      icon: user.avatarUrl
        ? new Image({
            url: new URL(user.avatarUrl),
            mediaType: "image/jpeg",
          })
        : undefined,
      inbox: ctx.getInboxUri(identifier),
      outbox: ctx.getOutboxUri(identifier),
      followers: ctx.getFollowersUri(identifier),
      following: ctx.getFollowingUri(identifier),
      discoverable: true,
      endpoints: new Endpoints({
        sharedInbox: ctx.getInboxUri(),
      }),
    });
  }
);

//setup local actor's inbox
federation
  .setInboxListeners("/users/{identifier}/inbox", "/inbox")
  .on(Follow, async (ctx, follow) => {
    if (follow.objectId == null) {
      logger.debug("The Follow object does not have an object: {follow}", {
        follow,
      });
      return;
    }
    const object = ctx.parseUri(follow.objectId);
    if (object == null || object.type !== "actor") {
      logger.debug("The Follow object's object is not an actor: {follow}", {
        follow,
      });
      return;
    }
    const follower = await follow.getActor();
    if (follower?.id == null || follower.inboxId == null) {
      logger.debug("The Follow object does not have an actor: {follow}", {
        follow,
      });
      return;
    }

    // Find the user being followed in our database
    const followingUser = await UserService.getUserByUsername(
      object.identifier
    );
    if (!followingUser) {
      logger.debug(
        "Failed to find the actor to follow in the database: {object}",
        { object }
      );
      return;
    }

    // Check if the follower exists in our database, if not create them
    let followerUser = await UserService.getUserByActorId(follower.id.href);
    if (!followerUser) {
      // Extract username and domain from the follower's actor ID
      const followerUrl = new URL(follower.id.href);
      const followerPath = followerUrl.pathname;
      const followerUsername = followerPath.split("/").pop() || "unknown";
      const followerDomain = followerUrl.hostname;

      // Create the remote user
      followerUser = await UserService.createRemoteUser({
        actorId: follower.id.href,
        username: followerUsername,
        domain: followerDomain,
        displayName: follower.name?.toString() || followerUsername,
        inboxUrl: follower.inboxId.href,
        outboxUrl: follower.outboxId?.href || "",
        followersUrl: follower.followersId?.href || "",
        followingUrl: follower.followingId?.href || "",
        bio: follower.summary?.toString() || "",
        avatarUrl: "",
      });

      logger.info(
        `Created new remote user: ${followerUser.displayName} from ${followerDomain}`
      );
    }

    // Add the follower to the following user's followers list
    await UserService.addFollower(
      followingUser._id.toString(),
      followerUser._id.toString()
    );

    logger.info(
      `Added ${followerUser.displayName} as follower of ${followingUser.displayName}`
    );

    // Send Accept activity back to the follower
    const accept = new Accept({
      actor: follow.objectId,
      to: follow.actorId,
      object: follow,
    });
    await ctx.sendActivity(object, follower, accept);
  })
  .on(Undo, async (ctx, undo) => {
    //unfollow actor
    const object = await undo.getObject();
    if (!(object instanceof Follow)) return;
    if (undo.actorId == null || object.objectId == null) return;
    const parsed = ctx.parseUri(object.objectId);
    if (parsed == null || parsed.type !== "actor") return;

    // Find the user being unfollowed
    const unfollowedUser = await UserService.getUserByUsername(
      parsed.identifier
    );
    if (!unfollowedUser) {
      logger.debug("Failed to find the actor being unfollowed: {object}", {
        object,
      });
      return;
    }

    // Find the user doing the unfollowing
    const unfollowerUser = await UserService.getUserByActorId(
      undo.actorId.href
    );
    if (!unfollowerUser) {
      logger.debug("Failed to find the actor doing the unfollow: {actorId}", {
        actorId: undo.actorId,
      });
      return;
    }

    // Remove the follower from the unfollowed user's followers list
    await UserService.removeFollower(
      unfollowedUser._id.toString(),
      unfollowerUser._id.toString()
    );

    logger.info(
      `Removed ${unfollowerUser.displayName} as follower of ${unfollowedUser.displayName}`
    );
  });

//setup local actor's outbox
federation.setOutboxDispatcher(
  "/users/{identifier}/outbox",
  async (ctx, identifier, cursor) => {
    //todo find user
    const user = null;
    if (!user) return null;

    const page = cursor ? parseInt(cursor) : 1;
    const limit = 20;
    //todo get posts by user id
    const posts = [
      {
        _id: new ObjectId("64e4f1f28f1c2b5c1f8d1234"),
        author: new ObjectId("64e4f1c28f1c2b5c1f8d5678"), // Dummy user ID
        caption: "A beautiful sunset at the beach 🌅",
        mediaUrl: "https://your-s3-bucket.s3.amazonaws.com/media/sunset.jpg",
        mediaType: "image/jpeg",
        uri: "http://localhost:8000/users/cindi/posts/1",
        likes: [
          new ObjectId("64e4f1d38f1c2b5c1f8d9012"),
          new ObjectId("64e4f1d48f1c2b5c1f8d3456"),
        ],
        likesCount: 2,
        createdAt: new Date("2025-07-31T15:45:00Z"),
      },
    ];

    const activities = posts.map((post) => {
      const noteId = post.uri;

      const note = new Note({
        id: new URL(noteId),
        content: post.caption,
        to: PUBLIC_COLLECTION,
        published: Temporal.Instant.fromEpochMilliseconds(
          post.createdAt.getTime()
        ),
        attachments: [
          new Image({
            url: new URL(post.mediaUrl),
            mediaType: post.mediaType,
          }),
        ],
        attribution: ctx.getActorUri(identifier),
      });

      return new Create({
        id: new URL(`${noteId}/activity`),
        actor: ctx.getActorUri(identifier),
        object: note,
        to: new URL("https://www.w3.org/ns/activitystreams#Public"),
        published: Temporal.Instant.fromEpochMilliseconds(
          post.createdAt.getTime()
        ),
      });
    });

    return {
      items: activities,
      nextCursor: posts.length === limit ? (page + 1).toString() : null,
    };
  }
);

federation
  .setFollowersDispatcher(
    "/users/{identifier}/followers",
    async (ctx, identifier, cursor) => {
      //get followers from db for identifier
      const user = await UserService.getUserByUsername(identifier);
      if (!user) return { items: [] };

      const followers = await UserService.getFollowers(user._id.toString());
      const items: Recipient[] = followers.map((f) => ({
        id: new URL(f.actorId),
        inboxId: new URL(f.inboxUrl),
      }));
      return { items };
    }
  )
  .setCounter(async (ctx, identifier) => {
    // count followers in db
    const user = await UserService.getUserByUsername(identifier);
    if (!user) return 0;

    const followers = await UserService.getFollowers(user._id.toString());
    return followers.length;
  });

federation.setFollowingDispatcher(
  "/users/{identifier}/following",
  async (ctx, identifier, cursor) => {
    //get following from db
    const user = await UserService.getUserByUsername(identifier);
    if (!user) return null;

    const following = await UserService.getFollowing(user._id.toString());
    const items = following.map((f) => new URL(f.actorId));

    return {
      items,
      nextCursor: null,
    };
  }
);

// Posts
federation.setObjectDispatcher(Note, "/posts/{id}", (ctx, values) => {
  //TODO: return post by identifier
  const post = {
    _id: new ObjectId("64e4f1f28f1c2b5c1f8d1234"),
    author: new ObjectId("64e4f1c28f1c2b5c1f8d5678"), // Dummy user ID
    caption: "A beautiful sunset at the beach 🌅",
    mediaUrl: "https://your-s3-bucket.s3.amazonaws.com/media/sunset.jpg",
    mediaType: "image/jpeg",
    uri: "https://chirp.example.com/posts/64e4f1f28f1c2b5c1f8d1234",
    likes: [
      new ObjectId("64e4f1d38f1c2b5c1f8d9012"),
      new ObjectId("64e4f1d48f1c2b5c1f8d3456"),
    ],
    likesCount: 2,
    createdAt: new Date("2025-07-31T15:45:00Z"),
  };
  if (!post) return null;

  return new Note({
    id: ctx.getObjectUri(Note, values),
    attribution: ctx.getActorUri("unknown"), // We need to get the actual author from the post
    to: PUBLIC_COLLECTION,
    cc: ctx.getFollowersUri("unknown"), // We need to get the actual author from the post
    content: post.caption,
    published: Temporal.Instant.fromEpochMilliseconds(post.createdAt.getTime()),
    attachments: [
      new Image({
        url: new URL(post.mediaUrl),
        mediaType: post.mediaType,
      }),
    ],
  });
});

export default federation;

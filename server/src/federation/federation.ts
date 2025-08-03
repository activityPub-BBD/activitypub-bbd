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
import { KeyService } from "@services/keyService.ts";
import { PostService } from "@services/postService.ts";
import { FollowService } from "@services/followService.ts";

const logger = getLogger("server");

export const federation = createFederation({
  kv: new MemoryKvStore(),
  queue: new InProcessMessageQueue(),
});

//setup local actor
federation
  .setActorDispatcher("/users/{identifier}", async (ctx, identifier) => {
    logger.debug(`Actor dispatcher called for: ${identifier}`);

    const user = await UserService.getUserByUsername(identifier);
    if (!user) {
      logger.warn(`User not found: ${identifier}`);
      return null;
    }

    logger.info(`User found: ${user.displayName}`);

    const keys = await ctx.getActorKeyPairs(identifier);

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
      publicKey: keys[0].cryptographicKey,
      assertionMethods: keys.map((key) => key.multikey),
    });
  })
  .setKeyPairsDispatcher(async (ctx, identifier) => {
    const user = await UserService.getUserByUsername(identifier);
    if (user == null) return [];

    return await KeyService.getKeyPairsForUser(user._id.toString());
  });

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
    await FollowService.followUser(
      followerUser._id.toString(),
      followingUser._id.toString(),
      true
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
    await FollowService.unfollowUser(
      unfollowerUser._id.toString(),
      unfollowedUser._id.toString()
    );

    logger.info(
      `Removed ${unfollowerUser.displayName} as follower of ${unfollowedUser.displayName}`
    );
  });

//setup local actor's outbox
federation
  .setOutboxDispatcher(
    "/users/{identifier}/outbox",
    async (ctx, identifier, cursor) => {
      logger.debug(`Outbox dispatcher called for: ${identifier}`);

      // Find user by username
      const user = await UserService.getUserByUsername(identifier);
      if (!user) {
        logger.warn(`User not found for outbox: ${identifier}`);
        return null;
      }

      const page = cursor ? parseInt(cursor) : 1;
      const limit = 20;

      // Get posts by user ID from database with pagination metadata
      const postsResult = await PostService.getUserPosts(
        user._id.toString(),
        page,
        limit
      );

      if (!postsResult || postsResult.items.length === 0) {
        return {
          items: [],
          nextCursor: null,
        };
      }

      const activities = postsResult.items.map((post) => {
        const noteId = post.activityPubUri;

        const note = new Note({
          id: new URL(noteId),
          content: post.caption,
          to: PUBLIC_COLLECTION,
          published: Temporal.Instant.fromEpochMilliseconds(
            new Date(post.createdAt).getTime()
          ),
          attachments: post.mediaUrl
            ? [
                new Image({
                  url: new URL(post.mediaUrl),
                  mediaType: post.mediaType,
                }),
              ]
            : undefined,
          attribution: ctx.getActorUri(identifier),
        });

        return new Create({
          id: new URL(`${noteId}/activity`),
          actor: ctx.getActorUri(identifier),
          object: note,
          to: new URL("https://www.w3.org/ns/activitystreams#Public"),
          published: Temporal.Instant.fromEpochMilliseconds(
            new Date(post.createdAt).getTime()
          ),
        });
      });

      return {
        items: activities,
        nextCursor: postsResult.nextCursor,
      };
    }
  )
  .setFirstCursor(async (ctx, identifier) => {
    return "1";
  })
  .setCounter(async (ctx, identifier) => {
    const user = await UserService.getUserByUsername(identifier);
    if (!user) return 0;

    const posts = await PostService.getUserPosts(user._id.toString());
    return posts.totalCount;
  })
  .setLastCursor(async (ctx, identifier) => {
    const user = await UserService.getUserByUsername(identifier);
    if (!user) return null;

    const posts = await PostService.getUserPosts(user._id.toString());
    return posts.last ? posts.last.toString() : null;
  });

federation
  .setFollowersDispatcher(
    "/users/{identifier}/followers",
    async (ctx, identifier, cursor) => {
      //get followers from db for identifier
      const user = await UserService.getUserByUsername(identifier);
      if (!user) return { items: [] };

      const followers = await FollowService.retrieveFollowers(user._id.toString());
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

    const stats = await FollowService.getFollowStats(user._id.toString());
    return stats.followerCount;
  });

federation.setFollowingDispatcher(
  "/users/{identifier}/following",
  async (ctx, identifier, cursor) => {
    //get following from db
    const user = await UserService.getUserByUsername(identifier);
    if (!user) return null;

    const following = await FollowService.retrieveFollowing(user._id.toString());
    const items = following.map((f) => new URL(f.actorId));

    return {
      items,
      nextCursor: null,
    };
  }
);

// Posts
federation.setObjectDispatcher(Note, "/posts/{id}", async (ctx, values) => {
  logger.debug(`Object dispatcher called for post: ${values.id}`);

  // Get post by ID from database
  const post = await PostService.getPostById(values.id);
  if (!post) {
    logger.warn(`Post not found: ${values.id}`);
    return null;
  }

  // Get the author's username for the actor URI
  const authorUsername = post.author?.username || "unknown";

  return new Note({
    id: ctx.getObjectUri(Note, values),
    attribution: ctx.getActorUri(authorUsername),
    to: PUBLIC_COLLECTION,
    cc: ctx.getFollowersUri(authorUsername),
    content: post.caption,
    published: Temporal.Instant.fromEpochMilliseconds(
      new Date(post.createdAt).getTime()
    ),
    attachments: post.mediaUrl
      ? [
          new Image({
            url: new URL(post.mediaUrl),
            mediaType: post.mediaType,
          }),
        ]
      : undefined,
  });
});

export default federation;

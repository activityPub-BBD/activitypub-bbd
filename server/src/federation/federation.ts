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
  MemoryKvStore,
  InProcessMessageQueue,
  Document,
  Like} from "@fedify/fedify";
import { getLogger } from "@logtape/logtape";
import { Temporal } from "@js-temporal/polyfill";
import { UserService } from "@services/userService";
import { KeyService } from "@services/keyService";
import { PostService } from "@services/postService";
import { FollowService } from "@services/followService";
import { retrieveRedisClient } from "@db/redis";

const logger = getLogger("server");

const redisClient = await retrieveRedisClient();

export const federation = createFederation({
  kv: new MemoryKvStore(),
  queue: new InProcessMessageQueue(),
  origin: 'https://mastodon.thups.co.za'
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
      publicKeys: [keys[0].cryptographicKey, keys[1].cryptographicKey],
      assertionMethods: keys.map((key) => key.multikey),
    });
  })
  .setKeyPairsDispatcher(async (ctx, identifier) => {
    logger.debug(`Key pairs dispatcher called for: ${identifier}`);
    const user = await UserService.getUserByUsername(identifier);
    if (user == null) return [];
    logger.debug(`Key pairs function called for: ${identifier}`);
    return await KeyService.getKeyPairsForUser(user._id.toString());
  });

//setup local actor's inbox
federation
  .setInboxListeners("/users/{identifier}/inbox", "/inbox")
  .on(Follow, async (ctx, follow) => {
    logger.info("== Received Follow activity ==");
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
    let icon = await follower.getIcon()
    let avatarUrl

    if (icon) {
      avatarUrl = icon.url?.href?.toString()
    } else {
      avatarUrl = ""
      logger.debug("NO ICON FOUND")
    }

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
        avatarUrl: avatarUrl,
      });

      logger.info("== Before addig user to graph ==");

      // Add the user to the graph db
      const success = await UserService.addUserToGraphDb(followerUser);
      if (!success) {
        logger.warn(
          `Failed to add user to graph db: ${followerUser.displayName}`
        );
      }

      logger.info(
        `Created new remote user: ${followerUser.displayName} from ${followerDomain}`
      );
    }
    logger.info("== Before addig follow relationship to graph ==");
    
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
  })
  .on(Create, async (ctx, create) => {
    const object = await create.getObject();
    if (!(object instanceof Note)) return;
    const actor = create.actorId;
    if (actor == null) return;
    const author = await object.getAttribution();
    if (!isActor(author) || author.id?.href !== actor.href) return;
    
    // add user to db if DNE or just find them if they do exist
    let postUser = await UserService.getUserByActorId(author.id.href);
    let icon = await author.getIcon()
    let avatarUrl

    if (icon) {
      avatarUrl = icon.url?.href?.toString()
    } else {
      avatarUrl = ""
      logger.debug("NO ICON FOUND")
    }
    if (!postUser) {
      // Extract username and domain from the follower's actor ID
      const postUserUrl = new URL(author.id.href);
      const postUserPath = postUserUrl.pathname;
      const postUserUsername = postUserPath.split("/").pop() || "unknown";
      const postUserDomain = postUserUrl.hostname;

      // Create the remote user
      postUser = await UserService.createRemoteUser({
        actorId: author.id.href,
        username: postUserUsername,
        domain: postUserDomain,
        displayName: author.name?.toString() || postUserUsername,
        inboxUrl: author.inboxId!.href,
        outboxUrl: author.outboxId?.href || "",
        followersUrl: author.followersId?.href || "",
        followingUrl: author.followingId?.href || "",
        bio: author.summary?.toString() || "",
        avatarUrl: avatarUrl,
      });

      logger.info("== Before addig user to graph ==");

      // Add the user to the graph db
      const success = await UserService.addUserToGraphDb(postUser);
      if (!success) {
        logger.warn(
          `Failed to add user to graph db: ${postUser.displayName}`
        );
      }
      logger.info(
        `Created new remote user: ${postUser.displayName} from ${postUserDomain}`
      );
    }

    if (postUser == null) return;
    if (object.id == null) return;
    const content = object.content?.toString();
    const attachments = object.getAttachments();
    
    // Save the post to MongoDB
    try {
      let mediaUrl: string = "";
      let mediaType: string = "";
      
      if (attachments) {
        for await (const attachment of attachments) {
          if (attachment instanceof Image) {
            mediaUrl = attachment.url?.href?.toString() || "";
            mediaType = attachment.mediaType || "";
            break; 
          }
          if (attachment instanceof Document) {
            mediaUrl = attachment.url?.href?.toString() || "";
            mediaType = attachment.mediaType || "";
            break; // just accomodatin mastodon since it uses documents for images, videos, etc
          }
        }
      }

      const postData = {
        authorId: postUser._id.toString(),
        caption: content || "",
        mediaUrl: mediaUrl,
        mediaType: mediaType,
        activityPubUri: object.id.href
      };
      
      const savedPost = await PostService.createPost(postData);
      logger.info(`Saved remote post to database: ${savedPost._id} from ${postUser.displayName}`);
    } catch (error) {
      logger.error(`Failed to save remote post to database: ${error}`);
    }
  })
  .on(Accept, async (ctx, accept) => {
    logger.info("== Received Accept activity ==");
    const object = await accept.getObject();
    if (!(object instanceof Follow)) {
      logger.warn("Accept object is not a Follow activity");
      return;
    }

    const followerActor = object.actorId?.href;
    const followeeActor = object.objectId;

    if (!followerActor || !followeeActor) {
      logger.warn("Follow activity is missing actor or object");
      return;
    }
    // We assume the local user is the actor who originally sent the Follow
    const localUser = await UserService.getUserByActorId(followerActor);
    const remoteUser = await UserService.getUserByActorId(followeeActor.href);

    if (!localUser || !remoteUser) {
      logger.warn("Could not find users in database for Accept: ", {
        followerActor,
        followeeActor: followeeActor.href,
      });
      return;
    }
    logger.info(
      `Follow request from ${localUser.displayName} to ${remoteUser.displayName} has been accepted.`
    );
  })
  .on(Like, async (ctx, like) => {
    logger.debug("== Received Like activity ==");
    if (like.objectId == null) {
      logger.debug("The Like object does not have an object: {like}", {
        like,
      });
      return;
    }
    const object = ctx.parseUri(like.objectId);
    if (object == null) {
      logger.debug("The Like object's object is not an actor: {like}", {
        like,
      });
      return;
    }

    const actor = await like.getActor();
    if (actor?.id == null || actor.inboxId == null) {
      logger.debug("The Like object does not have an actor: {like}", {
        like,
      });
      return;
    }

    // Find the post locally
    const post = await PostService.getPostByActivityId(like.objectId.toString());
    if (!post) {
      logger.warn("Post not found for Like activity");
      return;
    }

    // Ensure the actor is in DB
    let likingUser = await UserService.getUserByActorId(actor.id.href);
    if (!likingUser) {
      const actorUrl = new URL(actor.id.href);
      const username = actorUrl.pathname.split("/").pop() || "unknown";
      let avatar = await actor.getIcon();
      let avatarUrl
      if (avatar && avatar.url) {
          avatarUrl = avatar.url.href?.toString()
      }
      
      likingUser = await UserService.createRemoteUser({
        actorId: actor.id.href,
        username,
        domain: actorUrl.hostname,
        displayName: actor.name?.toString() || username,
        inboxUrl: actor.inboxId?.href || "",
        outboxUrl: actor.outboxId?.href || "",
        followersUrl: actor.followersId?.href || "",
        followingUrl: actor.followingId?.href || "",
        bio: actor.summary?.toString() || "",
        avatarUrl: avatarUrl || "",
      });

      await UserService.addUserToGraphDb(likingUser);
    }

    let isLikedPost = await PostService.likePost(post.id, likingUser.id);
    // Add to local post likes
    if (isLikedPost) {
        logger.info(`${likingUser.displayName} liked post ${post._id}`);
    } else {
        logger.info(`${likingUser.displayName} already liked post ${post._id}`);
    }
    
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
          to: PUBLIC_COLLECTION,
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
)
.setCounter(async (ctx, identifier) => {
    // count followers in db
    const user = await UserService.getUserByUsername(identifier);
    if (!user) return 0;

    const stats = await FollowService.getFollowStats(user._id.toString());
    return stats.followingCount;
  });

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

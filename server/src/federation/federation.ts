import { createFederation, Person, Image, Create, Note, Follow, Accept, Undo, type Recipient, PUBLIC_COLLECTION, isActor, getActorHandle, importJwk, exportJwk, generateCryptoKeyPair } from "@fedify/fedify";
import { getLogger } from "@logtape/logtape";
import { MemoryKvStore, InProcessMessageQueue } from "@fedify/fedify";
import { Temporal } from "@js-temporal/polyfill";
import { Types } from 'mongoose';
import { ObjectId } from "mongodb";
import { UserService } from "@services/userService.ts";
import { retrieveDb } from "@db/index.ts";
import { registerModels, type IUser } from "@models/index.ts";
import { config } from "@config/index.ts";
import { KeyService } from "@services/keyService.ts";

const logger = getLogger("fedify");

const db = await retrieveDb(config.dbName);         
const {User: UserModel, Follow: FollowModel} = registerModels(db);

export const federation = createFederation({
  kv: new MemoryKvStore(),
  queue: new InProcessMessageQueue(),
});

//  fetch local actor
federation.setActorDispatcher("/users/{identifier}", async (ctx, identifier) => {
  logger.debug(`Actor dispatcher called for: ${identifier}`);

  // find local actor/user
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
    icon: user.avatarUrl ? new Image({
      url: new URL(user.avatarUrl),
      mediaType: "image/jpeg",
    }) : undefined,
    inbox: ctx.getInboxUri(identifier),
    followers: ctx.getFollowersUri(identifier),
    following: ctx.getFollowingUri(identifier),
    discoverable: true,
    publicKey: keys[0].cryptographicKey,
    assertionMethods: keys.map((k) => k.multikey),
  });
})
  .setKeyPairsDispatcher(async (ctx, identifier) => {
    return KeyService.getOrCreateKeyPairs(identifier);
});

//setup local actor's inbox
federation.setInboxListeners("/users/{identifier}/inbox", "/inbox")
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

    //find user being followed in our db
    const followingUser = await UserService.getUserByUsername(object.identifier);
    if (!followingUser) {
      logger.debug("Failed to find the actor to follow in the database: {object}", { object });
      return;
    }
    const followingId = followingUser.id;
    const followerHandle = await getActorHandle(follower);

    //Add a new follower actor record or update if it already exists
    const followerData = {
      actorId: follower.id.href,
      handle: followerHandle,
      displayName: follower.name?.toString() ?? '',
      inboxUrl: follower.inboxId.href,
      url: follower.url?.href ?? '',
      isLocal: false,
      createdAt: new Date(),
    };

    const followerUser = await UserModel.findOneAndUpdate(
      { actorId: followerData.actorId },
      followerData,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    const followerId = followerUser.id;

    // Create the follow relation if it doesn't exist yet
    const existingFollow = await FollowModel.findOne({
      followingId: followingId,
      followerId: followerId,
    });

    if (!existingFollow) {
      await FollowModel.create({
        followingId: followingId,
        followerId: followerId,
        createdAt: new Date(),
      });
    }
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

    //Find the local user by username
    const followingActor = await UserService.getUserByUsername(parsed.identifier);
    if (!followingActor) {
      logger.error("Remote user being unfollowed not found")
      throw new Error("Remote user being unfollowed not found")
    };
    
    // Find the remote follower actor by URI
    const followerActor = await UserService.getUserByActivityPubUri(undo.actorId.href);
    if (!followerActor) {
      logger.error("Follower actor not found")
      throw new Error("Follower actor not found")
    };
    
    //remove remote actor follow from follow & user collection
    await FollowModel.deleteOne({
      followingId: followingActor._id,
      followerId: followerActor._id,
    });
    await UserService.deleteUserByActivityPubUri(undo.actorId.href);
})
// .on(Accept, async (ctx, accept) => {
//     const follow = await accept.getObject();
//     if (!(follow instanceof Follow)) return;
//     const following = await accept.getActor();
//     if (!isActor(following)) return;
//     const follower = follow.actorId;
//     if (follower == null) return;
//     const parsed = ctx.parseUri(follower);
//     if (parsed == null || parsed.type !== "actor") return;
//     const followingId = (await persistActor(following))?.id;
//     if (followingId == null) return;
//     //add follower to db
// });

//setup local actor's outbox


federation.setOutboxDispatcher("/users/{identifier}/outbox", async (ctx, identifier, cursor) => {
  //todo find user
  const user = null;
  if (!user) return null;
  
  const page = cursor ? parseInt(cursor) : 1;
  const limit = 20;
  //todo get posts by user id
  const posts = [{
  _id: new ObjectId("64e4f1f28f1c2b5c1f8d1234"),
  author: new ObjectId("64e4f1c28f1c2b5c1f8d5678"), // Dummy user ID
  caption: "A beautiful sunset at the beach 🌅",
  mediaUrl: "https://your-s3-bucket.s3.amazonaws.com/media/sunset.jpg",
  mediaType: "image/jpeg",
  uri: "http://localhost:8000/users/cindi/posts/1",
  likes: [
    new ObjectId("64e4f1d38f1c2b5c1f8d9012"),
    new ObjectId("64e4f1d48f1c2b5c1f8d3456")
  ],
  likesCount: 2,
  createdAt: new Date("2025-07-31T15:45:00Z")
}];
  
  const activities = posts.map(post => {
    const noteId = post.uri;
    
    const note = new Note({
      id: new URL(noteId),
      content: post.caption,
      to: PUBLIC_COLLECTION,
      published: Temporal.Instant.fromEpochMilliseconds(post.createdAt.getTime()),
      attachments: [new Image({
        url: new URL(post.mediaUrl),
        mediaType: post.mediaType,
      })],
      attribution: ctx.getActorUri(identifier),
    });
    
    return new Create({
      id: new URL(`${noteId}/activity`),
      actor: ctx.getActorUri(identifier),
      object: note,
      to: new URL("https://www.w3.org/ns/activitystreams#Public"),
      published: Temporal.Instant.fromEpochMilliseconds(post.createdAt.getTime()),
    });
  });
  
  return {
    items: activities,
    nextCursor: posts.length === limit ? (page + 1).toString() : null,
  };
});


federation.setFollowersDispatcher(
    "/users/{identifier}/followers",
    async (_ctx, identifier) => {
      //get following from db
      const user =  await UserService.getUserByUsername(identifier);
      if (!user) return null;
      
      const followers = await FollowModel.find({ followingId: user._id })
          .populate('followerId', 'actorId inboxUrl')
      
      const items: Recipient[] = followers.map((f:any) => {
          return {
            id: new URL(f.followerId.actorId),
            inboxId: new URL(f.followerId.inboxUrl)
          }
        });
      return { items };
    },
)
.setCounter(async (_ctx, identifier) => {
    // count followers in db
    const user =  await UserService.getUserByUsername(identifier);
      if (!user) return null;
    const count = await FollowModel.countDocuments({
      followingId: user._id
    });

    return count == null ? 0 : count;
});

federation.setFollowingDispatcher("/users/{identifier}/following", async (ctx, identifier, cursor) => {
  // 
  return { items: [], nextCursor: false };
});

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
    new ObjectId("64e4f1d48f1c2b5c1f8d3456")
  ],
  likesCount: 2,
  createdAt: new Date("2025-07-31T15:45:00Z")
};
    if (!post) return null;

    return new Note({
      id: ctx.getObjectUri(Note, values),
      attribution: ctx.getActorUri(values.identifier),
      to: PUBLIC_COLLECTION,
      cc: ctx.getFollowersUri(values.identifier),
      content: post.caption,
      published: Temporal.Instant.fromEpochMilliseconds(post.createdAt.getTime()),
      attachments: [new Image({
        url: new URL(post.mediaUrl),
        mediaType: post.mediaType,
      })],
    });
  }
);


export default federation;

import { createFederation, Person, Image, Create, Note, Follow, Accept, Undo, type Recipient, PUBLIC_COLLECTION, isActor } from "@fedify/fedify";
import { getLogger } from "@logtape/logtape";
import { MemoryKvStore, InProcessMessageQueue } from "@fedify/fedify";
import { Temporal } from "@js-temporal/polyfill";
import { Types } from 'mongoose';
import { ObjectId } from "mongodb";

const logger = getLogger("backend");

export const federation = createFederation({
  kv: new MemoryKvStore(),
  queue: new InProcessMessageQueue(),
});

//setup local actor
federation.setActorDispatcher("/users/{identifier}", async (ctx, identifier) => {
  logger.debug(`Actor dispatcher called for: ${identifier}`);

  // find local actor/user
  // const user = await userService.findByUsername(identifier);
  // if (!user) {
  //   logger.warn(`User not found: ${identifier}`);
  //   return null;
  // }

  const user = {
      _id: new Types.ObjectId(),
      googleId: '123456789012345678901',
      domain: 'example.com',
      displayName: 'Cindi',
      bio: 'This is a dummy user for testing purposes.',
      uri: 'http://localhost:8000/users/cindi',
      inbox: 'http://localhost:8000/users/cindi/inbox'
  };
  logger.info(`User found: ${user.displayName}`);

  return new Person({
    id: ctx.getActorUri(identifier),
    preferredUsername: user.displayName,
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
    discoverable: true
  });
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

    //find followingID in our db
    const followingId = null;
    if (followingId == null) {
      logger.debug(
        "Failed to find the actor to follow in the database: {object}",
        { object },
      );
    }

    //Add a new follower actor record or update if it already exists
    const followerId = null
    // .get(
    //     follower.id.href,
    //     await getActorHandle(follower),
    //     follower.name?.toString(),
    //     follower.inboxId.href,
    //     follower.endpoints?.sharedInbox?.href,
    //     follower.url?.href,
    //   )?.id;
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
    //remove from DB
  
})
.on(Accept, async (ctx, accept) => {
    const follow = await accept.getObject();
    if (!(follow instanceof Follow)) return;
    const following = await accept.getActor();
    if (!isActor(following)) return;
    const follower = follow.actorId;
    if (follower == null) return;
    const parsed = ctx.parseUri(follower);
    if (parsed == null || parsed.type !== "actor") return;
    const followingId = (await persistActor(following))?.id;
    if (followingId == null) return;
    //add follower to db
});

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
    (ctx, identifier, cursor) => {
      //get followers from db for identifier
      const followers = [{
      _id: new Types.ObjectId(),
      googleId: '123456789012345678901',
      domain: 'example.com',
      displayName: 'Cindi',
      bio: 'This is a dummy user for testing purposes.',
       uri: 'http://localhost:8000/users/cindi',
       inbox: 'http://localhost:8000/users/cindi/inbox'
  },{
      _id: new Types.ObjectId(),
      googleId: '123456789012345678901',
      domain: 'example.com',
      displayName: 'Cindi',
      bio: 'This is a dummy user for testing purposes.',
       uri: 'http://localhost:8000/users/cindi',
       inbox: 'http://localhost:8000/users/cindi/inbox'
      }];
      const items: Recipient[] = followers.map((f) => ({
        id: new URL(f.uri),
        inboxId: new URL(f.inbox),
      }));
      return { items };
    },
)
.setCounter((ctx, identifier) => {
    // count followers in db
      return 10;
});

federation.setFollowingDispatcher("/users/{identifier}/following", async (ctx, identifier, cursor) => {
  //get following from db??
  const user = null;
  if (!user) return null;
  return {
    items: [],
    nextCursor: null,
  };
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

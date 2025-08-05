import { Create, Image, Like, Note, PUBLIC_COLLECTION } from "@fedify/fedify";
import { getLogger } from "@logtape/logtape";
import { type IPost, type IUser } from "@models/index";
import { FollowService } from "./followService";
import { Temporal } from "@js-temporal/polyfill";

const logger = getLogger("activity-service");

const queueCreateNoteActivity = async (
  post: IPost,
  author: IUser,
  federationContext?: any
): Promise<void> => {

  try {
    if (!federationContext) {
      logger.warn(
        `No federation context available for post ${post.activityPubUri}`
      );
      return;
    }
    const allFollowers = await FollowService.retrieveFollowers(author.id);
    const allFollowersActorIds = allFollowers.map(
      (follower) => follower.actorId
    );

    if (allFollowersActorIds.length === 0) {
      logger.info("No followers to send Create activity");
      return;
    }

    // Note object
    const note = new Note({
      id: new URL(post.activityPubUri),
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
      attribution: federationContext.getActorUri(author.username),
    });

    // Create(Note) activity
    const createActivity = new Create({
      id: new URL(`${post.activityPubUri}/activity`),
      actor: federationContext.getActorUri(author.username),
      object: note,
      to: PUBLIC_COLLECTION,
      published: Temporal.Instant.fromEpochMilliseconds(
        new Date(post.createdAt).getTime()
      ),
    });

    //it uses the followers collection dispatcher
    federationContext.sendActivity(
      { identifier: author.username },
      "followers",
      createActivity
    );
    logger.info(
      `Create activity delivery queued to ${allFollowersActorIds.length} followers`
    );
  } catch (error) {
    logger.error("Failed to queue create activity:", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

const queueLikeActivity = async (
  post: IPost,
  localUser: IUser,
  remoteAuthor: IUser,
  federationContext?: any
): Promise<void> => {
  
    const postUri = post.activityPubUri;
    const likeActivity = new Like({
      actor: new URL(localUser.actorId),
      object: new URL(postUri),
      to: new URL(remoteAuthor.actorId),
    });
    
    const actor = await federationContext.getActorById(remoteAuthor.actorId);
    if (actor) {
          logger.debug(
      `Found remote actor for Like activity delivery queued to ${actor.getActorUri(remoteAuthor.username)}`
    );
    }
    federationContext.sendActivity({ identifier: localUser.username, actor, likeActivity  });

    logger.info(
      `Like activity delivery queued to ${remoteAuthor.username}`
    );



};

export const ActivityService = {
    queueCreateNoteActivity,
    queueLikeActivity
}
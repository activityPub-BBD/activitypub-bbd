import { createFederation, Person, Follow } from "@fedify/fedify";
import { getLogger } from "@logtape/logtape";
import { MemoryKvStore, InProcessMessageQueue } from "@fedify/fedify";

const logger = getLogger("backend");

const federation = createFederation({
  kv: new MemoryKvStore(),
  queue: new InProcessMessageQueue(),
});

federation.setActorDispatcher(
  "/users/{identifier}",
  async (ctx, identifier) => {
    if (identifier !== "me") return null; // Other than "me" is not found.
    return new Person({
      id: ctx.getActorUri(identifier),
      name: "Me", // Display name
      summary: "This is me!", // Bio
      preferredUsername: identifier, // Bare handle
      url: new URL("/", ctx.url),
      inbox: ctx.getInboxUri(identifier),
    });
  }
);

federation
  .setInboxListeners("/users/{identifier}/inbox", "/inbox")
  .on(Follow, async (ctx, follow) => {
    if (
      follow.id == null ||
      follow.actorId == null ||
      follow.objectId == null
    ) {
      return;
    }
    const parsed = ctx.parseUri(follow.objectId);
    if (parsed?.type !== "actor" || parsed.identifier !== "me") return;
    const follower = await follow.getActor(ctx);
    console.debug(follower);
  });

export default federation;

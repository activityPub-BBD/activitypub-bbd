import { retrieveNeo4jDriver } from "@db/index";
import neo4j from 'neo4j-driver';
import { UserService } from "./userService";

export async function getFollowStats(id: string): Promise<{id: string;followingCount: number;followerCount: number;}> {
    const driver = await retrieveNeo4jDriver();
    const result = await driver.executeQuery(
        `
        MATCH (P:Person {_id: $id})
        OPTIONAL MATCH (P)-[:Follows]->(following:Person)
        OPTIONAL MATCH (follower:Person)-[:Follows]->(P)
        RETURN 
        P._id AS id,
        count(DISTINCT following) AS followingCount,
        count(DISTINCT follower) AS followerCount
        `,
        { id }
    );

    const record = result.records[0];
    return {
        id: record.get('id') as string,
        followingCount: record.get('followingCount').toInt() as number,
        followerCount: record.get('followerCount').toInt() as number,
    };
}

export async function followUser(followerId: string, followingId: string, accepted: boolean): Promise<boolean> {
  const driver = await retrieveNeo4jDriver();
  const result = await driver.executeQuery(
      `
      MATCH (A:Person {_id: $followerId}), (B:Person {_id: $followingId})
      MERGE (A)-[R:Follows]->(B)
      ON CREATE SET
          R.accepted = $accepted,
          R.createdAt = $createdAt
      RETURN R;
      `,
      {
        followerId,
        followingId,
        accepted,
        createdAt: neo4j.types.DateTime.fromStandardDate(new Date()),
      }
    );
    return result.records.length > 0;
  
}

export async function unfollowUser(followerId: string, followingId: string): Promise<boolean> {
  const driver = await retrieveNeo4jDriver();
  const result = await driver.executeQuery(
    `
    MATCH (A:Person {_id: $followerId})-[R:Follows]->(B:Person {_id: $followingId})
    WITH count(R) AS relCount, R
    DELETE R
    RETURN relCount > 0 AS deleted;
    `,
    { followerId, followingId }
  );

  return result.records[0].get('deleted') as boolean;
}

export async function retrieveFollowing(
  followerId: string
): Promise<{
  id: string;
  actorId: string;
  inboxUrl: string;
  createdAt: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}[]> {
  const driver = await retrieveNeo4jDriver();
  const result = await driver.executeQuery(
    `
    MATCH (P:Person {_id: $followerId})-[:Follows]->(followee:Person)
    RETURN 
        followee._id AS id,
        followee.actorId AS actorId,
        followee.inboxUrl AS inboxUrl, 
        followee.createdAt AS createdAt
    `,
    { followerId }
  );

  const following = await Promise.all(
    result.records.map(async (record) => {
      const actorId = record.get('actorId') as string;
      const user = await UserService.getUserByActorId(actorId);

      return {
        id: record.get('id') as string,
        actorId,
        inboxUrl: record.get('inboxUrl') as string,
        createdAt: new Date(record.get('createdAt')).toISOString(),
        displayName: user!.displayName,
        username: user!.username,
        avatarUrl: user!.avatarUrl,
      };
    })
  );

  return following;
}

export async function retrieveFollowers(
  followingId: string
): Promise<{
  id: string;
  actorId: string;
  inboxUrl: string;
  createdAt: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}[]> {
  const driver = await retrieveNeo4jDriver();
  const result = await driver.executeQuery(
    `
    MATCH (follower:Person)-[:Follows]->(:Person {_id: $followingId})
    RETURN 
        follower._id AS id,
        follower.actorId AS actorId,
        follower.inboxUrl AS inboxUrl,
        follower.createdAt AS createdAt
    `,
    { followingId }
  );

  const followers = await Promise.all(
    result.records.map(async (record) => {
      const actorId = record.get('actorId') as string;
      const user = await UserService.getUserByActorId(actorId);

      return {
        id: record.get('id') as string,
        actorId,
        inboxUrl: record.get('inboxUrl') as string,
        createdAt: new Date(record.get('createdAt')).toISOString(),
        displayName: user!.displayName,
        username: user!.username,
        avatarUrl: user!.avatarUrl,
      };
    })
  );
  return followers;
}


export async function retrieveSuggestedMutuals(
  followingId: string
): Promise<
  {
    id: string;
    actorId: string;
    inboxUrl: string;
    createdAt: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    followersCount: number;
  }[]
> {
  const driver = await retrieveNeo4jDriver();
  const result = await driver.executeQuery(
    `
        MATCH (start:Person {_id: $followingId})-[:Follows*1..3]->(suggested:Person)
        WHERE NOT (start)-[:Follows]->(suggested) 
        AND start <> suggested                  
        WITH DISTINCT suggested                  
        MATCH (follower:Person)-[:Follows]->(suggested)
        RETURN
            suggested._id AS id,
            suggested.actorId AS actorId,
            suggested.inboxUrl AS inboxUrl,
            suggested.createdAt AS createdAt,
            COUNT(follower) AS followers
        ORDER BY followers DESC
        LIMIT 20
        `,
    { followingId }
  );
  const suggestedMutuals = await Promise.all(
    result.records.map(async (record) => {
      const actorId = record.get("actorId") as string;
      const user = await UserService.getUserByActorId(actorId);

      return {
        id: record.get("id") as string,
        actorId,
        inboxUrl: record.get("inboxUrl") as string,
        createdAt: new Date(record.get("createdAt")).toISOString(),
        displayName: user!.displayName,
        username: user!.username,
        avatarUrl: user!.avatarUrl,
        followersCount: record.get("followers").toInt()
      };
    })
  );
  return suggestedMutuals;
}

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const driver = await retrieveNeo4jDriver();
  const result = await driver.executeQuery(
    `
    MATCH (A:Person {_id: $followerId})-[R:Follows]->(B:Person {_id: $followingId})
    RETURN count(R) > 0 AS isFollowing
    `,
    { followerId, followingId }
  );

  return result.records[0].get('isFollowing') as boolean;
}

export async function retrievePopularUsers(){
  const driver = await retrieveNeo4jDriver();
  const result = await driver.executeQuery(
    `
    MATCH (follower:Person)-[:Follows]->(P:Person)
    WITH P, COUNT(follower) AS followerCount
    RETURN 
      P._id AS id,
      P.actorId AS actorId,
      P.inboxUrl AS inboxUrl,
      P.createdAt AS createdAt,
      followerCount
    ORDER BY followerCount DESC
    LIMIT 20
    `,
  );

  const popularUsers = await Promise.all(
    result.records.map(async (record) => {
      const actorId = record.get('actorId') as string;
      const user = await UserService.getUserByActorId(actorId);

      return {
        id: record.get('id') as string,
        actorId,
        inboxUrl: record.get('inboxUrl') as string,
        createdAt: new Date(record.get('createdAt')).toISOString(),
        displayName: user!.displayName,
        username: user!.username,
        avatarUrl: user!.avatarUrl,
        followersCount: record.get('followerCount').toInt()
      };
    })
  );
  return popularUsers;
}

export const FollowService = { 
  getFollowStats, 
  followUser, 
  unfollowUser, 
  retrieveFollowing, 
  retrieveFollowers, 
  retrieveSuggestedMutuals,
  isFollowing,
  retrievePopularUsers
};
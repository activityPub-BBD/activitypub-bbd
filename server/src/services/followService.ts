import { retrieveNeo4jDriver } from "@db/index.ts";

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

export async function followUser(followerId: string, followingId: string, inboxUrl: string, accepted: boolean): Promise<boolean> {
    const driver = await retrieveNeo4jDriver();
    const result = await driver.executeQuery(
        `
        MATCH (A:Person {_id: $followerId}), (B:Person {_id: $followeeId})
        MERGE (A)-[R:Follows]->(B)
        ON CREATE SET
            R.inboxUrl = $inboxUrl,
            R.accepted = $accepted,
            R.createdAt = $createdAt
        RETURN R;
        `,
        { 
            followerId,
            followingId,
            inboxUrl,
            accepted,
            createdAt: new Date(),
         }
    );

    return result.records.length > 0;
}

export async function unfollowUser(followerId: string, followingId: string): Promise<boolean> {
    const driver = await retrieveNeo4jDriver();
    const result = await driver.executeQuery(
        `
        MATCH (A:Person {_id: $followerId})-[R:Follows]->(B:Person {_id: $followingId})
        WITH R
        DELETE R
        RETURN count(R) > 0 AS deleted;
        `,
        { followerId, followingId }
    );

    return result.records[0].get('deleted') as boolean;
}

export async function retrieveFollowing(followerId: string): Promise<{ id: string; actorId: string; inboxUrl: string; createdAt: Date; }[]> {
    const driver = await retrieveNeo4jDriver();
    const result = await driver.executeQuery(
        `
        MATCH (P:Person {_id: $followerId})-[:Follows]->(followee:Person)
        RETURN 
            followee._id AS id, 
            followee.actorId AS actorId, 
            followee.inboxUrl AS inboxUrl, 
            followee.createdAt AS createdAt;
        `,
        { followerId }
    );
    return result.records.map((record) => {
        return {
            id: record.get('id') as string,
            actorId: record.get('actorId') as string,
            inboxUrl: record.get('inboxUrl') as string,
            createdAt: record.get('createdAt') as Date,
        };
    });
}

export async function retrieveFollowers(followingId: string){
    const driver = await retrieveNeo4jDriver();
    const result = await driver.executeQuery(
        `
        MATCH (follower:Person)-[:Follows]->(:Person {_id: $personId})
        RETURN 
            follower._id AS id,
            follower.actorId AS actorId,
            follower.inboxUrl AS inboxUrl,
            follower.createdAt AS createdAt;
        `,
        { followingId }
    );
    return result.records.map((record) => {
        return {
            id: record.get('id') as string,
            actorId: record.get('actorId') as string,
            inboxUrl: record.get('inboxUrl') as string,
            createdAt: record.get('createdAt') as Date,
        };
    });
}

export async function retrieveSuggestedMutuals(followingId: string, connectionDepth = 3){
    const driver = await retrieveNeo4jDriver();
    const result = await driver.executeQuery(
        `
        MATCH (start:Person {_id: $followingId})-[:Follows*1..$connectionDepth]->(suggested:Person)
        WHERE NOT (start)-[:Follows]->(suggested)
        AND start <> suggested
        OPTIONAL MATCH (others:Person)-[:Follows]->(suggested)
        RETURN suggested._id AS id, suggested.actorId AS actorId, suggested.createdAt AS createdAt, suggested.inboxUrl AS inboxUrl, count(others) AS followers
        ORDER BY followers DESC
        LIMIT 20
        `,
        { 
            followingId,
            connectionDepth
         }
    );
    return result.records.map((record) => {
        return {
            id: record.get('id') as string,
            actorId: record.get('actorId') as string,
            inboxUrl: record.get('inboxUrl') as string,
            createdAt: record.get('createdAt') as Date,
            followers: record.get('followers').toInt() as number
        };
    });
}

export const FollowService = { getFollowStats, followUser, unfollowUser, retrieveFollowing, retrieveFollowers, retrieveSuggestedMutuals };
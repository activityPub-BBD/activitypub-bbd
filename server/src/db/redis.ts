import {Redis} from "ioredis";
import { config } from '@config/index.ts';

const redisClient = new Redis({
    username: config.redis.username,
    password: config.redis.password,
    host: config.redis.host,
    port: config.redis.port
});

export async function connectToRedis() {
    const response = await redisClient.ping();
    if (response === "PONG"){ 
        console.log("Redis is already connected");
        return;
    }
    await redisClient.connect();
    const res = await redisClient.ping();
    if(res === "PONG"){
        console.log("Connected to Redis");
    } else{
        console.log("Error connecting to Redis");
    }
}

export async function retrieveRedisClient() {
    await connectToRedis();
    return redisClient;
}
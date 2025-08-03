import { config } from '@config/index';
import * as Neo4j from 'neo4j-driver';
import { Mutex } from "@utils/index";

const neo4jDriverMutex = new Mutex<Neo4j.Driver | undefined>(undefined);

export async function connectToNeo4j() {
    await neo4jDriverMutex.update((neo4jDriver) => {
        if(neo4jDriver){ 
            // do nothing as we already have a connection
        } else{
            neo4jDriver = Neo4j.driver(config.neo4j.uri, Neo4j.auth.basic(config.neo4j.user, config.neo4j.password));
            console.log('Connection to Neo4j established');
        }
        return neo4jDriver;
    })
}

export async function disconnectFromNeo4j(){
    await neo4jDriverMutex.update(async(neo4jDriver) => {
        await neo4jDriver?.close();
        neo4jDriver = undefined;
        return neo4jDriver;
    })
}

export async function retrieveNeo4jDriver(): Promise<Neo4j.Driver> {
    await connectToNeo4j();
    return neo4jDriverMutex.with((neo4jDriver) => neo4jDriver!);
}
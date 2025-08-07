import {QdrantClient} from '@qdrant/js-client-rest';
import { pipeline } from "@xenova/transformers";
import { config } from '@config/config';
import type { IPost } from '@models/post';
import { v4 as uuidv4 } from 'uuid';

const qdrant = new QdrantClient({
    url: config.qdrant.url,
    apiKey: config.qdrant.apiKey
});
const encoder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
const VECTOR_DIM = 384; // Model-dependent, all-MiniLM-L6-v2 is 384

const embed = async (textToBeEmbedded: string): Promise<number[]> => {
  const output = await encoder(textToBeEmbedded, { pooling: "mean", normalize: true });
  const list = output.tolist();
  if (!Array.isArray(list)) {
    throw new Error("Embedding failed: tolist() did not return an array");
  }

  if (Array.isArray(list[0])) {
    return list[0];
  }

  return list;
};

export const createNewCollectionIfNotExists = async () => {
    const collections = await qdrant.getCollections();
    const collectionNames = collections.collections.map((collection) => collection.name);
    if (collectionNames.includes(config.qdrant.collectionName)){
        console.log(`Collection ${config.qdrant.collectionName} already exists`);
    } else{
        await qdrant.createCollection(config.qdrant.collectionName, {
          vectors: { size: VECTOR_DIM, distance: "Cosine" },
        });
    }
}

export const upsertIntoQdrant = async (post: IPost) => {
    const vector = await embed(post.caption);
    await qdrant.upsert(config.qdrant.collectionName, {
      points: [
        {
          id: uuidv4(),
          vector,
          payload: {
            id: post.id
          },
        },
      ],
    });
}

export const findInQdrant = async (searchText: string) => {
    const queryVector = await embed(searchText);
    
    const results = await qdrant.search(config.qdrant.collectionName, {
      vector: queryVector,
      limit: 10,
    });
    return results;
}
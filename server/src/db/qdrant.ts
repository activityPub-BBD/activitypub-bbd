import {QdrantClient} from '@qdrant/js-client-rest';
import { config } from '@config/config';

const client = new QdrantClient({
    url: config.qdrant.url,
    apiKey: config.qdrant.apiKey
});
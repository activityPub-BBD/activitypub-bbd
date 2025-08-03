import { app } from "@app/index";
import { config } from "@config/index";
import { connectToMongo, connectToNeo4j, connectToRedis, connectToS3 } from '@db/index';
import "@utils/logging";

await connectToMongo();
await connectToS3();
await connectToNeo4j();
await connectToRedis();

app.listen(config.port, () => {
  console.log(`Server is running on http://localhost:${config.port} 🚀`);
});

import { app } from "@app/index.ts";
import { connectToMongo } from "@db/mongo.ts";
import { connectToNeo4j } from "@db/neo4j.ts";
import "@utils/logging.ts";

connectToMongo();
connectToNeo4j();

app.listen(8000, () => {
  console.log("Server started at http://localhost:8000");
});

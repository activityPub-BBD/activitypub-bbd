import { register } from "tsconfig-paths";
register(
  { 
    baseUrl: "./src", 
    paths: {
      "@app/*": ["app/*"],
      "@db/*": ["db/*"],
      "@config/*": ["config/*"],
      "@controllers/*": ["controllers/*"],
      "@federation/*": ["federation/*"],
      "@middleware/*": ["middleware/*"],
      "@models/*": ["models/*"],
      "@routes/*": ["routes/*"],
      "@services/*": ["services/*"],
      "@utils/*": ["utils/*"]
    } 
  }
);

import "@utils/logging.ts";

import { app } from "@app/index.ts";
import { config } from "@config/index.ts";
import { connectToMongo, disconnectFromMongo } from "@db/index.ts";

await connectToMongo();

app.listen(config.port, () => {
  console.log(`Server running on port🚀 ${config.port}`);
});

process.on('SIGTERM', async () => {
  await disconnectFromMongo();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await disconnectFromMongo();
  process.exit(0);
});
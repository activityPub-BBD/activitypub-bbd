import { register } from 'tsconfig-paths';
register(
  { 
    baseUrl: './src', 
    paths: {
      "@app/*": ["app/*"],
      "@db/*": ["db/*"],
      "@config/*": ["config/*"],
      "@controllers/*": ["controllers/*"],
      "@middleware/*": ["middleware/*"],
      "@models/*": ["models/*"],
      "@routes/*": ["routes/*"],
      "@services/*": ["services/*"],
      "@utils/*": ["utils/*"]
    } 
  }
);

import { app } from "@app/index.ts";
import { config } from "@config/index.ts";
import { connectToMongo, connectToNeo4j, connectToS3 } from '@db/index.ts';
import "@utils/logging.ts";

connectToMongo();
connectToS3();
connectToNeo4j();

app.listen(config.port, () => {
  console.log(`Server is running on port ${config.port} 🚀`);
});

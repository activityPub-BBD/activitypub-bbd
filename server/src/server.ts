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
import { connectToMongo } from '@db/index.ts';
import "@utils/logging.ts";

connectToMongo();

app.listen(config.port, () => {
  console.log(`Server is running on port ${config.port} 🚀`);
});

import { register } from 'tsconfig-paths';
register(
  { 
    baseUrl: './src', 
    paths: {
      "@app/*": ["app/*"],
      "@db/*": ["db/*"],
      "@config/*": ["config/*"],
      "@controllers/*": ["controllers/*"],
      "@federation/*": ["federation/*"],
      "@middleware/*": ["middleware/*"],
      "@models/*": ["models/*"],
      "@routes/*": ["routes/*"],
      "@utils/*": ["utils/*"]
    } 
  }
);

import "./logging.ts";

import { app } from '@app/index.ts';
import { config } from '@config/index.ts';
import { connectToMongo } from '@db/index.ts';

connectToMongo();

app.listen(config.port, () => {
  console.log(`Server running on port🚀 ${config.port}`);
});

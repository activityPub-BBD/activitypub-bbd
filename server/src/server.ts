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
      "@utils/*": ["utils/*"]
    } 
  }
);

import { app } from '@app/index';
import { config } from '@config/index';
import { connectToMongo } from '@db/index';

//connectToMongo();

app.listen(config.port, () => {
  console.log(`Server running on port🚀 ${config.port}`);
});
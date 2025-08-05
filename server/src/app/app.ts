import express from "express";
import cors from "cors";
import { integrateFederation } from "@fedify/express";
import { getLogger } from "@logtape/logtape";
import { federation }  from "@federation/index";
import {authRoutes, postRoutes, userRoutes, followRoutes} from "@routes/index"
import { attachFederationContext } from "@middleware/federation";

const logger = getLogger("server");

export const app = express();

app.set("trust proxy", true);

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://d7uwchvpta0lr.cloudfront.net'
  ],
  credentials: true
}));



app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/posts', attachFederationContext, postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/follows', attachFederationContext, followRoutes);

//FEDIFY
app.use(integrateFederation(federation, (req: express.Request) => {
  const isFedifyRequest = req.headers.accept?.includes('activity+json') ||
                          req.path.startsWith('/users/') ||
                          req.path.includes('/inbox') ||
                          req.path.includes('/outbox');

  if (!isFedifyRequest) return undefined; // Let other middleware handle it
}));

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

export default app;
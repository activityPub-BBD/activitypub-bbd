import express from "express";
import cors from "cors";
import { integrateFederation } from "@fedify/express";
import { getLogger } from "@logtape/logtape";
import { federation }  from "@federation/index.ts";
import {authRoutes, postRoutes} from "@routes/index.ts"

const logger = getLogger("server");

export const app = express();

app.set("trust proxy", true);

app.use(cors({
  origin: 'http://localhost:5173', // Your frontend URL
  credentials: true
}));

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://d7uwchvpta0lr.cloudfront.net'
  ],
  credentials: true
}));



app.use(integrateFederation(federation, (req: express.Request) => undefined));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//ROUTES
app.use('/auth', authRoutes);
app.use('/posts', postRoutes);

//FEDIFY
app.use(integrateFederation(federation, (req: express.Request) => undefined));

export default app;
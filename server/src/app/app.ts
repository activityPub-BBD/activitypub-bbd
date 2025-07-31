import express from "express";
import cors from "cors";
import { integrateFederation } from "@fedify/express";
//import { getLogger } from "@logtape/logtape";
import {federation} from "@federation/index.ts";
import dotenv from 'dotenv';
import { authRouter } from "@routes/authRouter.ts";

//const logger = getLogger("activitypub");
dotenv.config();
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

app.get("/", (req, res) => res.send("Hello, Fedify!"));
app.use('/auth', authRouter);

export default app;

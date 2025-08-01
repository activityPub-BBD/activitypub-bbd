import express from "express";
import { integrateFederation } from "@fedify/express";
import { getLogger } from "@logtape/logtape";
import { federation }  from "@federation/index.ts";
import {authRoutes, postRoutes} from "@routes/index.ts"

const logger = getLogger("server");

export const app = express();

app.set("trust proxy", true);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//ROUTES
app.use('/auth', authRoutes);
app.use('/posts', postRoutes);

//FEDIFY
app.use(integrateFederation(federation, (req: express.Request) => undefined));

export default app;
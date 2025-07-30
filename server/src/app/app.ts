import express from "express";
import { integrateFederation } from "@fedify/express";
import { getLogger } from "@logtape/logtape";
import federation from "./federation.ts";

const logger = getLogger("activitypub");

export const app = express();

app.set("trust proxy", true);

app.use(integrateFederation(federation, (req: express.Request) => undefined));

app.get("/", (req, res) => res.send("Hello, Fedify!"));

export default app;

import express from "express";
import { integrateFederation } from "@fedify/express";
import { getLogger } from "@logtape/logtape";
import federation from "./federation/federation.ts";

const logger = getLogger("backend");

export const app = express();

app.set("trust proxy", true);

app.use(integrateFederation(federation, (req) => undefined));

app.get("/", (req, res) => res.send("Hello, Fedify!"));

export default app;

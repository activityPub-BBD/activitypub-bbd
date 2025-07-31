import express from "express";
import { integrateFederation } from "@fedify/express";
import { getLogger } from "@logtape/logtape";
import { federation }  from "@federation/index.ts";
import { authRouter } from "@routes/authRouter.ts";
//const logger = getLogger("backend");

export const app = express();

app.set("trust proxy", true);

app.use(integrateFederation(federation, (req: express.Request) => undefined));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => res.send("Hello, Fedify!"));
app.use('/auth', authRouter);

export default app;
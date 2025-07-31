import express from 'express';
import { getGoogleJwt} from "../controllers/authController.ts";

export const authRouter = express.Router();

authRouter.post('/', getGoogleJwt); 
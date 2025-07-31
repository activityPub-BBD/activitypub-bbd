import express from 'express';
import { getGoogleJwt, setupUsername} from "../controllers/authController.ts";

export const authRouter = express.Router();

authRouter.post('/', getGoogleJwt); 
authRouter.post('/setup-username', setupUsername);
import { Router } from "express";
import { getGoogleJwt, setupUsername} from "../services/authService.ts";

export const authRoutes = Router();

authRoutes.post('/', getGoogleJwt); 
authRoutes.post('/setup-username', setupUsername);

export default authRoutes;
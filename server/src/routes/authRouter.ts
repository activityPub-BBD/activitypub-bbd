import { Router } from "express";
import { getGoogleJwt, setupDisplayName} from "../services/authService.ts";

export const authRoutes = Router();

authRoutes.post('/', getGoogleJwt); 
authRoutes.post('/setup-displayName', setupDisplayName);

export default authRoutes;
import { Router } from "express";
import { getGoogleJwt, updateDisplayName} from "../services/authService.ts";

export const authRoutes = Router();

authRoutes.post('/', getGoogleJwt); 
authRoutes.post('/displayName', updateDisplayName);

export default authRoutes;
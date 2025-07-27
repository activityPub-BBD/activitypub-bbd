import { Router } from 'express';
import { home } from '../controllers/index';

const router = Router();

router.get('/', home);

export default router;

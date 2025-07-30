import express from 'express';
import dotenv from 'dotenv';
import { authRouter } from '@routes/authRouter';

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/auth', authRouter);

export { app };
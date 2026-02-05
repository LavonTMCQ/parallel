import { PrismaClient } from '@prisma/client';
import { validateEnv } from './env';

// Ensure env is valid before Prisma reads DATABASE_URL
validateEnv();

export const prisma = new PrismaClient();

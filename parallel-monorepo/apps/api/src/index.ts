import dotenv from 'dotenv';
dotenv.config();
// (debug log removed)
import express from 'express';
import cors, { type CorsOptions } from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import { prisma } from './lib/prisma';
import { IS_PROD, parsePort, parseCorsOrigins } from './lib/env';

// Route Imports
import categoriesRouter from './routes/categories';
import searchRouter from './routes/search';
import listingsRouter from './routes/listings.router';
import ingestRouter from './routes/ingest.router';
import offersRouter from './routes/offers.router';
import watchlistRouter from './routes/watchlist.router';
import usersRouter from './routes/users.router';
import stripeRouter from './routes/stripe.router';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

const PORT = parsePort(process.env.PORT, 8000);

const corsAllowlist = parseCorsOrigins(process.env.CORS_ORIGINS);
const corsOrigin: CorsOptions["origin"] = (origin, callback) => {
  // Allow non-browser clients (no Origin header)
  if (!origin) return callback(null, true);

  // Dev: allow all origins for local iteration
  if (!IS_PROD) return callback(null, true);

  // Prod: strict allowlist
  if (corsAllowlist.includes(origin)) return callback(null, true);

  return callback(null, false);
};

// Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);
app.use(
  cors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id'],
  }),
);
// Stripe webhook needs raw body, so we apply express.json() after its route.
// See stripe.router.ts for the raw body parser middleware.
app.use(express.json({ limit: '1mb' }));
app.use(morgan(IS_PROD ? 'combined' : 'dev'));

// --- ROUTES ---

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'parallel-api-v2' });
});

// Domain Routers
app.use('/api/v1/categories', categoriesRouter);
app.use('/api/v1/search', searchRouter);
app.use('/api/v1/listings', listingsRouter);
app.use('/api/v1/ingest', ingestRouter);
app.use('/api/v1/offers', offersRouter);
app.use('/api/v1/watchlist', watchlistRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/stripe', stripeRouter);


// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`// PARALLEL API v3 listening on port ${PORT}`);
  console.log(`   All routes modularized.`);
});

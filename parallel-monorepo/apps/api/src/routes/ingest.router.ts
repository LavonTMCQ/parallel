// src/routes/ingest.router.ts
import express from 'express';
import * as IngestController from '../controllers/ingest.controller';

const router = express.Router();

router.post('/', IngestController.ingestListing);

export default router;

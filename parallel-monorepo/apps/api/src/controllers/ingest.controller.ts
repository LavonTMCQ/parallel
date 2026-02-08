// src/controllers/ingest.controller.ts
import { Request, Response } from 'express';
import * as IngestService from '../services/ingest.service';

export async function ingestListing(req: Request, res: Response) {
  try {
    const result = await IngestService.ingest(req.body);
    res.status(201).json(result);
  } catch (error: any) {
    console.error("Ingest Error:", error);
    if (error.message.startsWith('QUALITY_GATE_FAILED')) {
      return res.status(400).json({
        error: 'QUALITY_GATE_FAILED',
        message: 'Seller rating is below 80% threshold.'
      });
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

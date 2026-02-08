
import express from 'express';
import * as usersController from '../controllers/users.controller';

const router = express.Router();

// Get user by ID
// GET /api/v1/users/:id
router.get('/:id', usersController.getUserById);

export default router;

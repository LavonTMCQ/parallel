
import { Request, Response } from 'express';
import * as usersService from '../services/users.service';

export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await usersService.getUserById(id);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    res.json(result.user);
  } catch (error) {
    console.error('Failed to fetch user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

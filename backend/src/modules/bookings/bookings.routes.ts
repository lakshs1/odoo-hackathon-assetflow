import { NextFunction, Request, Response, Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { AppError } from '../../lib/errors';
import * as bookingsService from './bookings.service';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await bookingsService.listBookings(req.user!.id, req.user!.role);
    res.status(200).json(list);
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assetId, startTime, endTime } = req.body;
    if (!assetId || !startTime || !endTime) {
      return next(new AppError(400, 'assetId, startTime, and endTime are required'));
    }

    const booking = await bookingsService.createBooking(
      { assetId, startTime, endTime },
      req.user!.id
    );
    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
});

router.post(
  '/:id/cancel',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const booking = await bookingsService.cancelBooking(
        req.params.id,
        req.user!.id,
        req.user!.role
      );
      res.status(200).json(booking);
    } catch (error) {
      next(error);
    }
  }
);

export default router;

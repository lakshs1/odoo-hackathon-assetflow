import { NextFunction, Request, Response, Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as notificationsService from './notifications.service';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await notificationsService.getMyNotifications(req.user!.id);
    res.status(200).json(list);
  } catch (error) {
    next(error);
  }
});

router.patch(
  '/:id/read',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const notification = await notificationsService.markAsRead(req.params.id, req.user!.id);
      res.status(200).json(notification);
    } catch (error) {
      next(error);
    }
  }
);

export default router;

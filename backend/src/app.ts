import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import openApiSpec from './openapi.json';
import { AppError, ConflictError } from './lib/errors';
import authRouter from './modules/auth/auth.routes';
import departmentsRouter from './modules/departments/departments.routes';
import employeesRouter from './modules/employees/employees.routes';
import assetsRouter from './modules/assets/assets.routes';
import allocationsRouter from './modules/allocations/allocations.routes';
import bookingsRouter from './modules/bookings/bookings.routes';
import maintenanceRouter from './modules/maintenance/maintenance.routes';
import auditRouter from './modules/audit/audit.routes';
import notificationsRouter from './modules/notifications/notifications.routes';
import kpiRouter from './modules/kpi/kpi.routes';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/departments', departmentsRouter);
app.use('/api/employees', employeesRouter);
app.use('/api', assetsRouter);
app.use('/api/allocations', allocationsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/maintenance', maintenanceRouter);
app.use('/api/audit', auditRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/kpi', kpiRouter);

// Fallback route for 404 Not Found
app.use((req: Request, res: Response, next: NextFunction) => {
  next(new AppError(404, 'Not found'));
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  // Check custom errors
  if (err instanceof AppError) {
    if (err instanceof ConflictError) {
      return res.status(err.status).json({
        error: err.message,
        nextAvailable: err.data,
      });
    }
    return res.status(err.status).json({ error: err.message });
  }

  // Handle PostgreSQL Database exceptions
  // PostgreSQL code '22000' is used for custom trigger-based validations (state machine)
  if (err.code === '22000') {
    return res.status(422).json({ error: err.message || 'Invalid state transition' });
  }
  // Unique violation (e.g. duplicate serial number)
  if (err.code === '23505') {
    return res.status(409).json({ error: err.detail || 'Resource already exists' });
  }
  // Foreign key restriction violation (e.g. deleting department with employees)
  if (err.code === '23503') {
    return res.status(409).json({ error: err.detail || 'Cannot delete department with employees' });
  }

  console.error('Unhandled error:', err);
  return res.status(500).json({ error: 'Internal server error' });
});

export default app;

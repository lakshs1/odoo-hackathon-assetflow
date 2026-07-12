export class AppError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, public data?: unknown) {
    super(409, message);
  }
}

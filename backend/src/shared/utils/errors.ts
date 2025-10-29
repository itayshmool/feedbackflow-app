// backend/src/shared/utils/errors.ts

export class ValidationError extends Error {
  status = 400 as const;
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  status = 404 as const;
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends Error {
  status = 403 as const;
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}



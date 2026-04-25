export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = "AppError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(404, `${resource} with id '${id}' not found`, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class UnprocessableError extends AppError {
  constructor(message: string) {
    super(422, message, "UNPROCESSABLE");
    this.name = "UnprocessableError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(403, message, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

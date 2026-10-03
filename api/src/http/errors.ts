export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: unknown[] = [],
  ) {
    super(message);
  }
}

export function notFound(message: string): AppError {
  return new AppError(404, 'NOT_FOUND', message);
}

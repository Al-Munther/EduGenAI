import type { Response } from "express";

export function handleRouteError(
  res: Response,
  err: unknown,
  label: string,
): void {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;

  console.error(`REAL ERROR [${label}]:`, err);
  console.error(`REAL ERROR MESSAGE [${label}]:`, message);
  if (stack) {
    console.error(`REAL ERROR STACK [${label}]:`, stack);
  }

  res.status(500).json({
    error: `Internal Server Error: ${label}`,
    message,
    ...(process.env.NODE_ENV !== "production" ? { stack } : {}),
  });
}

export function handleBackgroundError(
  err: unknown,
  label: string,
): void {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;

  console.error(`REAL ERROR [${label}]:`, err);
  console.error(`REAL ERROR MESSAGE [${label}]:`, message);
  if (stack) {
    console.error(`REAL ERROR STACK [${label}]:`, stack);
  }
}

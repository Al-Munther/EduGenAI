const isProduction = process.env.NODE_ENV === "production";

export const logger = {
  info: (msg: unknown, ...args: unknown[]) => {
    if (!isProduction) console.log("[DB]", msg, ...args);
  },
  error: (obj: { err?: unknown; [key: string]: unknown }, msg: string) => {
    console.error("[DB ERROR]", msg, obj.err || "");
  },
  warn: (msg: unknown, ...args: unknown[]) => {
    console.warn("[DB WARN]", msg, ...args);
  },
};

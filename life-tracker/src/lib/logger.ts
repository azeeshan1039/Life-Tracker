import pino, { type DestinationStream, type Logger } from "pino";

const redactPaths = [
  "password",
  "cookie",
  "authorization",
  "token",
  "*.password",
  "*.cookie",
  "*.authorization",
  "*.token",
  "*.*.password",
  "*.*.cookie",
  "*.*.authorization",
  "*.*.token",
  "*.*.*.password",
  "*.*.*.cookie",
  "*.*.*.authorization",
  "*.*.*.token",
];

export function createLogger(destination?: DestinationStream): Logger {
  return pino(
    {
      redact: {
        paths: redactPaths,
        censor: "[Redacted]",
      },
    },
    destination,
  );
}

export const logger = createLogger();

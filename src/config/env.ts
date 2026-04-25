import "dotenv/config";

const parsePort = (value: string | undefined): number => {
  if (!value) return 3000;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? 3000 : parsed;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parsePort(process.env.PORT),
  databaseUrl: process.env.DATABASE_URL ?? "",
};

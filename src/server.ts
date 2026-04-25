import app from "./app";
import { env } from "./config/env";
import { prisma } from "./config/prisma";

const PORT = env.port;

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log("Database connected.");

    const server = app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Swagger UI: http://localhost:${PORT}/api/docs`);
    });

    const shutdown = (signal: string) => {
      console.log(`\nReceived ${signal}. Shutting down gracefully...`);
      server.close(() => {
        prisma
          .$disconnect()
          .then(() => {
            console.log("Database disconnected. Process exiting.");
            process.exit(0);
          })
          .catch((err) => {
            console.error("Error during disconnect:", err);
            process.exit(1);
          });
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (err) {
    console.error("Failed to start server:", err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

bootstrap();

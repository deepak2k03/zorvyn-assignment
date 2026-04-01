import "express-async-errors";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { ZodError } from "zod";
import { initDb } from "./db";
import userRoutes from "./routes/users";
import recordRoutes from "./routes/records";
import dashboardRoutes from "./routes/dashboard";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Main Routes
app.get("/", (req, res) => {
  res.send(
    "<h1>Welcome to the Finance Dashboard Backend API</h1><p>API is running successfully!</p>",
  );
});
app.use("/users", userRoutes);
app.use("/records", recordRoutes);
app.use("/dashboard", dashboardRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Global Error Handler
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ errors: err.errors });
  }

  const statusCode =
    typeof err === "object" && err !== null && "statusCode" in err &&
    typeof (err as { statusCode?: unknown }).statusCode === "number"
      ? (err as { statusCode: number }).statusCode
      : 500;

  if (err instanceof Error) {
    console.error(err.stack);
  } else {
    console.error(err);
  }

  res.status(statusCode).json({
    error:
      statusCode === 500
        ? "An unexpected database or server error occurred"
        : "Request failed",
  });
});

// Init DB & Start Express
initDb()
  .then(() => {
    console.log("Database initialized");
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database", err);
    process.exit(1);
  });

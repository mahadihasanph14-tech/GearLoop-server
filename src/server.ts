import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { connectDB } from "./db.js";
import { startBookingJobs } from "./jobs/booking-jobs.js";
import equipment from "./routes/equipment.js";
import bookings from "./routes/bookings.js";
import favorites from "./routes/favorites.js";
import dashboard from "./routes/dashboard.js";
import users from "./routes/users.js";
import { verifyToken, verifyOwner } from "./middleware/auth.js";
import { stripeWebhook } from "./routes/payments.js";

const app = express();
const PORT = Number(process.env.PORT) || 5000;

// Stripe Webhook
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook,
);

// Middleware
app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json({ limit: "2mb" }));

// Health Check
app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "gearloop-api",
  });
});

// JWT Authentication Test
app.get("/api/test-auth", verifyToken, (req, res) => {
  res.json({
    message: "JWT Verification Successful!",
    user: req.user,
  });
});

// API Routes
app.get("/api/test-owner", verifyToken, verifyOwner, (req, res) => {
  res.json({
    message: "Owner Access Successful!",
    user: req.user,
  });
});
app.use("/api/equipment", equipment);
app.use("/api/bookings", bookings);
app.use("/api/favorites", favorites);
app.use("/api/dashboard", dashboard);
app.use("/api/users", users);

// 404 Handler
app.use((_req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

// Error Handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err);

    res.status(500).json({
      message: "Internal server error",
    });
  },
);


connectDB()
  .then(() => {
    startBookingJobs();

    app.listen(PORT, () => {
      console.log(`GearLoop API running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
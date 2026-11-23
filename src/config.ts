import "dotenv/config";
export const config = {
  port: Number(process.env.PORT || 5000),
  clientUrl: process.env.CLIENT_URL || "http://localhost:3000",
  mongoUri: process.env.MONGODB_URI || "",
  dbName: process.env.DB_NAME || "gearloop_db",
  jwksUrl: process.env.BETTER_AUTH_JWKS_URL || "",
  issuer: process.env.JWT_ISSUER || "",
  audience: process.env.JWT_AUDIENCE || "",
  stripeSecret: process.env.STRIPE_SECRET_KEY || "",
  stripeWebhook: process.env.STRIPE_WEBHOOK_SECRET || "",
};

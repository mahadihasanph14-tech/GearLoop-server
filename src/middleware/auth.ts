import { Request, Response, NextFunction } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { config } from "../config.js";
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email?: string; name?: string; role: string };
    }
  }
}
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
export async function verifyToken(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const h = req.headers.authorization;
    if (!h?.startsWith("Bearer "))
      return res.status(401).json({ message: "Authentication required" });
    if (!config.jwksUrl) throw Error("JWKS URL missing");
    jwks ??= createRemoteJWKSet(new URL(config.jwksUrl));
    const { payload } = await jwtVerify(h.slice(7), jwks, {
      issuer: config.issuer || undefined,
      audience: config.audience || undefined,
    });
    req.user = {
      id: String(payload.sub),
      email: String(payload.email || ""),
      name: String(payload.name || ""),
      role: String(payload.role || "Customer"),
    };
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired access token" });
  }
}
function allow(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user)
      return res.status(401).json({ message: "Authentication required" });
    if (!roles.includes(req.user.role))
      return res.status(403).json({ message: "You do not have permission" });
    next();
  };
}
export const verifyCustomer = allow("Customer");
export const verifyRenter = allow("Customer");
export const verifyOwner = allow("Owner");
export const verifyAdmin = allow("Admin");

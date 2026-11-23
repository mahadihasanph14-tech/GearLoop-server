import { Router } from "express";
import { db, ObjectId } from "../db.js";
import {
  verifyToken,
  verifyAdmin,
} from "../middleware/auth.js";

const r = Router();


r.get("/me", verifyToken, async (req, res) => {
  try {
    const profile = await db()
      .collection("profiles")
      .findOne({
        userId: req.user!.id,
      });

    return res.json({
      profile,
    });
  } catch (error) {
    console.error("Get profile error:", error);

    return res.status(500).json({
      message: "Could not load profile",
    });
  }
});


r.patch("/me", verifyToken, async (req, res) => {
  try {
    const { phone, address, image } = req.body;

    const update: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (phone !== undefined) {
      if (typeof phone !== "string") {
        return res.status(400).json({
          message: "Invalid phone number",
        });
      }

      update.phone = phone.trim();
    }

    if (address !== undefined) {
      if (typeof address !== "string") {
        return res.status(400).json({
          message: "Invalid address",
        });
      }

      update.address = address.trim();
    }

    if (image !== undefined) {
      if (typeof image !== "string") {
        return res.status(400).json({
          message: "Invalid profile image",
        });
      }

      update.image = image.trim();
    }

    await db()
      .collection("profiles")
      .updateOne(
        {
          userId: req.user!.id,
        },
        {
          $set: {
            userId: req.user!.id,
            ...update,
          },
        },
        {
          upsert: true,
        }
      );

    return res.json({
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Update profile error:", error);

    return res.status(500).json({
      message: "Could not update profile",
    });
  }
});


r.get("/", verifyToken, verifyAdmin, async (_req, res) => {
  try {
    const users = await db()
      .collection("user")
      .find(
        {},
        {
          projection: {
            name: 1,
            email: 1,
            role: 1,
            createdAt: 1,
            image: 1,
          },
        }
      )
      .toArray();

    return res.json({
      users,
    });
  } catch (error) {
    console.error("Get users error:", error);

    return res.status(500).json({
      message: "Could not load users",
    });
  }
});


r.patch(
  "/:id/role",
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    try {
      // Convert route parameter to string
      const id = String(req.params.id ?? "");

      // Validate MongoDB ObjectId
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({
          message: "Invalid user ID",
        });
      }

      // Validate role
      const allowedRoles = [
        "Customer",
        "Owner",
        "Admin",
      ];

      if (!allowedRoles.includes(req.body.role)) {
        return res.status(400).json({
          message: "Invalid role",
        });
      }

      // Update user role
      const result = await db()
        .collection("user")
        .updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: {
              role: req.body.role,
              updatedAt: new Date(),
            },
          }
        );

      if (result.matchedCount === 0) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      return res.json({
        message: "User role updated successfully",
      });
    } catch (error) {
      console.error("Update user role error:", error);

      return res.status(500).json({
        message: "Could not update user role",
      });
    }
  }
);

export default r;
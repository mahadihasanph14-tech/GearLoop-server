import { Router } from "express";
import { db, ObjectId } from "../db.js";
import {
  verifyToken,
  verifyOwner,
  verifyAdmin,
} from "../middleware/auth.js";

const r = Router();


r.get("/", async (req, res) => {
  try {
    const getQuery = (value: unknown): string => {
      return typeof value === "string" ? value.trim() : "";
    };

    const search = getQuery(req.query.search);
    const category = getQuery(req.query.category);
    const rentalType = getQuery(req.query.rentalType);
    const availability = getQuery(req.query.availability);
    const sort = getQuery(req.query.sort) || "recent";
    const limit = getQuery(req.query.limit) || "30";
    const page = getQuery(req.query.page) || "1";

    const filter: any = {
      status: "Approved",
    };

    if (category) {
      filter.category = category;
    }

    if (rentalType) {
      filter.rentalType = rentalType;
    }

    if (availability !== "") {
      filter.availability = availability === "true";
    }

    if (search) {
      const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter.$or = [
        { name: { $regex: safeSearch, $options: "i" } },
        { location: { $regex: safeSearch, $options: "i" } },
        { category: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const n = Math.min(60, Math.max(1, Number(limit) || 30));
    const p = Math.max(1, Number(page) || 1);

    const sortOption: any =
      sort === "price_asc"
        ? { price: 1 }
        : sort === "price_desc"
          ? { price: -1 }
          : { createdAt: -1 };

    const [items, total] = await Promise.all([
      db()
        .collection("equipment")
        .find(filter)
        .sort(sortOption)
        .skip((p - 1) * n)
        .limit(n)
        .toArray(),

      db().collection("equipment").countDocuments(filter),
    ]);

    return res.json({
      items,
      total,
      page: p,
      pages: Math.ceil(total / n),
    });
  } catch (error) {
    console.error("Get equipment error:", error);

    return res.status(500).json({
      message: "Could not load equipment",
    });
  }
});

r.get("/admin/all", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const items = await db()
      .collection("equipment")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ items, total: items.length });
  } catch (error) {
    console.error("Admin equipment error:", error);
    res.status(500).json({
      message: "Could not load all equipment",
    });
  }
});

r.get("/mine", verifyToken, verifyOwner, async (req, res) => {
  try {
    const items = await db()
      .collection("equipment")
      .find({ ownerId: req.user!.id })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ items });
  } catch {
    res.status(500).json({ message: "Could not load your equipment" });
  }
});

r.get("/:id", async (req, res) => {
  try {
    const id = String(req.params.id ?? "");

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid equipment ID",
      });
    }

    const item = await db()
      .collection("equipment")
      .findOne({
        _id: new ObjectId(id),
        status: "Approved",
      });

    if (!item) {
      return res.status(404).json({
        message: "Equipment not found",
      });
    }

    return res.json({
      item,
    });
  } catch (error) {
    console.error("Get single equipment error:", error);

    return res.status(500).json({
      message: "Could not load equipment",
    });
  }
});

r.post("/", verifyToken, verifyOwner, async (req, res) => {
  try {
    const b = req.body;

    const requiredFields = [
      "name",
      "description",
      "category",
      "location",
      "image",
      "rentalType",
    ];

    const missingField = requiredFields.some(
      (field) =>
        typeof b[field] !== "string" ||
        !b[field].trim()
    );

    if (missingField) {
      return res.status(400).json({
        message: "Please complete all required fields",
      });
    }

    const price = Number(b.price);
    const quantity = Number(b.quantity);

    if (
      !Number.isFinite(price) ||
      price <= 0 ||
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      return res.status(400).json({
        message: "Invalid price or quantity",
      });
    }

    const allowedRentalTypes = [
      "Daily",
      "Weekly",
      "Monthly",
    ];

    if (!allowedRentalTypes.includes(b.rentalType)) {
      return res.status(400).json({
        message: "Invalid rental type",
      });
    }

    const doc = {
      name: b.name.trim(),
      description: b.description.trim(),
      category: b.category.trim(),
      location: b.location.trim(),
      image: b.image.trim(),
      rentalType: b.rentalType,
      price,
      quantity,

      ownerId: req.user!.id,
      ownerName: req.user!.name,

      status: "Pending",
      availability: true,

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db()
      .collection("equipment")
      .insertOne(doc);

    return res.status(201).json({
      id: result.insertedId,
      message: "Equipment submitted for approval",
    });
  } catch (error) {
    console.error("Add equipment error:", error);

    return res.status(500).json({
      message: "Could not add equipment",
    });
  }
});


r.patch("/:id", verifyToken, async (req, res) => {
  try {
    const id = String(req.params.id ?? "");

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid equipment ID",
      });
    }

    const item = await db()
      .collection("equipment")
      .findOne({
        _id: new ObjectId(id),
      });

    if (!item) {
      return res.status(404).json({
        message: "Equipment not found",
      });
    }

    if (
      item.ownerId !== req.user!.id &&
      req.user!.role !== "Admin"
    ) {
      return res.status(403).json({
        message: "Forbidden",
      });
    }

    const allowedFields = [
      "name",
      "description",
      "category",
      "location",
      "image",
      "rentalType",
      "price",
      "quantity",
      "availability",
    ];

    const update: Record<string, any> = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        update[field] = req.body[field];
      }
    }

    if (update.price !== undefined) {
      update.price = Number(update.price);

      if (
        !Number.isFinite(update.price) ||
        update.price <= 0
      ) {
        return res.status(400).json({
          message: "Invalid price",
        });
      }
    }

    if (update.quantity !== undefined) {
      update.quantity = Number(update.quantity);

      if (
        !Number.isInteger(update.quantity) ||
        update.quantity < 1
      ) {
        return res.status(400).json({
          message: "Invalid quantity",
        });
      }
    }

    if (
      update.rentalType !== undefined &&
      !["Daily", "Weekly", "Monthly"].includes(update.rentalType)
    ) {
      return res.status(400).json({
        message: "Invalid rental type",
      });
    }

    if (
      update.availability !== undefined &&
      typeof update.availability !== "boolean"
    ) {
      return res.status(400).json({
        message: "Invalid availability value",
      });
    }

    for (const field of [
      "name",
      "description",
      "category",
      "location",
      "image",
    ]) {
      if (update[field] !== undefined) {
        if (
          typeof update[field] !== "string" ||
          !update[field].trim()
        ) {
          return res.status(400).json({
            message: `Invalid ${field}`,
          });
        }

        update[field] = update[field].trim();
      }
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({
        message: "No valid fields provided for update",
      });
    }

    update.updatedAt = new Date();

    await db()
      .collection("equipment")
      .updateOne(
        { _id: item._id },
        { $set: update }
      );

    return res.json({
      message: "Equipment updated successfully",
    });
  } catch (error) {
    console.error("Update equipment error:", error);

    return res.status(500).json({
      message: "Could not update equipment",
    });
  }
});


r.delete("/:id", verifyToken, async (req, res) => {
  try {
    const id = String(req.params.id ?? "");

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid equipment ID",
      });
    }

    const item = await db()
      .collection("equipment")
      .findOne({
        _id: new ObjectId(id),
      });

    if (!item) {
      return res.status(404).json({
        message: "Equipment not found",
      });
    }

    if (
      item.ownerId !== req.user!.id &&
      req.user!.role !== "Admin"
    ) {
      return res.status(403).json({
        message: "Forbidden",
      });
    }

    await db()
      .collection("equipment")
      .deleteOne({
        _id: item._id,
      });

    return res.json({
      message: "Equipment deleted successfully",
    });
  } catch (error) {
    console.error("Delete equipment error:", error);

    return res.status(500).json({
      message: "Could not delete equipment",
    });
  }
});

r.patch(
  "/:id/moderate",
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    try {
      const id = String(req.params.id ?? "");

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({
          message: "Invalid equipment ID",
        });
      }

      const allowedStatuses = [
        "Approved",
        "Rejected",
        "Pending",
      ];

      if (!allowedStatuses.includes(req.body.status)) {
        return res.status(400).json({
          message: "Invalid equipment status",
        });
      }

      const result = await db()
        .collection("equipment")
        .updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: {
              status: req.body.status,
              updatedAt: new Date(),
            },
          }
        );

      if (result.matchedCount === 0) {
        return res.status(404).json({
          message: "Equipment not found",
        });
      }

      return res.json({
        message: "Equipment moderation updated successfully",
      });
    } catch (error) {
      console.error("Moderate equipment error:", error);

      return res.status(500).json({
        message: "Could not update equipment status",
      });
    }
  }
);

export default r;
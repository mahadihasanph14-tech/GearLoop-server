import { Router } from "express";
import Stripe from "stripe";
import { db, ObjectId } from "../db.js";
import {
  verifyToken,
  verifyRenter,
  verifyOwner,
  verifyAdmin,
} from "../middleware/auth.js";
import { config } from "../config.js";

const r = Router();

const stripe = config.stripeSecret
  ? new Stripe(config.stripeSecret)
  : null;

// ==========================================
// CREATE STRIPE CHECKOUT
// ==========================================

r.post("/checkout", verifyToken, verifyRenter, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({
        message: "Stripe is not configured",
      });
    }

    const {
      equipmentId,
      startDate,
      endDate,
      quantity,
      phone,
      address,
      notes,
    } = req.body;

    if (!equipmentId || !ObjectId.isValid(equipmentId)) {
      return res.status(400).json({
        message: "Invalid equipment ID",
      });
    }

    if (!startDate || !endDate || !phone || !address) {
      return res.status(400).json({
        message: "Please complete all required fields",
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const qty = Number(quantity);

    if (
      !Number.isFinite(start.getTime()) ||
      !Number.isFinite(end.getTime()) ||
      end <= start ||
      !Number.isInteger(qty) ||
      qty < 1
    ) {
      return res.status(400).json({
        message: "Invalid dates or quantity",
      });
    }

    // Find equipment
    const item = await db()
      .collection("equipment")
      .findOne({
        _id: new ObjectId(equipmentId),
        status: "Approved",
        availability: true,
      });

    if (!item || qty > Number(item.quantity)) {
      return res.status(409).json({
        message: "Equipment unavailable in requested quantity",
      });
    }

    // Calculate rental price
    const days = Math.max(
      1,
      Math.ceil((end.getTime() - start.getTime()) / 86400000)
    );

    const units =
      item.rentalType === "Weekly"
        ? Math.ceil(days / 7)
        : item.rentalType === "Monthly"
          ? Math.ceil(days / 30)
          : days;

    const total = Number(item.price) * units * qty;

    if (!Number.isFinite(total) || total <= 0) {
      return res.status(400).json({
        message: "Invalid amount",
      });
    }

    // Create booking
    const booking = {
      equipmentId,
      customerId: req.user!.id,
      ownerId: item.ownerId,
      equipmentName: item.name,
      startDate: start,
      endDate: end,
      quantity: qty,
      phone,
      address,
      notes: notes || "",
      totalAmount: total,
      currency: "usd",
      paymentStatus: "Pending",
      bookingStatus: "Pending Payment",
      createdAt: new Date(),
    };

    const inserted = await db()
      .collection("bookings")
      .insertOne(booking);

    // Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",

      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: Math.round(total * 100),
            product_data: {
              name: `GearLoop rental: ${item.name}`,
            },
          },
        },
      ],

      metadata: {
        bookingId: inserted.insertedId.toString(),
      },

      success_url: `${config.clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url: `${config.clientUrl}/payment/cancel?booking_id=${inserted.insertedId}`,
    });

    await db()
      .collection("bookings")
      .updateOne(
        { _id: inserted.insertedId },
        {
          $set: {
            stripeSessionId: session.id,
          },
        }
      );

    return res.json({
      url: session.url,
    });
  } catch (error) {
    console.error("Checkout error:", error);

    return res.status(500).json({
      message: "Could not start checkout",
    });
  }
});

// ==========================================
// CUSTOMER: GET OWN BOOKINGS
// ==========================================

r.get("/mine", verifyToken, verifyRenter, async (req, res) => {
  try {
    const bookings = await db()
      .collection("bookings")
      .find({
        customerId: req.user!.id,
      })
      .sort({
        createdAt: -1,
      })
      .toArray();

    return res.json({
      bookings,
    });
  } catch (error) {
    console.error("Customer bookings error:", error);

    return res.status(500).json({
      message: "Could not load your bookings",
    });
  }
});

// ==========================================
// OWNER: GET OWN RENTAL REQUESTS
// ==========================================

r.get("/owner", verifyToken, verifyOwner, async (req, res) => {
  try {
    const bookings = await db()
      .collection("bookings")
      .find({
        ownerId: req.user!.id,
      })
      .sort({
        createdAt: -1,
      })
      .toArray();

    return res.json({
      bookings,
    });
  } catch (error) {
    console.error("Owner bookings error:", error);

    return res.status(500).json({
      message: "Could not load rental requests",
    });
  }
});

// ==========================================
// ADMIN: GET ALL BOOKINGS
// ==========================================

r.get("/all", verifyToken, verifyAdmin, async (_req, res) => {
  try {
    const bookings = await db()
      .collection("bookings")
      .find()
      .sort({
        createdAt: -1,
      })
      .toArray();

    return res.json({
      bookings,
    });
  } catch (error) {
    console.error("Admin bookings error:", error);

    return res.status(500).json({
      message: "Could not load all bookings",
    });
  }
});

// ==========================================
// OWNER / ADMIN: UPDATE BOOKING STATUS
// ==========================================

r.patch("/:id/status", verifyToken, async (req, res) => {
  try {
    const id = String(req.params.id ?? "");

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid booking ID",
      });
    }

    const booking = await db()
      .collection("bookings")
      .findOne({
        _id: new ObjectId(id),
      });

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    if (
      req.user!.role !== "Admin" &&
      (req.user!.role !== "Owner" || booking.ownerId !== req.user!.id)
    ) {
      return res.status(403).json({
        message: "Forbidden",
      });
    }

    const allowedStatuses = [
      "Approved",
      "Rejected",
      "Completed",
    ];

    if (!allowedStatuses.includes(req.body.status)) {
      return res.status(400).json({
        message: "Invalid booking status",
      });
    }

    if (booking.paymentStatus !== "Paid") {
      return res.status(400).json({
        message: "Only paid bookings can be updated",
      });
    }

    if (
      booking.bookingStatus === "Rejected" ||
      booking.bookingStatus === "Completed"
    ) {
      return res.status(400).json({
        message: "This booking can no longer be updated",
      });
    }

    await db()
      .collection("bookings")
      .updateOne(
        {
          _id: booking._id,
        },
        {
          $set: {
            bookingStatus: req.body.status,
            updatedAt: new Date(),
          },
        }
      );

    return res.json({
      message: "Booking updated successfully",
    });
  } catch (error) {
    console.error("Booking status update error:", error);

    return res.status(500).json({
      message: "Could not update booking",
    });
  }
});

export default r;
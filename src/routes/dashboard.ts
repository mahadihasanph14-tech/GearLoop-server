import { Router } from "express";
import { db } from "../db.js";
import { verifyToken, verifyAdmin, verifyOwner } from "../middleware/auth.js";
const r = Router();
r.get("/summary", verifyToken, async (req, res) => {
  const id = req.user!.id;
  const [rentals, equipment, favorites] = await Promise.all([
    db().collection("bookings").countDocuments({ customerId: id }),
    db().collection("equipment").countDocuments({ ownerId: id }),
    db().collection("favorites").countDocuments({ userId: id }),
  ]);
  res.json({ rentals, equipment, favorites });
});
r.get("/admin/analytics", verifyToken, verifyAdmin, async (_req, res) => {
  const [users, equipment, bookings, pending, completed, payments] =
    await Promise.all([
      db().collection("user").countDocuments(),
      db().collection("equipment").countDocuments(),
      db().collection("bookings").countDocuments(),
      db().collection("equipment").countDocuments({ status: "Pending" }),
      db()
        .collection("bookings")
        .countDocuments({ bookingStatus: "Completed" }),
      db()
        .collection("payments")
        .aggregate([
          { $match: { status: "Paid" } },
          {
            $group: {
              _id: null,
              total: { $sum: { $divide: ["$amountTotal", 100] } },
            },
          },
        ])
        .toArray(),
    ]);
  res.json({
    users,
    equipment,
    bookings,
    pending,
    completed,
    revenue: payments[0]?.total || 0,
  });
});
r.get("/owner/analytics", verifyToken, verifyOwner, async (req, res) => {
  const id = req.user!.id;
  const [equipment, completed, earnings] = await Promise.all([
    db().collection("equipment").countDocuments({ ownerId: id }),
    db()
      .collection("bookings")
      .countDocuments({ ownerId: id, bookingStatus: "Completed" }),
    db()
      .collection("payments")
      .aggregate([
        { $match: { ownerId: id, status: "Paid" } },
        {
          $group: {
            _id: null,
            total: { $sum: { $divide: ["$amountTotal", 100] } },
          },
        },
      ])
      .toArray(),
  ]);
  res.json({ equipment, completed, earnings: earnings[0]?.total || 0 });
});
export default r;

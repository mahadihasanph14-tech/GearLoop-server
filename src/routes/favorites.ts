import { Router } from "express";
import { db, ObjectId } from "../db.js";
import { verifyToken, verifyRenter } from "../middleware/auth.js";
const r = Router();
r.get("/", verifyToken, verifyRenter, async (req, res) => {
  const fav = await db()
    .collection("favorites")
    .find({ userId: req.user!.id })
    .toArray();
  const ids = fav
    .filter((x) => ObjectId.isValid(x.equipmentId))
    .map((x) => new ObjectId(x.equipmentId));
  res.json({
    items: await db()
      .collection("equipment")
      .find({ _id: { $in: ids } })
      .toArray(),
  });
});
r.post("/:equipmentId", verifyToken, verifyRenter, async (req, res) => {
  await db()
    .collection("favorites")
    .updateOne(
      { userId: req.user!.id, equipmentId: req.params.equipmentId },
      {
        $setOnInsert: {
          userId: req.user!.id,
          equipmentId: req.params.equipmentId,
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );
  res.json({ message: "Added to favorites" });
});
r.delete("/:equipmentId", verifyToken, verifyRenter, async (req, res) => {
  await db()
    .collection("favorites")
    .deleteOne({ userId: req.user!.id, equipmentId: req.params.equipmentId });
  res.json({ message: "Removed from favorites" });
});
export default r;

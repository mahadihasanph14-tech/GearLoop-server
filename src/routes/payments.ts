import { Request, Response } from "express";
import Stripe from "stripe";
import { config } from "../config.js";
import { db, ObjectId } from "../db.js";
const stripe = config.stripeSecret ? new Stripe(config.stripeSecret) : null;
export async function stripeWebhook(req: Request, res: Response) {
  if (!stripe || !config.stripeWebhook)
    return res.status(503).send("Stripe webhook not configured");
  const sig = req.headers["stripe-signature"];
  if (!sig) return res.status(400).send("Missing signature");
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, config.stripeWebhook);
  } catch (e: any) {
    return res.status(400).send(`Webhook Error: ${e.message}`);
  }
  if (event.type === "checkout.session.completed") {
    const s = event.data.object as Stripe.Checkout.Session,
      bid = s.metadata?.bookingId;
    if (bid && ObjectId.isValid(bid)) {
      const booking = await db()
        .collection("bookings")
        .findOne({ _id: new ObjectId(bid) });
      if (booking) {
        await db()
          .collection("bookings")
          .updateOne(
            { _id: booking._id },
            {
              $set: {
                paymentStatus: "Paid",
                bookingStatus: "Confirmed",
                stripePaymentIntent: s.payment_intent,
                paidAt: new Date(),
              },
            },
          );
        await db()
          .collection("payments")
          .updateOne(
            { stripeSessionId: s.id },
            {
              $set: {
                bookingId: bid,
                customerId: booking.customerId,
                ownerId: booking.ownerId,
                amountTotal: s.amount_total,
                currency: s.currency,
                status: "Paid",
                stripeSessionId: s.id,
                paymentIntent: s.payment_intent,
                createdAt: new Date(),
              },
            },
            { upsert: true },
          );
      }
    }
  }
  res.json({ received: true });
}

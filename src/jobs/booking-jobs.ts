import cron from "node-cron";
import { db } from "../db.js";

async function completeExpiredBookings() {
  try {
    const now = new Date();

    const result = await db()
      .collection("bookings")
      .updateMany(
        {
          paymentStatus: "Paid",
          bookingStatus: "Approved",
          endDate: { $lte: now },
        },
        {
          $set: {
            bookingStatus: "Completed",
            updatedAt: now,
          },
        },
      );

    if (result.modifiedCount > 0) {
      console.log(
        `Cron Job: ${result.modifiedCount} booking(s) completed.`,
      );
    } else {
      console.log("Cron Job: No expired bookings found.");
    }
  } catch (error) {
    console.error("Booking Cron Job Error:", error);
  }
}

export function startBookingJobs() {
  
  void completeExpiredBookings();


  cron.schedule("*/15 * * * *", () => {
    void completeExpiredBookings();
  });

  console.log("GearLoop Booking Cron Job Started.");
}
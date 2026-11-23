import { MongoClient, Db, ObjectId } from "mongodb";
import { config } from "./config.js";
let database: Db;
export async function connectDB() {
  if (!config.mongoUri) throw new Error("MONGODB_URI is missing");
  const client = new MongoClient(config.mongoUri);
  await client.connect();
  database = client.db(config.dbName);
  await database
    .collection("equipment")
    .createIndex({ status: 1, createdAt: -1 });
  await database
    .collection("equipment")
    .createIndex({ name: "text", location: "text" });
  await database
    .collection("bookings")
    .createIndex({ customerId: 1, createdAt: -1 });
  console.log("MongoDB connected");
}
export function db() {
  if (!database) throw new Error("Database not connected");
  return database;
}
export { ObjectId };

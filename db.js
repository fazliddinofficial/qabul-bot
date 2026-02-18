import mongoose from "mongoose";
import { config } from "dotenv";
import { POSITION_OPTIONS } from "./constants.js";

config();

const db_url = process.env.DB_URL;

const creatingUserLimit = Object.values(POSITION_OPTIONS).length;

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
  },
  usedFields: {
    type: [String],
  },
});

export const User = mongoose.model("User", userSchema);

export const connectDB = async () => {
  try {
    await mongoose.connect(db_url, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log("Mongodb connected");
  } catch (e) {
    console.log("Mongo db connection error", e);
  }
};

mongoose.connection.on("connected", () => {
  console.log("✅ Mongoose connected to MongoDB");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ Mongoose connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.log("⚠️ Mongoose disconnected");
});

export const checkUserExist = async (userId) => {
  const foundUser = await User.findOne({ userId });
  if (!foundUser) {
    await User.create({ userId });
  }
};

export const addTitleToUser = async (userId, field) => {
  const foundUser = await User.findOne({ userId });

  if (!foundUser) {
    return "User not found";
  }

  foundUser.usedFields.push(field);
  await foundUser.save();
};

export const checkUserPositions = async (userId, position) => {
  const foundUser = await User.findOne({ userId });

  if (!foundUser) {
    return { status: false, message: `/start buyrug'ini bosing!` };
  } else if (foundUser.usedFields.includes(position)) {
    return {
      status: false,
      message: `Siz ${position}ga allaqachon resume jo'natib bo'lgansiz!`,
    };
  }
  await addTitleToUser(userId, position);
  return { status: true, message: "ok" };
};

import mongoose from "mongoose";
import { config } from "dotenv";
config();

const db_url = process.env.DB_URL;

const creatingUserLimit = 2;

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
  },
  limit: {
    type: Number,
    default: 3,
  },
});

export const User = mongoose.model("User", userSchema);

export const connectDB = async () => {
  try {
    await mongoose.connect(db_url);
    console.log("Mongodb connected");
  } catch (e) {
    console.log("Mongo db connection error", e);
  }
};

export const createUser = async (userId) => {
  await User.create({ userId, limit: creatingUserLimit });
  return "User created";
};

export const checkUserExist = async (userId) => {
  const foundUser = await User.findOne({ userId });
  if (!foundUser) {
    await createUser(userId);

    return { message: "Sizda 2 ta urunish qoldi", status: true };
  } else if (foundUser.limit > 0) {
    foundUser.limit = foundUser.limit - 1;

    await foundUser.save();

    return {
      message: "Siz yana bitta urunishdan foydalandingiz",
      status: true,
    };
  } else if (foundUser.limit === 0) {
    return { message: "Sizda urunish qolmagan", status: false };
  }
};

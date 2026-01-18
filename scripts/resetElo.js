import mongoose from "mongoose";
import Player from "../models/players.js";
import dotenv from "dotenv";
dotenv.config();

const {
  MONGO_HOSTNAME,
  MONGO_INITDB_ROOT_USERNAME,
  MONGO_INITDB_ROOT_PASSWORD,
  MONGO_INITDB_DATABASE,
} = process.env;

const url = new URL(
  `mongodb://${MONGO_HOSTNAME}:27017/${MONGO_INITDB_DATABASE}`,
);
url.username = MONGO_INITDB_ROOT_USERNAME;
url.password = MONGO_INITDB_ROOT_PASSWORD;
url.search = new URLSearchParams({
  retryWrites: "true",
  w: "majority",
  authSource: "admin",
}).toString();
const mongoUri = url.toString();

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const resetPlayerRatings = async () => {
  try {
    const players = await Player.find({}); // Retrieve all players

    // Iterate through each player and reset the rating to 1000
    for (const player of players) {
      player.rating = 1000; // Reset rating to 1000
      await player.save(); // Save the updated player
    }

    console.log("Player ratings reset completed.");
  } catch (error) {
    console.error("Error resetting player ratings:", error);
  } finally {
    mongoose.disconnect(); // Close the connection when done
  }
};

resetPlayerRatings();


import mongoose from "mongoose";
import Match from "../models/matches.js";
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

const calculateRankings = async (year, semester) => {
  try {
    const matches = await Match.find({
      "season.year": year,
      "season.semester": semester,
    });
    const playerRatings = new Map();

    matches.forEach((match) => {
      match.Winners.forEach((winner, index) => {
        const winnerRating = playerRatings.get(winner) || 1000;
        const loserRating = playerRatings.get(match.Losers[index]) || 1000;
        playerRatings.set(winner, winnerRating + match.ratingChange);
        playerRatings.set(
          match.Losers[index],
          loserRating - match.ratingChange,
        );
      });
    });

    const playerArray = Array.from(playerRatings, ([name, rating]) => ({
      name,
      rating,
    }));

    playerArray.sort((a, b) => b.rating - a.rating);
    return playerArray;
  } catch (error) {
    console.error("Error calculating rankings:", error);
    throw error;
  }
};

calculateRankings(2023, 2);


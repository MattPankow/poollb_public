import mongoose from "mongoose";
import Match from "../models/matches.js";
import dotenv from "dotenv";
console.log("Before connecting to mongodb");
dotenv.config();
console.log("Before connecting to mongodb");
mongoose.connect(url, {
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
    console.log(playerArray);
    return playerArray;
  } catch (error) {
    console.error("Error calculating rankings:", error);
    throw error;
  }
};
calculateRankings(2023, 2);

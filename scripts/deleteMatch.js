import mongoose from "mongoose";
import Match from "../models/matches.js";
import Player from "../models/players.js";
import dotenv from "dotenv";
dotenv.config();
console.log("Before connecting to mongodb");
const url = process.env.MONGODB_URI;
mongoose.connect(url, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const deleteMatchAndRevertRatings = async (matchId) => {
  try {
    // Find the match by ID
    const match = await Match.findById(matchId);
    if (!match) {
      console.log("Match not found.");
      return;
    }
    // Revert ratings for Winners
    for (let i = 0; i < match.Winners.length; i++) {
      const winnerName = match.Winners[i];
      const previousWinnerElo = match.WinnerElos[i];
      const winner = await Player.findOne({ name: winnerName });
      if (winner) {
        winner.rating = previousWinnerElo;
        await winner.save();
      }
    }
    // Revert ratings for Losers
    for (let i = 0; i < match.Losers.length; i++) {
      const loserName = match.Losers[i];
      const previousLoserElo = match.LoserElos[i];
      const loser = await Player.findOne({ name: loserName });
      if (loser) {
        loser.rating = previousLoserElo;
        await loser.save();
      }
    }
    // Delete the match from the database
    await match.deleteOne();
    console.log("Match deletion and rating reversion completed.");
  } catch (error) {
    console.error("Error deleting match and reverting ratings:", error);
  } finally {
    mongoose.disconnect(); // Close the connection when done
  }
};
// Pass the matchId as a command line argument when running the script
const matchIdToDelete = process.argv[2];
if (!matchIdToDelete) {
  console.error("Please provide a match ID to delete.");
} else {
  deleteMatchAndRevertRatings(matchIdToDelete);
}

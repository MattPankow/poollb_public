import express from "express";
import Player from "../models/players.js";
import Match from "../models/matches.js";
const router = express.Router();
const getPlayerByName = async (playerName) => {
  try {
    const player = await Player.findOne({ name: playerName });
    if (!player) {
      console.log("Player not found");
      return null; // Return an appropriate value if the player is not found
    }
    return player; // Return the player
  } catch (error) {
    console.error("Error retrieving player information:", error);
    return null; // Handle the error and return an appropriate value
  }
};
const getWinsAndLossesCount = async (playerName) => {
  try {
    const winsCount = await Match.countDocuments({
      Winners: { $in: [playerName] },
    });
    const lossesCount = await Match.countDocuments({
      Losers: { $in: [playerName] },
    });
    return { wins: winsCount, losses: lossesCount };
  } catch (error) {
    console.error("Error counting wins and losses:", error);
    return { wins: 0, losses: 0 };
  }
};
const getMatchesByPlayer = async (playerName, year, season) => {
  try {
    const matches = await Match.find({
      $or: [
        { Winners: { $in: [playerName] } },
        { Losers: { $in: [playerName] } },
      ],
      "season.year": year,
      "season.semester": season,
    });
    return matches;
  } catch (error) {
    console.error("Error retrieving matches:", error);
    return [];
  }
};
// Dynamic route for player profile using player name
router.get("/:playerName", async (req, res) => {
  const playerName = req.params.playerName;
  const year = req.query.year; // Replace with the default year
  season = req.query.semester; // Replace with the default semester
  if (season == "Spring") {
    season = 1;
  } else {
    season = 2;
  }
  console.log(year, season);
  const player = await getPlayerByName(playerName);
  if (!player) {
    // Handle the case where the player is not found
    return res.status(404).send("Player not found");
  }
  let matches = await getMatchesByPlayer(player.name, year, season);
  matches = matches.reverse();
  const { wins, losses } = await getWinsAndLossesCount(player.name);
  console.log(`Wins: ${wins}, Losses: ${losses}`);
  res.render("profile", { player, matches, wins, losses, year, season });
});
export default router;

import express from "express";
import Match from "../models/matches.js";

const router = express.Router();

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

const seasons = [
  //{ year: 2023, semester: 2 },
  //{ year: 2024, semester: 1 },
  //{ year: 2024, semester: 2 },
  //{ year: 2025, semester: 1 },
  { year: 2025, semester: 2 },
  { year: 2026, semester: 1 },
  { year: 2026, semester: 2 },
  // Add more seasons as needed
];

const filterCurrentSeason = (seasons, currentYear, currentSemester) => {
  return seasons.filter(
    (season) =>
      !(season.year == currentYear && season.semester == currentSemester),
  );
};

router.get("/", async (req, res) => {
  try {
    // Get the year and semester from req.query or use default values
    const year = req.query.year || 2025;
    const semester = req.query.semester || 2;
    const sortedPlayers = await calculateRankings(year, semester);
    const season = semester == 1 ? "Spring" : "Fall";

    const filteredSeasons = filterCurrentSeason(seasons, year, semester);

    res.render("leaderboard", {
      players: sortedPlayers,
      year,
      season,
      filteredSeasons,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

export default router;


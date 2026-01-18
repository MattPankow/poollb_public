import express from "express";
import Player from "../models/players.js";
import Match from "../models/matches.js";

const router = express.Router();

router.get("/", (_, res) => {
  // Retrieve player data from the MongoDB collection
  Player.find()
    .sort({ name: 1 })
    .then((players) => {
      // Render the index.ejs template and pass the player data as a variable
      res.render("headToHead", {
        players: players,
        headToHeadRecord: "",
        headToHeadGames: "",
      });
    })
    .catch((error) => {
      console.error("Error retrieving player data:", error);
      res.status(500).send("Internal Server Error");
    });
});

router.post("/", async (req, res) => {
  console.log("POSTING HEAD TO HEAD");
  const player1 = req.body.player1;
  const player2 = req.body.player2;

  try {
    // Query the database to get head-to-head information
    const headToHeadRecord = await getHeadToHeadRecord(player1, player2);
    const headToHeadGames = await getHeadToHeadGames(player1, player2);

    // Retrieve player data from the MongoDB collection
    const players = await Player.find().sort({ name: 1 });

    // Render the headToHead.ejs template and pass the player data along with other variables
    res.render("headToHead", { players, headToHeadRecord, headToHeadGames });
  } catch (error) {
    console.error("Error processing head-to-head request:", error);
    res.status(500).send("Internal Server Error");
  }
});

const getHeadToHeadRecord = async (player1, player2) => {
  // Implement logic to retrieve the all-time record between player1 and player2
  // You may query your database to get the head-to-head record
  // For example:
  const matches = await Match.find({
    $or: [
      {
        Winners: { $in: [player1] },
        Losers: { $in: [player2] },
      },
      {
        Winners: { $in: [player2] },
        Losers: { $in: [player1] },
      },
    ],
  });

  const winsPlayer1 = matches.filter((match) =>
    match.Winners.includes(player1),
  ).length;
  const winsPlayer2 = matches.length - winsPlayer1;

  return `${player1}: ${winsPlayer1} wins, ${player2}: ${winsPlayer2} wins`;
};

const getHeadToHeadGames = async (player1, player2) => {
  // Implement logic to retrieve the list of head-to-head games between player1 and player2
  // You may query your database to get the head-to-head games
  // For example:
  const matches = await Match.find({
    $or: [{ Winners: [player1, player2] }, { Winners: [player2, player1] }],
  });

  return matches.map(
    (match) =>
      `${match.Winners.join(" and ")} vs ${match.Losers.join(" and ")}`,
  );
};

export default router;


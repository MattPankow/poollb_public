import mongoose from "mongoose";
import PoolLeagueTeam from "../models/poolLeagueTeam.js";
import PoolLeagueMatch from "../models/poolLeagueMatch.js";
import dotenv from "dotenv";
dotenv.config();

// ── CONFIG ────────────────────────────────────────────────────────────────────
const OLD_NAME = "OLD_NAME"; // Exact name to search for (case-sensitive)
const NEW_NAME = "NEW_NAME"; // New name to replace with
// ─────────────────────────────────────────────────────────────────────────────
// Run: node scripts/renamePlayer.js
// Testing: docker-compose exec poollb node scripts/renamePlayer.js

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

const renamePlayer = async () => {
  try {
    // 1. Update playerNames[] and name on any PoolLeagueTeam that contains the old name
    const affectedTeams = await PoolLeagueTeam.find({
      $or: [
        { playerNames: OLD_NAME },
        { name: { $regex: OLD_NAME, $options: "i" } },
      ],
    });
    let teamsModified = 0;
    let matchesModified = 0;

    for (const team of affectedTeams) {
      // Update playerNames array
      team.playerNames = team.playerNames.map((n) => (n === OLD_NAME ? NEW_NAME : n));

      // If the team name was auto-generated from player names, update it too
      const oldTeamName = team.name;
      const newTeamName = team.name.includes(OLD_NAME)
        ? team.name.split(OLD_NAME).join(NEW_NAME)
        : team.name;
      team.name = newTeamName;
      await team.save();
      teamsModified++;

      // If the team name changed, update all PoolLeagueMatch records referencing it
      if (oldTeamName !== newTeamName) {
        const matchResultA = await PoolLeagueMatch.updateMany(
          { teamAName: oldTeamName },
          { $set: { teamAName: newTeamName } }
        );
        const matchResultB = await PoolLeagueMatch.updateMany(
          { teamBName: oldTeamName },
          { $set: { teamBName: newTeamName } }
        );
        matchesModified += matchResultA.modifiedCount + matchResultB.modifiedCount;
        if (matchResultA.modifiedCount + matchResultB.modifiedCount > 0) {
          console.log(`    Team name changed: "${oldTeamName}" → "${newTeamName}" (${matchResultA.modifiedCount + matchResultB.modifiedCount} match record(s) updated)`);
        }
      }
    }
    console.log(`[1/1] PoolLeagueTeam updated: ${teamsModified} team(s), ${matchesModified} PoolLeagueMatch record(s) modified`);

    console.log("Done! Rename complete.");
  } catch (error) {
    console.error("Error renaming player:", error);
  } finally {
    mongoose.disconnect();
  }
};

renamePlayer();

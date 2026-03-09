import mongoose from "mongoose";
import PoolLeagueTeam from "../models/poolLeagueTeam.js";
import PoolLeagueMatch from "../models/poolLeagueMatch.js";
import PoolLeagueSeason from "../models/poolLeagueSeason.js";
import dotenv from "dotenv";
dotenv.config();

// Usage: docker-compose exec poollb node scripts/renamePlayer.js "Old Name" "New Name" "Spring 2026"
const [OLD_NAME, NEW_NAME, SEASON_LABEL] = process.argv.slice(2);

if (!OLD_NAME || !NEW_NAME || !SEASON_LABEL) {
  console.error('Usage: node scripts/renamePlayer.js "Old Name" "New Name" "Spring 2026 2v2"');
  process.exit(1);
}

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
    // Find the season by seasonName or "Semester Year" format
    const [semester, year] = SEASON_LABEL.split(" ");
    const season = await PoolLeagueSeason.findOne({
      $or: [
        { seasonName: SEASON_LABEL },
        { semester, year: parseInt(year) },
      ],
    });

    if (!season) {
      console.error(`Season "${SEASON_LABEL}" not found. Aborting.`);
      return;
    }
    console.log(`Season found: ${season.seasonName || `${season.semester} ${season.year}`} (${season.status})`);

    // 1. Update playerNames[] and name on any PoolLeagueTeam in this season that contains the old name
    const affectedTeams = await PoolLeagueTeam.find({
      seasonId: season._id,
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
          { seasonId: season._id, teamAName: oldTeamName },
          { $set: { teamAName: newTeamName } }
        );
        const matchResultB = await PoolLeagueMatch.updateMany(
          { seasonId: season._id, teamBName: oldTeamName },
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

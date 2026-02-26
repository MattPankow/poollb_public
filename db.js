import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import Player from "./models/players.js";
import PoolLeagueSeason from "./models/poolLeagueSeason.js";
import PoolLeagueTeam from "./models/poolLeagueTeam.js";
dotenv.config();

const {
  MONGO_HOSTNAME,
  MONGO_INITDB_ROOT_USERNAME,
  MONGO_INITDB_ROOT_PASSWORD,
  MONGO_INITDB_DATABASE,
} = process.env;

async function readPlayerNamesFromFile() {
  return new Promise((resolve, reject) => {
    const filePath = path.join(import.meta.dirname, "players.csv");
    fs.readFile(filePath, "utf8", (error, data) => {
      if (error) {
        console.error("Error reading CSV file:", error);
        reject(error);
        return;
      }

      // Split the data by newline characters to get an array of names
      const namesArray = data.split(/\r?\n/).map((name) => name.trim());

      resolve(namesArray);
    });
  });
}

async function readTeamsFromFile() {
  return new Promise((resolve, reject) => {
    const filePath = path.join(import.meta.dirname, "teams.csv");

    if (!fs.existsSync(filePath)) {
      resolve([]);
      return;
    }

    fs.readFile(filePath, "utf8", (error, data) => {
      if (error) {
        console.error("Error reading teams CSV file:", error);
        reject(error);
        return;
      }

      const rows = data
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith("#"));

      const parsed = rows
        .map((row) => row.split(",").map((value) => value.trim()))
        .filter((parts) => parts.length === 2)
        .map((parts) => {
          const [playerAName, playerBName] = parts;
          return {
            teamName: `${playerAName} / ${playerBName}`,
            playerAName,
            playerBName,
          };
        });

      resolve(parsed);
    });
  });
}

const getCurrentSeasonDescriptor = () => {
  const now = new Date();
  return {
    year: now.getFullYear(),
    semester: now.getMonth() < 6 ? 1 : 2,
  };
};

const seedPoolLeagueTeams = async () => {
  const rawTeams = await readTeamsFromFile();

  if (rawTeams.length === 0) {
    console.log("No teams.csv entries found; skipped Pool League team seeding.");
    return;
  }

  const seasonDescriptor = getCurrentSeasonDescriptor();
  const season =
    (await PoolLeagueSeason.findOne(seasonDescriptor)) ||
    (await PoolLeagueSeason.create({
      ...seasonDescriptor,
      status: "SIGNUP",
      regularWeeks: 4,
      regularRounds: 8,
    }));

  if (season.status !== "SIGNUP") {
    console.log("Pool League season is not in signup state; skipped team seeding.");
    return;
  }

  const existingTeamsCount = await PoolLeagueTeam.countDocuments({ seasonId: season._id });
  if (existingTeamsCount > 0) {
    console.log("Pool League teams already exist for current season; skipped team seeding.");
    return;
  }

  const players = await Player.find();
  const playerIdByName = new Map(players.map((player) => [player.name, player._id]));
  const usedPlayers = new Set();
  const teamDocs = [];

  rawTeams.forEach((team) => {
    const playerAId = playerIdByName.get(team.playerAName);
    const playerBId = playerIdByName.get(team.playerBName);

    if (!playerAId || !playerBId) {
      console.log(
        `Skipping team '${team.teamName}' because a player was not found in players.csv`,
      );
      return;
    }

    const playerAKey = String(playerAId);
    const playerBKey = String(playerBId);

    if (playerAKey === playerBKey) {
      console.log(`Skipping team '${team.teamName}' due to duplicate player.`);
      return;
    }

    if (usedPlayers.has(playerAKey) || usedPlayers.has(playerBKey)) {
      console.log(`Skipping team '${team.teamName}' because a player is already assigned.`);
      return;
    }

    usedPlayers.add(playerAKey);
    usedPlayers.add(playerBKey);

    teamDocs.push({
      seasonId: season._id,
      name: team.teamName,
      playerIds: [playerAId, playerBId],
      playerNames: [team.playerAName, team.playerBName],
    });
  });

  if (teamDocs.length === 0) {
    console.log("No valid teams found in teams.csv; skipped team insertion.");
    return;
  }

  await PoolLeagueTeam.insertMany(teamDocs, { ordered: false });
  console.log(`Pool League teams added from teams.csv: ${teamDocs.length}`);
};

const initializeDatabase = async () => {
  try {
    console.log("Connecting to MongoDB");

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

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    const db = mongoose.connection.db;

    const collection = db.collection("players");
    await collection.createIndex({ name: 1 }, { unique: true });
    const playerNames = await readPlayerNamesFromFile();
    const playersData = playerNames.map((name) => ({ name, rating: 1000 }));

    // Use bulk insertion for efficiency
    const bulk = collection.initializeUnorderedBulkOp();
    playersData.forEach((player) => {
      bulk.insert(player);
    });

    // Execute the bulk insert operation
    try {
      await bulk.execute();
      console.log("Players added");
    } catch (error) {
      if (error.code === 11000) {
        // Duplicate key error
        console.log("Duplicate player name, skipped");
      } else {
        throw error;
      }
    }

    await seedPoolLeagueTeams();
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
};

export default initializeDatabase;


import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
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
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
};

export default initializeDatabase;


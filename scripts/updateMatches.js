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

const updateMatches = async () => {
  try {
    const matches = await Match.find({}); // Retrieve all matches

    // Iterate through each match and update the new attribute
    for (const match of matches) {
      match.season.year = 2023; // Set the default value for the new attribute
      match.season.semester = 2;
      await match.save(); // Save the updated match
    }

    console.log("Update completed.");
  } catch (error) {
    console.error("Error updating matches:", error);
  } finally {
    mongoose.disconnect(); // Close the connection when done
  }
};

updateMatches();


import mongoose from "mongoose";
import Match from "../models/matches.js";
import dotenv from "dotenv";
console.log('Before connecting to mongodb');
dotenv.config();
const url = process.env.MONGODB_URI;
//const url = "mongodb+srv://USER:PASSWORD!@cluster0.hqzts44.mongodb.net/poollb?retryWrites=true&w=majority";
mongoose.connect(url, {
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
        console.log('Update completed.');
    }
    catch (error) {
        console.error('Error updating matches:', error);
    }
    finally {
        mongoose.disconnect(); // Close the connection when done
    }
};
updateMatches();

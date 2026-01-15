import mongoose from "mongoose";
import Player from "../models/players.js";
import dotenv from "dotenv";
console.log('Before connecting to mongodb');
dotenv.config();
console.log('Before connecting to mongodb');
mongoose.connect(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});
const resetPlayerRatings = async () => {
    try {
        const players = await Player.find({}); // Retrieve all players
        // Iterate through each player and reset the rating to 1000
        for (const player of players) {
            player.rating = 1000; // Reset rating to 1000
            await player.save(); // Save the updated player
        }
        console.log('Player ratings reset completed.');
    }
    catch (error) {
        console.error('Error resetting player ratings:', error);
    }
    finally {
        mongoose.disconnect(); // Close the connection when done
    }
};
resetPlayerRatings();

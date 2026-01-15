import express from "express";
import Match from "../models/matches.js";
import Player from "../models/players.js";
const router = express.Router();
// DELETE route to remove a game by its _id
router.delete('/:gameId', async (req, res) => {
    const gameId = req.params.gameId;
    console.log('attempt');
    try {
        // Find the game by its _id and remove it
        const removedGame = await Match.findByIdAndRemove(gameId);
        if (!removedGame) {
            // Game not found
            return res.status(404).send('Game not found');
        }
        // Calculate the reversed ratingChange for winners and losers
        const reversedRatingChange = -removedGame.ratingChange;
        // Update the player ratings
        // Function to update player rating
        const updatePlayerRating = async (playerName, ratingChange) => {
            try {
                const player = await Player.findOne({ name: playerName });
                if (player) {
                    player.rating += ratingChange;
                    await player.save();
                    console.log('Player updated:', player.name, 'New Rating:', player.rating);
                }
            }
            catch (error) {
                console.error('Error updating player rating:', error);
            }
        };
        // Update ratings for winners (negative change)
        for (const winner of removedGame.Winners) {
            await updatePlayerRating(winner, reversedRatingChange);
        }
        // Update ratings for losers (positive change)
        for (const loser of removedGame.Losers) {
            await updatePlayerRating(loser, removedGame.ratingChange);
        }
        // Send a success response
        res.status(200).send('Game removed successfully');
    }
    catch (error) {
        console.error('Error removing game:', error);
        res.status(500).send('Internal Server Error');
    }
});
export default router;

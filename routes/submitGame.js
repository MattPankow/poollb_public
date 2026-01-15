import express from "express";
import Player from "../models/players.js";
import Match from "../models/matches.js";
const router = express.Router();
router.get('/', (req, res) => {
    // Retrieve player data from the MongoDB collection
    Player.find()
        .sort({ name: 1 })
        .then(players => {
        // Render the index.ejs template and pass the player data as a variable
        res.render('submitGame', { players: players });
    })
        .catch(error => {
        console.error('Error retrieving player data:', error);
        res.status(500).send('Internal Server Error');
    });
});
const getName = async (playerId) => {
    try {
        const player = await Player.findById(playerId);
        if (!player) {
            console.log('Player not found');
            return null; // Return an appropriate value if the player is not found
        }
        return player.name; // Return the player's name
    }
    catch (error) {
        console.error('Error retrieving player information:', error);
        return null; // Handle the error and return an appropriate value
    }
};
const getPlayerRating = async (playerId) => {
    return Player.findById(playerId)
        .then((player) => {
        if (!player) {
            console.log('Player not found');
            return null; // Return an appropriate value if the player is not found
        }
        console.log('Player found:', player.name, 'Rating:', player.rating);
        return player.rating; // Return the player's rating
    })
        .catch((error) => {
        console.error('Error retrieving player information:', error);
        return null; // Handle the error and return an appropriate value
    });
};
const updateRatings = async (playerID, newRating) => {
    try {
        const player = await Player.findByIdAndUpdate(playerID, { $set: { rating: newRating } }, { new: true });
        if (!player) {
            console.log('Player not found');
            return null;
        }
        console.log('Player updated:', player.name, 'New Rating:', player.rating);
    }
    catch (error) {
        console.error('Error updating player rating:', error);
        return null; // Handle the error and return an appropriate value
    }
};
const calculateElo1v1 = async (formData) => {
    let ratingWinner1 = await getPlayerRating(formData.winner1);
    let ratingLoser1 = await getPlayerRating(formData.loser1);
    const eA = 1 / (1 + 10 ** ((ratingLoser1 - ratingWinner1) / 400));
    console.log('eA:', eA);
    const eloChange = 20 * (1 - eA);
    console.log('Elo change:', eloChange);
    updateRatings(formData.winner1, ratingWinner1 + eloChange);
    updateRatings(formData.loser1, ratingLoser1 - eloChange);
    console.log(formData.winner1.name);
    const winner1Name = await getName(formData.winner1);
    const loser1Name = await getName(formData.loser1);
    try {
        // Create a new match document
        const match = new Match({
            Winners: [winner1Name],
            WinnerElos: [ratingWinner1],
            Losers: [loser1Name],
            LoserElos: [ratingLoser1],
            ratingChange: eloChange,
            mode: "1v1",
            season: { year: 2025, semester: 2 },
        });
        // Save the match to the database
        const savedMatch = await match.save();
        console.log('1v1 match added:', savedMatch);
        return;
    }
    catch (error) {
        console.error('Error adding 1v1 match:', error);
        throw error;
    }
};
const calculateElo2v2 = async (formData) => {
    let ratingWinner1 = await getPlayerRating(formData.winner1);
    let ratingLoser1 = await getPlayerRating(formData.loser1);
    let ratingWinner2 = await getPlayerRating(formData.winner2);
    let ratingLoser2 = await getPlayerRating(formData.loser2);
    const ratingWinners = (ratingWinner1 + ratingWinner2) / 2;
    const ratingLosers = (ratingLoser1 + ratingLoser2) / 2;
    const eA = 1 / (1 + 10 ** ((ratingLosers - ratingWinners) / 400));
    console.log('eA:', eA);
    const eloChange = 20 * (1 - eA);
    console.log('Elo change:', eloChange);
    updateRatings(formData.winner1, ratingWinner1 + eloChange);
    updateRatings(formData.loser1, ratingLoser1 - eloChange);
    updateRatings(formData.winner2, ratingWinner2 + eloChange);
    updateRatings(formData.loser2, ratingLoser2 - eloChange);
    const winner1Name = await getName(formData.winner1);
    const loser1Name = await getName(formData.loser1);
    const winner2Name = await getName(formData.winner2);
    const loser2Name = await getName(formData.loser2);
    try {
        // Create a new match document
        const match = new Match({
            Winners: [winner1Name, winner2Name],
            WinnerElos: [ratingWinner1, ratingWinner2],
            Losers: [loser1Name, loser2Name],
            LoserElos: [ratingLoser1, ratingLoser2],
            ratingChange: eloChange,
            mode: "2v2",
            season: { year: 2025, semester: 2 },
        });
        // Save the match to the database
        const savedMatch = await match.save();
        console.log('2v2 match added:', savedMatch);
        return;
    }
    catch (error) {
        console.error('Error adding 1v1 match:', error);
        throw error;
    }
    return;
};
router.post('/', async (req, res) => {
    const formData = req.body;
    console.log(formData);
    if (!formData.winner2) {
        await calculateElo1v1(formData);
    }
    else {
        await calculateElo2v2(formData);
    }
    res.redirect('/leaderboard');
});
export default router;

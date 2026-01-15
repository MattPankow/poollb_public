import express from "express";
import Player from "../models/players.js";
import Match from "../models/matches.js";
const router = express.Router();
async function findTopRivalries() {
    try {
        const matches = await Match.find();
        const playerPairs = new Map(); // To store the count of games played between pairs of players
        for (const match of matches) {
            for (const winner of match.Winners) {
                for (const loser of match.Losers) {
                    const players = [winner, loser];
                    players.sort(); // Sort to ensure consistent order
                    const key = players.toString();
                    if (!playerPairs.has(key)) {
                        playerPairs.set(key, { wins: 0, losses: 0, totalGames: 0 });
                    }
                    const pairStats = playerPairs.get(key);
                    pairStats.totalGames++;
                    if (winner === players[0]) {
                        pairStats.wins++;
                    }
                    else {
                        pairStats.losses++;
                    }
                }
            }
        }
        const sortedRivalries = [...playerPairs.entries()]
            .sort((a, b) => (b[1].totalGames - a[1].totalGames) || (b[1].wins - a[1].wins))
            .slice(0, 10)
            .map(entry => {
            const [players, stats] = entry;
            return { players: players.split(','), totalGames: stats.totalGames };
        });
        return sortedRivalries;
    }
    catch (error) {
        console.error('Error:', error);
        throw error;
    }
}
async function calculateWinsAndLosses(playerA, playerB) {
    try {
        const matches = await Match.find({
            $or: [
                {
                    $and: [
                        { Winners: playerA },
                        { Losers: playerB },
                    ],
                },
                {
                    $and: [
                        { Winners: playerB },
                        { Losers: playerA },
                    ],
                },
            ],
        });
        let winsA = 0;
        let winsB = 0;
        matches.forEach(match => {
            if (match.Winners.includes(playerA)) {
                winsA++;
            }
            else {
                winsB++;
            }
        });
        // Determine which player has more wins and list them first
        const [firstPlayer, secondPlayer] = winsA > winsB ? [playerA, playerB] : [playerB, playerA];
        return {
            players: [firstPlayer, secondPlayer],
            Wins: winsA > winsB ? winsA : winsB,
            Losses: winsA > winsB ? winsB : winsA,
        };
    }
    catch (error) {
        console.error('Error:', error);
        throw error;
    }
}
async function findTopPlayersWithMostGamesPlayed() {
    try {
        const result = await Match.aggregate([
            // Group by player names and count the number of games played
            {
                $group: {
                    _id: { $concatArrays: ['$Winners', '$Losers'] },
                    totalGamesPlayed: { $sum: 1 },
                },
            },
            // Unwind the player names array
            { $unwind: '$_id' },
            // Group again by player names and sum the total games played
            {
                $group: {
                    _id: '$_id',
                    totalGamesPlayed: { $sum: '$totalGamesPlayed' },
                },
            },
            // Sort in descending order by total games played
            { $sort: { totalGamesPlayed: -1 } },
            // Limit to the top 3 players
            { $limit: 10 },
        ]);
        // The 'result' variable now contains the top 3 players with the most games played
        return result;
    }
    catch (error) {
        console.error('Error:', error);
    }
}
async function findTopRatingChanges() {
    try {
        const result = await Match.aggregate([
            // Sort by ratingChange in descending order
            { $sort: { ratingChange: -1 } },
            // Limit to the top 3 matches with the biggest rating changes
            { $limit: 10 },
            // Project to reshape the output to include only Winners, Losers, and ratingChange
            {
                $project: {
                    _id: 0, // Exclude _id field
                    Winners: 1,
                    WinnerElos: 1,
                    Losers: 1,
                    LoserElos: 1,
                    ratingChange: 1,
                },
            },
        ]);
        // The 'result' variable now contains the top 3 matches with Winners, Losers, and ratingChange fields
        return result;
    }
    catch (error) {
        console.error('Error:', error);
        throw error;
    }
}
router.get('/', async (req, res) => {
    try {
        const rivalries2 = await findTopRivalries(); // Call your original function to get the rivalries
        console.log(rivalries2);
        const rivalries = [];
        for (const rivalry of rivalries2) {
            const { players, games } = rivalry;
            const [playerA, playerB] = players;
            const winsAndLosses = await calculateWinsAndLosses(playerA, playerB);
            rivalries.push(winsAndLosses);
        }
        const mostMatches = await findTopPlayersWithMostGamesPlayed();
        const topUpsets = await findTopRatingChanges();
        console.log(rivalries);
        console.log(mostMatches);
        console.log(topUpsets);
        res.render('superlatives', { mostMatches, topUpsets, rivalries });
    }
    catch (error) {
        console.error('Error:', error);
        // Handle the error and send an appropriate response
        res.status(500).send('Internal Server Error');
    }
});
export default router;

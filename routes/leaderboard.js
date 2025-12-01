const express = require('express');
const router = express.Router();
const Player = require('../models/players');
const Match = require('../models/matches');

const calculateRankings = async (year, semester) => {
  try {
    const matches = await Match.find({
      'season.year': year,
      'season.semester': semester,
    });

    const playerRatings = new Map();

    matches.forEach(match => {
      match.Winners.forEach((winner, index) => {
        const winnerRating = playerRatings.get(winner) || 1000;
        const loserRating = playerRatings.get(match.Losers[index]) || 1000;

        playerRatings.set(winner, winnerRating + match.ratingChange);
        playerRatings.set(match.Losers[index], loserRating - match.ratingChange);
      });
    });

    const playerArray = Array.from(playerRatings, ([name, rating]) => ({ name, rating }));
    playerArray.sort((a, b) => b.rating - a.rating);

    //console.log(playerArray);

    return playerArray;
  } catch (error) {
    console.error('Error calculating rankings:', error);
    throw error;
  }
};



const seasons = [
  //{ year: 2023, semester: 2 },
  //{ year: 2024, semester: 1 },
  //{ year: 2024, semester: 2 },
  //{ year: 2025, semester: 1 },
  { year: 2025, semester: 2 },
  { year: 2026, semester: 1 },
  { year: 2026, semester: 2 },
  // Add more seasons as needed
];

const filterCurrentSeason = (seasons, currentYear, currentSemester) => {
  return seasons.filter((season) => !(season.year == currentYear && season.semester == currentSemester));
};





router.get('/', async (req, res) => {
  try {
    // Get the year and semester from req.query or use default values
    const year = req.query.year || 2024;
    const semester = req.query.semester || 1;

    const sortedPlayers = await calculateRankings(year, semester);
    if(semester == 1)  season = 'Spring';
    if(semester == 2)  season = 'Fall';

    console.log(seasons);
    const filteredSeasons = filterCurrentSeason(seasons, year, semester);
    console.log(filteredSeasons);
    console.log('\n\n\n');



    res.render('leaderboard', { players: sortedPlayers, year, season, filteredSeasons });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;

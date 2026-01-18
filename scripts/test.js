import Match from "../models/matches.js";

async function findTopRivalries() {
  try {
    const pipeline = [
      {
        $project: {
          players: {
            $concatArrays: ["$Winners", "$Losers"],
          },
        },
      },
      {
        $unwind: "$players",
      },
      {
        $group: {
          _id: "$players",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 6, // Fetch top 6 players who have played most games
      },
    ];
    const result = await Match.aggregate(pipeline);

    // Extract player names and sort by count
    const topPlayers = result
      .map((player) => ({ name: player._id, count: player.count }))
      .sort((a, b) => b.count - a.count);

    // Find the top 3 rivalries
    const topRivalries = [];
    for (let i = 0; i < topPlayers.length - 1; i++) {
      for (let j = i + 1; j < topPlayers.length; j++) {
        topRivalries.push({
          players: [topPlayers[i].name, topPlayers[j].name],
          games: Math.min(topPlayers[i].count, topPlayers[j].count),
        });
      }
    }

    // Sort rivalries by games count
    const sortedRivalries = topRivalries
      .sort((a, b) => b.games - a.games)
      .slice(0, 3);

    return sortedRivalries;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

export default findTopRivalries;


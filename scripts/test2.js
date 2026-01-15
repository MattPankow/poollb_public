async function findTopRivalries() {
  try {
    const matches = await Match.find();
    const playerPairs = {}; // To store the count of games played between pairs of players
    for (const match of matches) {
      for (const winner of match.Winners) {
        for (const loser of match.Losers) {
          const players = [winner, loser];
          players.sort(); // Sort to make sure the order doesn't affect the pair
          const key = players.join(",");
          if (playerPairs[key]) {
            playerPairs[key]++;
          } else {
            playerPairs[key] = 1;
          }
        }
      }
    }
    const topRivalries = Object.keys(playerPairs)
      .map((key) => {
        const [player1, player2] = key.split(",");
        return { players: [player1, player2], games: playerPairs[key] };
      })
      .sort((a, b) => b.games - a.games)
      .slice(0, 3);
    return topRivalries;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}
export default findTopRivalries;

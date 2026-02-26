import PoolLeagueSeason from "../models/poolLeagueSeason.js";
import PoolLeagueTeam from "../models/poolLeagueTeam.js";
import PoolLeagueMatch from "../models/poolLeagueMatch.js";
import Player from "../models/players.js";

const REGULAR_WEEKS = 4;
const REGULAR_ROUNDS = 8;

const toId = (value) => String(value);

const getCurrentSeasonDescriptor = () => {
  const now = new Date();
  const year = now.getFullYear();
  const semester = now.getMonth() < 6 ? 1 : 2;
  return { year, semester };
};

const getOrCreateCurrentSeason = async () => {
  const descriptor = getCurrentSeasonDescriptor();
  let season = await PoolLeagueSeason.findOne(descriptor);

  if (!season) {
    season = await PoolLeagueSeason.create({
      ...descriptor,
      regularWeeks: REGULAR_WEEKS,
      regularRounds: REGULAR_ROUNDS,
      status: "SIGNUP",
    });
  }

  return season;
};

const getSeasonLabel = (season) => {
  if (!season) return "Unknown";
  const semesterLabel = season.semester === 1 ? "Spring" : "Fall";
  return `${semesterLabel} ${season.year}`;
};

const createTeam = async (seasonId, playerAId, playerBId, requestedName) => {
  const season = await PoolLeagueSeason.findById(seasonId);
  if (!season) {
    throw new Error("Season not found.");
  }

  if (season.status !== "SIGNUP") {
    throw new Error("Team registration is closed for this season.");
  }

  if (!playerAId || !playerBId) {
    throw new Error("Two players are required for a team.");
  }

  if (toId(playerAId) === toId(playerBId)) {
    throw new Error("A team must contain two different players.");
  }

  const players = await Player.find({ _id: { $in: [playerAId, playerBId] } });
  if (players.length !== 2) {
    throw new Error("One or more selected players were not found.");
  }

  const existingPlayerUsage = await PoolLeagueTeam.findOne({
    seasonId,
    playerIds: { $in: [playerAId, playerBId] },
  });

  if (existingPlayerUsage) {
    throw new Error("One of these players is already on a registered team.");
  }

  const playerNames = players.map((player) => player.name).sort();
  const name = (requestedName || "").trim() || `${playerNames[0]} / ${playerNames[1]}`;

  const existingName = await PoolLeagueTeam.findOne({ seasonId, name });
  if (existingName) {
    throw new Error("Team name already exists for this season.");
  }

  return PoolLeagueTeam.create({
    seasonId,
    name,
    playerIds: [playerAId, playerBId],
    playerNames,
  });
};

const buildRoundPairings = (teams, totalRounds) => {
  if (teams.length < 2 || teams.length % 2 !== 0) {
    throw new Error("An even number of teams is required to generate the schedule.");
  }

  const rotation = [...teams];
  const rounds = [];

  for (let round = 1; round <= totalRounds; round += 1) {
    const pairings = [];
    const midpoint = rotation.length / 2;

    for (let index = 0; index < midpoint; index += 1) {
      const teamA = rotation[index];
      const teamB = rotation[rotation.length - 1 - index];

      if (round % 2 === 0) {
        pairings.push([teamB, teamA]);
      } else {
        pairings.push([teamA, teamB]);
      }
    }

    rounds.push({ round, pairings });

    const fixedTeam = rotation[0];
    const rest = rotation.slice(1);
    rest.unshift(rest.pop());
    rotation.splice(0, rotation.length, fixedTeam, ...rest);
  }

  return rounds;
};

const generateRegularSchedule = async (seasonId) => {
  const season = await PoolLeagueSeason.findById(seasonId);
  if (!season) {
    throw new Error("Season not found.");
  }

  if (season.status !== "SIGNUP") {
    throw new Error("Regular season has already started for this season.");
  }

  const existing = await PoolLeagueMatch.countDocuments({ seasonId, phase: "REGULAR" });
  if (existing > 0) {
    return { created: 0, message: "Regular season schedule already exists." };
  }

  const teams = await PoolLeagueTeam.find({ seasonId }).sort({ name: 1 });

  if (teams.length < 4) {
    throw new Error("At least 4 teams are required before generating the regular season.");
  }

  if (teams.length % 2 !== 0) {
    throw new Error("Team count must be even before generating the schedule.");
  }

  const rounds = buildRoundPairings(teams, REGULAR_ROUNDS);
  const matchesToInsert = [];

  rounds.forEach((roundData) => {
    roundData.pairings.forEach(([teamA, teamB]) => {
      matchesToInsert.push({
        seasonId,
        phase: "REGULAR",
        week: Math.ceil(roundData.round / 2),
        round: roundData.round,
        teamAId: teamA._id,
        teamBId: teamB._id,
        teamAName: teamA.name,
        teamBName: teamB.name,
        status: "TBD",
      });
    });
  });

  await PoolLeagueMatch.insertMany(matchesToInsert);
  await PoolLeagueSeason.findByIdAndUpdate(seasonId, { status: "REGULAR" });

  return {
    created: matchesToInsert.length,
    message: "Regular season schedule generated.",
  };
};

const getHeadToHeadWins = (completedRegularMatches, teamAId, teamBId) => {
  const aId = toId(teamAId);
  const bId = toId(teamBId);

  let winsA = 0;
  let winsB = 0;

  completedRegularMatches.forEach((match) => {
    const teamsInMatch = [toId(match.teamAId), toId(match.teamBId)];
    if (!teamsInMatch.includes(aId) || !teamsInMatch.includes(bId)) {
      return;
    }

    if (toId(match.winnerTeamId) === aId) {
      winsA += 1;
    } else if (toId(match.winnerTeamId) === bId) {
      winsB += 1;
    }
  });

  return { winsA, winsB };
};

const computeStandings = async (seasonId) => {
  const teams = await PoolLeagueTeam.find({ seasonId }).sort({ name: 1 });

  const completedRegularMatches = await PoolLeagueMatch.find({
    seasonId,
    phase: "REGULAR",
    status: "COMPLETE",
  });

  const standingsMap = new Map();

  teams.forEach((team) => {
    standingsMap.set(toId(team._id), {
      teamId: toId(team._id),
      teamName: team.name,
      players: team.playerNames,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDifferential: 0,
      winPct: 0,
      rank: 0,
    });
  });

  completedRegularMatches.forEach((match) => {
    const a = standingsMap.get(toId(match.teamAId));
    const b = standingsMap.get(toId(match.teamBId));

    if (!a || !b) {
      return;
    }

    const teamAScore = Number(match.teamAScore || 0);
    const teamBScore = Number(match.teamBScore || 0);

    a.pointsFor += teamAScore;
    a.pointsAgainst += teamBScore;

    b.pointsFor += teamBScore;
    b.pointsAgainst += teamAScore;

    if (toId(match.winnerTeamId) === toId(match.teamAId)) {
      a.wins += 1;
      b.losses += 1;
    } else if (toId(match.winnerTeamId) === toId(match.teamBId)) {
      b.wins += 1;
      a.losses += 1;
    }
  });

  const standings = Array.from(standingsMap.values());

  standings.forEach((entry) => {
    entry.pointDifferential = entry.pointsFor - entry.pointsAgainst;
    const totalMatches = entry.wins + entry.losses;
    entry.winPct = totalMatches === 0 ? 0 : entry.wins / totalMatches;
  });

  standings.sort((teamA, teamB) => {
    if (teamB.winPct !== teamA.winPct) {
      return teamB.winPct - teamA.winPct;
    }

    if (teamB.wins !== teamA.wins) {
      return teamB.wins - teamA.wins;
    }

    const headToHead = getHeadToHeadWins(
      completedRegularMatches,
      teamA.teamId,
      teamB.teamId,
    );

    if (headToHead.winsA !== headToHead.winsB) {
      return headToHead.winsB - headToHead.winsA;
    }

    if (teamB.pointDifferential !== teamA.pointDifferential) {
      return teamB.pointDifferential - teamA.pointDifferential;
    }

    if (teamB.pointsFor !== teamA.pointsFor) {
      return teamB.pointsFor - teamA.pointsFor;
    }

    return teamA.teamName.localeCompare(teamB.teamName);
  });

  standings.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  return standings;
};

const isRegularSeasonComplete = async (seasonId) => {
  const regularMatches = await PoolLeagueMatch.find({ seasonId, phase: "REGULAR" });
  if (regularMatches.length === 0) {
    return false;
  }

  return regularMatches.every((match) => match.status === "COMPLETE");
};

const createSeriesMatches = async ({
  seasonId,
  playoffRound,
  seriesKey,
  bestOf,
  teamA,
  teamB,
}) => {
  if (!teamA || !teamB) {
    return;
  }

  const existing = await PoolLeagueMatch.findOne({ seasonId, phase: "PLAYOFFS", seriesKey });
  if (existing) {
    return;
  }

  const toInsert = [];
  for (let gameNumber = 1; gameNumber <= bestOf; gameNumber += 1) {
    toInsert.push({
      seasonId,
      phase: "PLAYOFFS",
      playoffRound,
      seriesKey,
      bestOf,
      gameNumber,
      teamAId: teamA._id,
      teamBId: teamB._id,
      teamAName: teamA.name,
      teamBName: teamB.name,
      status: "TBD",
    });
  }

  await PoolLeagueMatch.insertMany(toInsert);
};

const seedPlayoffs = async (seasonId) => {
  const season = await PoolLeagueSeason.findById(seasonId);
  if (!season) {
    throw new Error("Season not found.");
  }

  if (season.playoffsGenerated) {
    return { created: false, message: "Playoffs already generated." };
  }

  const standings = await computeStandings(seasonId);

  if (standings.length < 8) {
    throw new Error("At least 8 teams are required for playoffs.");
  }

  const seedIds = standings.slice(0, 8).map((entry) => entry.teamId);
  const teams = await PoolLeagueTeam.find({ _id: { $in: seedIds } });
  const teamById = new Map(teams.map((team) => [toId(team._id), team]));

  const seed = (index) => teamById.get(seedIds[index - 1]);

  await createSeriesMatches({
    seasonId,
    playoffRound: "QF",
    seriesKey: "QF-1",
    bestOf: 3,
    teamA: seed(1),
    teamB: seed(8),
  });
  await createSeriesMatches({
    seasonId,
    playoffRound: "QF",
    seriesKey: "QF-2",
    bestOf: 3,
    teamA: seed(4),
    teamB: seed(5),
  });
  await createSeriesMatches({
    seasonId,
    playoffRound: "QF",
    seriesKey: "QF-3",
    bestOf: 3,
    teamA: seed(3),
    teamB: seed(6),
  });
  await createSeriesMatches({
    seasonId,
    playoffRound: "QF",
    seriesKey: "QF-4",
    bestOf: 3,
    teamA: seed(2),
    teamB: seed(7),
  });

  await PoolLeagueSeason.findByIdAndUpdate(seasonId, {
    playoffsGenerated: true,
    status: "PLAYOFFS",
  });

  return { created: true, message: "Playoff bracket generated." };
};

const getSeriesState = async (seasonId, seriesKey) => {
  const seriesMatches = await PoolLeagueMatch.find({
    seasonId,
    phase: "PLAYOFFS",
    seriesKey,
  }).sort({ gameNumber: 1 });

  if (seriesMatches.length === 0) {
    return null;
  }

  let teamAWins = 0;
  let teamBWins = 0;

  seriesMatches.forEach((match) => {
    if (match.status !== "COMPLETE") {
      return;
    }

    if (toId(match.winnerTeamId) === toId(match.teamAId)) {
      teamAWins += 1;
    } else if (toId(match.winnerTeamId) === toId(match.teamBId)) {
      teamBWins += 1;
    }
  });

  const bestOf = seriesMatches[0].bestOf;
  const neededWins = Math.floor(bestOf / 2) + 1;

  let winnerTeamId = null;
  if (teamAWins >= neededWins) {
    winnerTeamId = seriesMatches[0].teamAId;
  } else if (teamBWins >= neededWins) {
    winnerTeamId = seriesMatches[0].teamBId;
  }

  return {
    seriesMatches,
    teamAWins,
    teamBWins,
    bestOf,
    neededWins,
    winnerTeamId,
  };
};

const tryCreateNextRoundSeries = async (seasonId, round, leftSeriesKey, rightSeriesKey, nextSeriesKey, bestOf) => {
  const left = await getSeriesState(seasonId, leftSeriesKey);
  const right = await getSeriesState(seasonId, rightSeriesKey);

  if (!left?.winnerTeamId || !right?.winnerTeamId) {
    return;
  }

  const [teamA, teamB] = await Promise.all([
    PoolLeagueTeam.findById(left.winnerTeamId),
    PoolLeagueTeam.findById(right.winnerTeamId),
  ]);

  await createSeriesMatches({
    seasonId,
    playoffRound: round,
    seriesKey: nextSeriesKey,
    bestOf,
    teamA,
    teamB,
  });
};

const updatePlayoffProgression = async (seasonId) => {
  await tryCreateNextRoundSeries(seasonId, "SF", "QF-1", "QF-2", "SF-1", 3);
  await tryCreateNextRoundSeries(seasonId, "SF", "QF-3", "QF-4", "SF-2", 3);
  await tryCreateNextRoundSeries(seasonId, "F", "SF-1", "SF-2", "F-1", 5);

  const finals = await getSeriesState(seasonId, "F-1");
  if (finals?.winnerTeamId) {
    await PoolLeagueSeason.findByIdAndUpdate(seasonId, { status: "COMPLETE" });
  }
};

const submitMatchScore = async (matchId, teamAScore, teamBScore) => {
  const match = await PoolLeagueMatch.findById(matchId);

  if (!match) {
    throw new Error("Match not found.");
  }

  const scoreA = Number(teamAScore);
  const scoreB = Number(teamBScore);

  if (Number.isNaN(scoreA) || Number.isNaN(scoreB)) {
    throw new Error("Scores must be numeric.");
  }

  if (scoreA === scoreB) {
    throw new Error("Ties are not allowed. Enter a winner.");
  }

  if (match.phase === "PLAYOFFS") {
    const series = await getSeriesState(match.seasonId, match.seriesKey);
    if (series?.winnerTeamId) {
      throw new Error("This series is already decided.");
    }
  }

  const winnerTeamId = scoreA > scoreB ? match.teamAId : match.teamBId;
  const loserTeamId = scoreA > scoreB ? match.teamBId : match.teamAId;

  match.teamAScore = scoreA;
  match.teamBScore = scoreB;
  match.winnerTeamId = winnerTeamId;
  match.loserTeamId = loserTeamId;
  match.status = "COMPLETE";
  match.completedAt = new Date();

  await match.save();

  if (match.phase === "REGULAR") {
    const regularSeasonDone = await isRegularSeasonComplete(match.seasonId);
    if (regularSeasonDone) {
      await seedPlayoffs(match.seasonId);
    }
  }

  if (match.phase === "PLAYOFFS") {
    await updatePlayoffProgression(match.seasonId);
  }

  return match;
};

const updateMatchSchedule = async (matchId, scheduledAt, location) => {
  const match = await PoolLeagueMatch.findById(matchId);

  if (!match) {
    throw new Error("Match not found.");
  }

  if (scheduledAt) {
    const parsed = new Date(scheduledAt);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error("Invalid schedule date/time.");
    }
    match.scheduledAt = parsed;
  } else {
    match.scheduledAt = undefined;
  }
  match.location = (location || "").trim();

  if (match.scheduledAt || match.location) {
    match.status = match.status === "COMPLETE" ? "COMPLETE" : "SCHEDULED";
  } else {
    match.status = match.status === "COMPLETE" ? "COMPLETE" : "TBD";
  }

  await match.save();
  return match;
};

const getTeamContext = async (seasonId, selectedTeamId) => {
  const teams = await PoolLeagueTeam.find({ seasonId }).sort({ name: 1 });
  const activeTeamId = selectedTeamId || (teams[0]?._id ? toId(teams[0]._id) : null);
  return { teams, activeTeamId };
};

const formatMatchStatus = (match) => {
  if (match.status === "COMPLETE") {
    return "Complete";
  }

  if (match.scheduledAt || match.location || match.status === "SCHEDULED") {
    return "Scheduled";
  }

  return "TBD";
};

export {
  computeStandings,
  createTeam,
  formatMatchStatus,
  generateRegularSchedule,
  getOrCreateCurrentSeason,
  getSeasonLabel,
  getTeamContext,
  seedPlayoffs,
  submitMatchScore,
  updateMatchSchedule,
};

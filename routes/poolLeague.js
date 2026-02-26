import express from "express";
import PoolLeagueMatch from "../models/poolLeagueMatch.js";
import {
  computeStandings,
  formatMatchStatus,
  generateRegularSchedule,
  getOrCreateCurrentSeason,
  getSeasonLabel,
  getTeamContext,
  submitMatchScore,
  updateMatchSchedule,
} from "../services/poolLeagueService.js";

const router = express.Router();

const serializeMatch = (match, selectedTeamId) => {
  const isTeamA = String(match.teamAId) === String(selectedTeamId);
  const opponent = isTeamA ? match.teamBName : match.teamAName;
  const teamScore = isTeamA ? match.teamAScore : match.teamBScore;
  const opponentScore = isTeamA ? match.teamBScore : match.teamAScore;

  return {
    id: String(match._id),
    opponent,
    teamName: isTeamA ? match.teamAName : match.teamBName,
    teamAName: match.teamAName,
    teamBName: match.teamBName,
    statusLabel: formatMatchStatus(match),
    phase: match.phase,
    week: match.week,
    round: match.round,
    scheduledAt: match.scheduledAt,
    location: match.location,
    teamScore,
    opponentScore,
    playoffRound: match.playoffRound,
    seriesKey: match.seriesKey,
    gameNumber: match.gameNumber,
  };
};

router.get("/", (_, res) => {
  res.redirect("/poolLeague/this-week");
});

router.get("/this-week", async (req, res) => {
  try {
    const season = await getOrCreateCurrentSeason();
    const seasonLabel = getSeasonLabel(season);
    const selectedTeamId = req.query.teamId;
    const { teams, activeTeamId } = await getTeamContext(season._id, selectedTeamId);

    const completedRounds = await PoolLeagueMatch.countDocuments({
      seasonId: season._id,
      phase: "REGULAR",
      status: "COMPLETE",
    });

    const totalMatchesPerRound = teams.length > 0 ? teams.length / 2 : 1;
    const roundsFinished = totalMatchesPerRound > 0 ? Math.floor(completedRounds / totalMatchesPerRound) : 0;
    const currentWeek = Math.min(4, Math.floor(roundsFinished / 2) + 1);

    const isPlayoffsView = season.status === "PLAYOFFS" || season.status === "COMPLETE";

    let matches = [];
    if (activeTeamId) {
      if (isPlayoffsView) {
        matches = await PoolLeagueMatch.find({
          seasonId: season._id,
          phase: "PLAYOFFS",
          $or: [{ teamAId: activeTeamId }, { teamBId: activeTeamId }],
        }).sort({ playoffRound: 1, gameNumber: 1, createdAt: 1 });
      } else {
        matches = await PoolLeagueMatch.find({
          seasonId: season._id,
          phase: "REGULAR",
          week: currentWeek,
          $or: [{ teamAId: activeTeamId }, { teamBId: activeTeamId }],
        }).sort({ round: 1, createdAt: 1 });
      }
    }

    res.render("poolLeagueThisWeek", {
      seasonLabel,
      season,
      teams,
      activeTeamId,
      currentWeek,
      isPlayoffsView,
      matches: matches.map((match) => serializeMatch(match, activeTeamId)),
      success: req.query.success || "",
      error: req.query.error || "",
    });
  } catch (error) {
    console.error("Pool League this-week error:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/history", async (req, res) => {
  try {
    const season = await getOrCreateCurrentSeason();
    const seasonLabel = getSeasonLabel(season);
    const { teams, activeTeamId } = await getTeamContext(season._id, req.query.teamId);

    const filter = {
      seasonId: season._id,
      status: "COMPLETE",
    };

    if (activeTeamId) {
      filter.$or = [{ teamAId: activeTeamId }, { teamBId: activeTeamId }];
    }

    const matches = await PoolLeagueMatch.find(filter).sort({ completedAt: -1, createdAt: -1 });

    const rows = matches.map((match) => {
      const winner = String(match.winnerTeamId) === String(match.teamAId) ? match.teamAName : match.teamBName;
      return {
        id: String(match._id),
        phase: match.phase,
        matchup: `${match.teamAName} vs ${match.teamBName}`,
        score: `${match.teamAScore} - ${match.teamBScore}`,
        winner,
        completedAt: match.completedAt,
        playoffRound: match.playoffRound,
      };
    });

    const sortBy = req.query.sortBy || "completedAt";
    if (sortBy === "winner") {
      rows.sort((a, b) => a.winner.localeCompare(b.winner));
    } else if (sortBy === "matchup") {
      rows.sort((a, b) => a.matchup.localeCompare(b.matchup));
    }

    res.render("poolLeagueHistory", {
      seasonLabel,
      teams,
      activeTeamId,
      rows,
      sortBy,
    });
  } catch (error) {
    console.error("Pool League history error:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/standings", async (req, res) => {
  try {
    const season = await getOrCreateCurrentSeason();
    const seasonLabel = getSeasonLabel(season);
    const standings = await computeStandings(season._id);

    res.render("poolLeagueStandings", {
      seasonLabel,
      standings,
      status: season.status,
    });
  } catch (error) {
    console.error("Pool League standings error:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/generate-schedule", async (_, res) => {
  try {
    const season = await getOrCreateCurrentSeason();
    const result = await generateRegularSchedule(season._id);
    const message = encodeURIComponent(result.message);
    res.redirect(`/poolLeague/this-week?success=${message}`);
  } catch (error) {
    const message = encodeURIComponent(error.message || "Failed to generate schedule");
    res.redirect(`/poolLeague/this-week?error=${message}`);
  }
});

router.post("/match/:matchId/score", async (req, res) => {
  try {
    await submitMatchScore(req.params.matchId, req.body.teamAScore, req.body.teamBScore);
    const teamIdParam = req.body.teamId ? `&teamId=${req.body.teamId}` : "";
    res.redirect(`/poolLeague/this-week?success=Score%20saved${teamIdParam}`);
  } catch (error) {
    const teamIdParam = req.body.teamId ? `&teamId=${req.body.teamId}` : "";
    const message = encodeURIComponent(error.message || "Could not save score");
    res.redirect(`/poolLeague/this-week?error=${message}${teamIdParam}`);
  }
});

router.post("/match/:matchId/schedule", async (req, res) => {
  try {
    await updateMatchSchedule(req.params.matchId, req.body.scheduledAt, req.body.location);
    const teamIdParam = req.body.teamId ? `&teamId=${req.body.teamId}` : "";
    res.redirect(`/poolLeague/this-week?success=Match%20schedule%20updated${teamIdParam}`);
  } catch (error) {
    const teamIdParam = req.body.teamId ? `&teamId=${req.body.teamId}` : "";
    const message = encodeURIComponent(error.message || "Could not update schedule");
    res.redirect(`/poolLeague/this-week?error=${message}${teamIdParam}`);
  }
});

export default router;

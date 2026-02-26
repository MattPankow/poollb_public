import mongoose from "mongoose";

const poolLeagueTeamSchema = new mongoose.Schema({
  seasonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PoolLeagueSeason",
    required: true,
  },
  name: { type: String, required: true, trim: true },
  playerIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Player",
      required: true,
    },
  ],
  playerNames: [{ type: String, required: true }],
  createdAt: { type: Date, default: Date.now },
});

poolLeagueTeamSchema.index({ seasonId: 1, name: 1 }, { unique: true });

const PoolLeagueTeam = mongoose.model("PoolLeagueTeam", poolLeagueTeamSchema);

export default PoolLeagueTeam;

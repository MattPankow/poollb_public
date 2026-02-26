import mongoose from "mongoose";

const poolLeagueSeasonSchema = new mongoose.Schema({
  year: { type: Number, required: true },
  semester: { type: Number, required: true },
  status: {
    type: String,
    enum: ["SIGNUP", "REGULAR", "PLAYOFFS", "COMPLETE"],
    default: "SIGNUP",
  },
  regularWeeks: { type: Number, default: 4 },
  regularRounds: { type: Number, default: 8 },
  playoffsGenerated: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

poolLeagueSeasonSchema.index({ year: 1, semester: 1 }, { unique: true });

const PoolLeagueSeason = mongoose.model(
  "PoolLeagueSeason",
  poolLeagueSeasonSchema,
);

export default PoolLeagueSeason;

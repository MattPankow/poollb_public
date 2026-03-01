import mongoose from "mongoose";

const poolLeagueSeasonSchema = new mongoose.Schema({
  year: { type: Number, required: true },
  semester: { type: String, required: true },
  status: {
    type: String,
    enum: ["SIGNUP", "REGULAR", "PLAYOFFS", "COMPLETE"],
    default: "SIGNUP",
  },
  regularWeeks: { type: Number, default: 4 },
  regularRounds: { type: Number, default: 8 },
  startDate: Date,
  daysBetweenWeeks: { type: Number, default: 7 },
  seasonName: { type: String, default: "" },
  breakAfterWeek: { type: Number, default: null },
  breakWeeks: { type: Number, default: 1 },
  playoffsGenerated: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

poolLeagueSeasonSchema.index({ year: 1, semester: 1 }, { unique: true });

const PoolLeagueSeason = mongoose.model(
  "PoolLeagueSeason",
  poolLeagueSeasonSchema,
);

export default PoolLeagueSeason;

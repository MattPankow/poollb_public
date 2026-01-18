import mongoose from "mongoose";

const matchSchema = new mongoose.Schema({
  Winners: [String],
  WinnerElos: [Number],
  Losers: [String],
  LoserElos: [Number],
  ratingChange: Number,
  mode: String,
  timestamp: { type: Date, default: Date.now },
  season: {
    year: Number,
    semester: Number, // 1 for Spring, 2 for Fall
  },
});

const Match = mongoose.model("Match", matchSchema);

export default Match;


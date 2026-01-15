import mongoose from "mongoose";
const playerSchema = new mongoose.Schema({
    name: String,
    rating: Number,
});
const Player = mongoose.model('Player', playerSchema);
export default Player;

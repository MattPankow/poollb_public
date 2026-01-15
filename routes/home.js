import express from "express";
import Player from "../models/players.js";
import Match from "../models/matches.js";
const router = express.Router();
router.get("/", async (req, res) => {
  try {
    res.render("home");
  } catch (error) {
    console.error("Error:", error);
    // Handle the error and send an appropriate response
    res.status(500).send("Internal Server Error");
  }
});
export default router;

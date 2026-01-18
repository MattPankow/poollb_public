import express from "express";
import { Server } from "http";
import bodyParser from "body-parser";
import initializeDatabase from "./db.js";
import favicon from "serve-favicon";
import path from "path";
import submitGameRouter from "./routes/submitGame.js";
import leaderboardRouter from "./routes/leaderboard.js";
import profileRouter from "./routes/profile.js";
import deleteRouter from "./routes/delete.js";
import homeRouter from "./routes/home.js";
import rulesRouter from "./routes/rules.js";
import patchNotesRouter from "./routes/patchNotes.js";
import superlativesRouter from "./routes/superlatives.js";
import headRouter from "./routes/headToHead.js";

const app = express();
const server = { Server }.Server(app);

initializeDatabase();

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/profile", profileRouter);
app.use("/leaderboard", leaderboardRouter);
app.use("/delete", deleteRouter);
app.use("/submitGame", submitGameRouter);
app.use("/rules", rulesRouter);
app.use("/patchNotes", patchNotesRouter);
app.use("/superlatives", superlativesRouter);
app.use("/headToHead", headRouter);
app.use("/", homeRouter);

app.use(
  favicon(path.join(import.meta.dirname, "public/images", "favicon.ico")),
);

server.listen(3000, () => {
  console.log("Server is running on port 3000");
});


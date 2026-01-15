const express = require('express');
const app = express();
const server = require('http').Server(app);
const bodyParser = require('body-parser');
const initializeDatabase = require('./db'); // Adjust the path
const favicon = require('serve-favicon');
const path = require('path');


initializeDatabase();


app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true })); 

const submitGameRouter = require('./routes/submitGame');
const leaderboardRouter = require('./routes/leaderboard');
const profileRouter = require('./routes/profile');
const deleteRouter = require('./routes/delete');
const homeRouter = require('./routes/home');
const rulesRouter = require('./routes/rules');
const patchNotesRouter = require('./routes/patchNotes');
const superlativesRouter = require('./routes/superlatives');
const headRouter = require ('./routes/headToHead');




app.use('/profile', profileRouter);
app.use('/leaderboard', leaderboardRouter);
app.use('/delete', deleteRouter);
app.use('/submitGame', submitGameRouter);
app.use('/rules', rulesRouter);
app.use('/patchNotes', patchNotesRouter);
app.use('/superlatives', superlativesRouter);
app.use('/headToHead', headRouter);

app.use('/', homeRouter);

app.use(favicon(path.join(__dirname, 'public/images', 'favicon.ico')))



server.listen(3000, () => {
  console.log('Server is running on port 3000');
});

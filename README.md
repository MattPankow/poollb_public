# Pool Leaderboard

## Self-hosting

**Requirements**

- Docker Compose

**Setup**

1. Clone the repository
2. Create `players.csv`, `teams.csv`, and `.env` from the given sample files
3. Create and run containers:

```bash
docker-compose up -d --build
```

## Pool League (MVP)

1. Define 2-player teams in `teams.csv` as `Player A Name,Player B Name` (see `teams-sample.csv`).
2. Restart the app so teams are seeded for the current Pool League season.
3. Open `/poolLeague/this-week` and generate the 4-week regular season schedule.
4. Use the team selector to view weekly matches and submit score + optional time/location.
5. View completed games in `/poolLeague/history` (with team filter and sorting).
6. View rankings in `/poolLeague/standings`.
7. After all regular-season games are complete, playoffs (top 8 seeds) are generated automatically and shown in the This Week tab.

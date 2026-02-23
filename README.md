## TrackFit – Fitness Tracking Landing Page

TrackFit is a single-page concept website, now backed by a Java Spring Boot API, that showcases how users can track their fitness routines, daily activity, and long‑term progress in a clear, engaging way.

### Highlights (frontend)

- **Hero section** with a motivational tagline, key metrics (streak, consistency, workouts logged), and a prominent call‑to‑action.
- **Top-right sign-in / get started** actions, always visible via a sticky header.
- **Features section** with cards and icons for **workout tracking**, **nutrition**, and **progress graphs**.
- **Daily tracks section** that visualizes recent workouts in a timeline plus a sticky side card summarizing the last 30 days.
- **History & improvements section** showing long‑term progress, with comparison metrics and an illustrative trend graph.
- **Scroll‑based background transitions**: the page background subtly shifts as you move from hero → features → daily tracks → history, reinforcing a sense of progression over time.
- **Subtle animations**: sections and cards fade/slide in as they enter the viewport, encouraging users to continue scrolling.

### Files

#### Frontend

- `index.html` – main layout and content, including hero, features, daily tracks, **Routine**, and a sign‑in modal.
- `styles.css` – visual design, layout, animations, and styles for the Routine section and auth modal.
- `script.js` – scroll-based background theming, reveal animations, smooth navigation, and API integration for auth, stats, and routines.
- `package.json` – minimal project manifest.

#### Backend (Java / Spring Boot)

- `backend/pom.xml` – Maven configuration (Spring Boot, Web, JPA, H2).
- `backend/src/main/java/com/trackfit/backend/TrackFitApplication.java` – Spring Boot entry point.
- `backend/src/main/java/com/trackfit/backend/model/...` – JPA entities: `User`, `DailyTrack`, `RoutineTask`.
- `backend/src/main/java/com/trackfit/backend/repository/...` – Spring Data JPA repositories.
- `backend/src/main/java/com/trackfit/backend/service/...` – Business logic for auth/session, daily tracks, routines, and statistics.
- `backend/src/main/java/com/trackfit/backend/controller/...` – REST controllers exposing the API.
- `backend/src/main/resources/application.yml` – H2 database and CORS configuration.
- `backend/src/test/java/com/trackfit/backend/DailyTrackServiceTests.java` – example unit tests for statistics logic.

### Running locally

No build step is required:

1. **Start the backend API** (Java 17+ and Maven required):

   ```bash
   cd backend
   mvn spring-boot:run
   ```

   This starts the API at `http://localhost:8080/api` using an in‑memory H2 database.

2. **Open the frontend**:

   - Option A: From the project root, open `index.html` directly in your browser.
   - Option B: Serve the folder using any static file server (for example, `npx serve .`) and open the printed URL.

   The frontend JavaScript is configured to call the backend at `http://localhost:8080/api`.

### Using the new features

- **Sign in / Get started**
  - Click **Sign in** or **Get started** in the top right.
  - Enter a name and email; this creates or reuses a user and stores an `authToken` in `localStorage`.
  - Once signed in, the hero and history metrics update from live stats.

- **Daily tracking & history as statistics**
  - Use the API endpoints (see below) to log daily workouts (`/api/daily-tracks`).
  - The backend computes:
    - Current streak in days.
    - Routine consistency over the last 30 days.
    - Average duration and calories burned.
    - Weekly series for charts and 12‑week trend data for history visualization.

- **Routine section**
  - In the **Routine** section, add tasks with a title, optional target date, and notes.
  - Tasks are stored via the backend and shown in the “Today’s routine” list.
  - You can:
    - Check tasks off to mark them as completed (PATCH endpoint).
    - Remove tasks (DELETE endpoint).

### API endpoints (summary)

Base URL: `http://localhost:8080/api`

- **Auth**
  - `POST /auth/start`
    - Body: `{ "name": "Alex", "email": "alex@example.com" }`
    - Response: `{ "userId", "name", "email", "authToken" }`
    - Header: returns `X-Auth-Token` as well.
    - Store `authToken` on the client and send it as `X-Auth-Token` on subsequent requests.

- **Daily tracks**
  - `GET /daily-tracks?from=YYYY-MM-DD&to=YYYY-MM-DD`
    - Headers: `X-Auth-Token: <token>`
    - Returns an array of daily workout entries with date, duration, calories, exercises, focus, and notes.
  - `POST /daily-tracks`
    - Headers: `X-Auth-Token: <token>`
    - Body: `{ "date": "YYYY-MM-DD", "exercisesCount": 5, "durationMinutes": 45, "caloriesBurned": 500, "focus": "Upper body", "notes": "Felt strong" }`
    - Creates or updates the entry for that date.

- **Routine tasks**
  - `GET /routines[?completed=true|false]`
    - Headers: `X-Auth-Token: <token>`
    - Lists routine tasks for the signed‑in user.
  - `POST /routines`
    - Headers: `X-Auth-Token: <token>`
    - Body: `{ "title": "10k steps", "description": "Evening walk", "targetDate": "YYYY-MM-DD" }`
  - `PATCH /routines/{id}/completed?value=true|false`
    - Marks a routine task as completed or not.
  - `DELETE /routines/{id}`
    - Deletes a routine task.

- **Statistics**
  - `GET /stats/overview`
    - Headers: `X-Auth-Token: <token>`
    - Returns: `{ currentStreakDays, routineConsistencyPercent, totalWorkoutsLogged, averageDurationMinutes, averageCaloriesBurned }`.
  - `GET /stats/weekly`
    - Headers: `X-Auth-Token: <token>`
    - Returns a 7‑day series with duration and calories per day.
  - `GET /stats/history?weeks=12`
    - Headers: `X-Auth-Token: <token>`
    - Returns 12 weekly data points with derived “volume” and “session quality” scores for long‑term trend visualization.



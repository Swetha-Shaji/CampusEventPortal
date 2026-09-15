# Campus Event Portal

A full-stack, containerized web application designed for universities and colleges to streamline campus event management. Students can discover, search, register, and interact with event coordinators, while administrators have full control over event lifecycles, announcements, and participant audits.

---

## Features

### Student Portal
* **Secure OTP & JWT Authentication:** Email verification via OTP followed by secure JWT-based login.
* **Event Discovery & Search:** Browse active campus events with advanced multi-parameter filtering (Category, Location Type, Search Query) and pagination.
* **Event Registration:** Seamless sign-up for individual or team events.
* **Participant Hub & Q&A:** View registered events, track active status, read coordinator broadcasts, and post public doubts/queries with real-time tracking of admin replies.
* **Student Profile Management:** Maintain academic credentials, contact info, and update passwords securely.

### Admin Portal
* **Event Lifecycle Management:** Create, edit, schedule, save as draft, or cancel events with mandatory reason logging.
* **Banner & Media Upload:** Attach high-resolution event posters stored locally via Docker volumes.
* **Participant Directory & Audit:** Inspect student registration logs, toggle between active and cancelled records, and export filtered rosters directly to CSV.
* **Broadcast Engine:** Push instant in-app notification notices to registered attendee dashboards.
* **Platform Analytics:** Real-time reporting and charts tracking activity trends, registrations per event, and category distributions.

---

## Technology Stack

* **Frontend:** React.js, Tailwind CSS, React Router, Recharts, Axios
* **Backend:** Python, FastAPI, Uvicorn, SQLAlchemy ORM
* **Database:** PostgreSQL
* **Caching & Rate Limiting:** Redis (`fastapi-cache2`, `fastapi-limiter`)
* **Authentication:** JSON Web Tokens (JWT) & `HTTPBearer`
* **Containerization:** Docker & Docker Compose

---

## System Architecture

The application is containerized and runs inside a localized Docker Compose network:
* **Frontend Container:** Serves the React single-page application.
* **Backend Container:** Handles REST API routes, business logic, and local file storage (`/static/banners`).
* **Database Container:** PostgreSQL relational database managing persistence.
* **Cache Container:** Redis handling API rate limiting, caching, and temporary OTP verification storage.

---

## REST API Design


### Authentication & Users
* `POST /auth/send-otp` - Generates and emails a 6-digit verification code.
* `POST /auth/verify-otp` - Verifies the OTP code.
* `POST /auth/complete-register` - Creates a new user account after verification.
* `POST /login` - Authenticates user/admin credentials and returns a signed JWT `access_token`.
* `GET /users/me` - Retrieves the profile of the authenticated user.
* `PUT /users/me` - Updates profile information or credentials.

### Events
* `GET /events` - Retrieves all published or auto-activated scheduled events.
* `POST /events` - **(Admin)** Creates/publishes a new event with a banner image.
* `PUT /events/{event_id}` - **(Admin)** Updates event details and triggers notification broadcasts.
* `DELETE /events/{event_id}` - **(Admin)** Cancels an event with a reason and notifies attendees.

### Registrations & Hub
* `POST /events/{event_id}/register` - **(Student)** Registers for an event (handles team structures).
* `DELETE /events/{event_id}/cancel` - **(Student)** Cancels an event registration.
* `GET /my-registrations` - Retrieves active registrations for the logged-in student.
* `GET /events/{event_id}/comments` - Fetches public discussion posts and coordinator replies.
* `POST /events/{event_id}/comments` - Posts a student doubt/question.
* `GET /events/{event_id}/broadcasts` - Fetches in-app notification updates.
* `POST /events/{event_id}/broadcast` - **(Admin)** Dispatches an announcement broadcast.

### Admin Audits
* `GET /admin/event-records` - Lists all event states (including drafts/cancelled) with registration tallies.
* `GET /admin/participants` - Roster of all student registrations across the platform.

---

## API Documentation (Swagger)

Once the Docker containers are running, you can access the live documentation here:
* **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
* **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)
* **Raw OpenAPI JSON:** [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json)

---

## Environment Variables

Create a `.env` file in the root directory based on the following template:

```env
DATABASE_URL=postgresql://postgres:password@db:5432/campusevents
REDIS_URL=redis://redis:6379/0
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_USERNAME=your_email@gmail.com
EMAIL_PASSWORD=your_smtp_app_password
SECRET_KEY=your_super_secret_jwt_key
```

---

## 🚀 Quick Start (How to Run Locally)

Follow these steps to run the application on your local machine using Docker:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Swetha-Shaji/CampusEventPortal.git
   cd CampusEventPortal
   ```

2. **Set up Environment Variables:**
   * Create a file named `.env` in the root of the project.
   * Copy the template provided in the **Environment Variables** section above into your new `.env` file.

3. **Build and start the containers:**
   ```bash
   docker-compose up -d --build
   ```

4. **Access the Application:**
   * **Frontend Application:** [http://localhost:5173](http://localhost:5173) (or `http://localhost` if using the Nginx proxy)
   * **Backend API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
   * **Adminer (Database UI):** [http://localhost:8080](http://localhost:8080)

To stop the application, run:
```bash
docker-compose down
```

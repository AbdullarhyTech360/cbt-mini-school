# CBT Mini School

A comprehensive Computer-Based Testing (CBT) platform for educational institutions. Provides exam management, role-based access control, student tracking, automated grading, and report generation.

## Tech Stack

### Backend
- **Python 3.10+** with **Flask** web framework
- **SQLAlchemy** ORM with **SQLite** database (swappable to PostgreSQL/MySQL)
- **Flask-Bcrypt** for password hashing
- **Flask-SQLAlchemy** for database integration

### Frontend
- **HTML5 / CSS3 / JavaScript ES6+**
- **Tailwind CSS v4** for responsive styling
- **Material Symbols** for UI icons
- **MathJax** for LaTeX math equation rendering
- **html2canvas** and **jsPDF** for client-side PDF generation

### Tools
- **PDM** (Python dependency manager)
- **npm** / **Node.js** for frontend asset management
- **Tailwind CSS CLI** for stylesheet compilation

## Features

- **Computer-Based Testing** — Interactive timed exams with randomized question/option ordering
- **Role-Based Access** — Admin, staff (teacher), and student portals with permission controls
- **Exam Management** — Create, schedule, and configure exams (MCQ, True/False, Short Answer)
- **Question Bank** — Support for text, images, and MathJax-rendered equations
- **Session Monitoring** — Real-time tracking of active exam sessions
- **Auto-Grading** — Instant scoring with configurable grade scales
- **Report Generation** — Automated PDF report cards with performance analytics
- **Demo Practice Mode** — Allow students to practice with demo questions
- **School Profile** — Customizable school name, logo, session/term settings

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- Git

### Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd cbt-mini-school

# 2. Install Python dependencies
pip install pdm
pdm install

# 3. Install Node.js dependencies
npm install

# 4. Build frontend assets
npm run build
```

### Running the Application

```bash
# Start all services (Flask + Tailwind watcher + Font sync)
pdm run dev
```

The application runs at **http://localhost:8000**.

### First-Time Setup

On first startup, the app automatically:
1. Creates the SQLite database (`instance/users.db`)
2. Initializes default school information, terms, assessment types, subjects, classrooms, and permissions
3. Creates default user accounts (printed in the console)

**Default login credentials:**

| Role    | Username   | Password    |
|---------|------------|-------------|
| Admin   | admin      | aaaa        |
| Teacher | teacher1   | teacher123  |
| Teacher | teacher2   | teacher123  |
| Student | student1   | student123  |
| Student | student2   | student123  |
| Student | student3   | student123  |

## Usage

### Portals

| Portal  | URL                          |
|---------|------------------------------|
| Login   | http://localhost:8000/login   |
| Admin   | http://localhost:8000/admin/dashboard |
| Staff   | http://localhost:8000/staff/dashboard  |
| Student | http://localhost:8000/student/dashboard|

### Development Commands

```bash
# Run all dev processes concurrently (Flask, Tailwind, Fonts)
pdm run dev

# Build CSS only
npm run build:css

# Build all assets (CSS + fonts + MathJax)
npm run build
```

## Configuration

Key settings in `config.py`:

| Setting                    | Default                 | Description                         |
|----------------------------|-------------------------|-------------------------------------|
| `SECRET_KEY`               | `dev-secret-key-change-in-production` | Session encryption key  |
| `SQLALCHEMY_DATABASE_URI`  | `sqlite:///instance/users.db` | Database connection string  |
| `AUTO_INITIALIZE_DATA`     | `true`                  | Auto-create default data on startup |
| `UPLOAD_FOLDER`            | `static/uploads/`       | File upload directory               |
| `MAX_CONTENT_LENGTH`       | `2MB`                   | Maximum upload file size            |

For production:
- Set a strong `SECRET_KEY`
- Change `SESSION_COOKIE_SECURE = True` when using HTTPS
- Switch to a production-grade database (PostgreSQL, MySQL)
- Use a production WSGI server (Gunicorn, Waitress)

## Project Structure

```
cbt-mini-school/
├── app.py                # Flask application entry point
├── config.py             # Application configuration
├── models/               # SQLAlchemy database models
├── routes/               # Flask route blueprints
├── services/             # Business logic (reports, UUIDs, etc.)
├── templates/            # Jinja2 HTML templates
│   ├── admin/            # Admin portal views
│   ├── staff/            # Staff/teacher views
│   ├── student/          # Student exam interface
│   ├── auth/             # Login, registration, password reset
│   └── reports/          # Report card templates
├── static/               # Static assets (CSS, JS, images, fonts)
├── scripts/              # Utility scripts (data population, font sync)
├── initialize_all_data.py  # Default data initialization
├── pyproject.toml        # Python dependencies (PDM)
└── package.json          # Node.js dependencies
```

## License

MIT License — see the `LICENSE` file for details.

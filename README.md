# CBT Mini School

A comprehensive Computer-Based Testing platform for educational institutions with advanced features for exam management, student tracking, and automated report generation.

## Table of Contents
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Computer-Based Testing (CBT)**: Interactive exam interface for students
- **Role-based Access Control**: Admin, staff, and student permissions
- **Exam Management**: Create, configure, and manage exams with various settings
- **Question Management**: Support for multiple question types including math equations
- **Real-time Session Monitoring**: Track active exam sessions
- **Automated Report Generation**: PDF report cards with grades and performance analysis
- **Student Performance Tracking**: Detailed analytics and progress monitoring
- **Math Support**: LaTeX-style math rendering using MathJax
- **Responsive Design**: Mobile-friendly interface using Tailwind CSS
- **Grade Scale Management**: Configurable grading systems
- **Exam Status Tracking**: Monitor exam progress and completion
- **File Upload Support**: School logo and document uploads

## Technology Stack

### Backend
- Python 3.10+
- Flask web framework
- SQLAlchemy ORM
- SQLite database (with option to switch to other databases)
- Celery for background tasks
- Redis for caching and session storage

### Frontend
- HTML5, CSS3, JavaScript ES6+
- Tailwind CSS for responsive styling
- Material Symbols for UI icons
- MathJax for mathematical equation rendering
- html2canvas and jsPDF for client-side PDF generation

### Development Tools
- PDM (Python package manager)
- Node.js and npm
- Tailwind CSS CLI
- Concurrently for running multiple processes

## Prerequisites

- Python 3.10 or higher
- Node.js 18+ and npm
- Redis server (for production) or fakeredis (for development)
- Git

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd cbt-mini-school
   ```

2. **Install Python dependencies using PDM**
   ```bash
   # Install PDM if you don't have it
   pip install pdm
   
   # Install project dependencies
   pdm install
   ```

3. **Install Node.js dependencies**
   ```bash
   npm install
   ```

4. **Setup environment**
   Create a `.env` file in the project root (optional, as the project uses default development settings)

5. **Initialize the database**
   ```bash
   # This will create the SQLite database with all tables
   python -c "from app import app; from utils.initialize_defaults import initialize_default_data; app.app_context().push(); initialize_default_data()"
   ```

## Configuration

The application uses a `config.py` file for configuration. Key settings include:

- Database URI (default: SQLite)
- Secret key for sessions
- Session timeout settings
- File upload configurations
- Upload size limits

For production deployment, make sure to:
- Change the `SECRET_KEY` to a strong, random value
- Configure a production database (PostgreSQL, MySQL, etc.)
- Set `SESSION_COOKIE_SECURE = True` when using HTTPS
- Configure proper Redis connection

## Usage

### Running the Development Server

**Option 1: Using PDM (recommended)**
```bash
pdm run dev
```

This command runs:
- Flask server on port 5000
- Tailwind CSS watcher
- Font synchronization watcher

**Option 2: Using npm**
```bash
npm run dev
```

**Option 3: Manual start**
```bash
# Terminal 1: Start Flask server
pdm run flask

# Terminal 2: Watch CSS changes
pdm run css

# Terminal 3: Watch font changes
pdm run css-with-fonts
```

### Accessing the Application

- Frontend: http://localhost:5000
- Admin panel: http://localhost:5000/admin
- Staff dashboard: http://localhost:5000/staff
- Student portal: http://localhost:5000/student

### Creating Initial Data

After the first setup, you may need to initialize default data:

```bash
python -c "from app import app; from utils.initialize_defaults import initialize_default_data; app.app_context().push(); initialize_default_data()"
```

This will create:
- Default school information
- Assessment types (Test, Exam)
- School terms
- Default permissions

## Project Structure

```
cbt-mini-school/
├── app/
│   └── static/
│       ├── css/
│       └── dist/
├── docs/                 # Documentation files
├── migrations/          # Database migration scripts
├── models/              # Database models
├── routes/              # Flask route definitions
├── scripts/             # Build and utility scripts
├── services/            # Business logic services
├── static/              # Static assets (CSS, JS, images)
├── templates/           # HTML templates
├── test/                # Test files
├── utils/               # Utility functions
├── app.py              # Main Flask application
├── celery_app.py       # Celery configuration
├── config.py           # Configuration settings
├── package.json        # Node.js dependencies
├── pyproject.toml      # Python dependencies
└── README.md
```

## Development

### Adding New Features

1. Create new models in the `models/` directory
2. Add routes in the `routes/` directory
3. Create templates in the `templates/` directory
4. Add static assets in the `static/` directory
5. Update the database schema with migrations

### Running Tests

```bash
# Python tests
python -m pytest test/

# JavaScript tests (if any)
npm test
```

### Building Assets

```bash
# Build CSS and copy fonts
npm run build

# Watch CSS changes
npm run dev
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests if applicable
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
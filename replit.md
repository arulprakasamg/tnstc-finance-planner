# TNSTC Finance Planner

## Overview

This is a financial dashboard application for TNSTC (Tamil Nadu State Transport Corporation). The application provides a web-based interface to display financial metrics including bank balance, collections, and HSD (High-Speed Diesel) outstanding amounts. It's built as a server-rendered Express.js application with EJS templating.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Framework
- **Express.js 5.x** serves as the web framework
- Server-side rendering using **EJS** templates
- Static files served from the `public` directory
- Views stored in the `views` directory

### Project Structure
```
├── index.js              # Main entry point, Express server setup
├── public/               # Static assets (CSS, JS)
├── src/
│   ├── data/            # JSON data files (mock data)
│   └── routes/          # Express route handlers
└── views/               # EJS templates
```

### Routing Pattern
- Main routes are modularized in `src/routes/`
- Dashboard routes handle both page rendering (`/`) and API endpoints (`/api/finance-summary`)
- Additional API endpoint at `/api/dashboard` in main index.js for dashboard metrics

### Data Layer
- Currently uses static JSON files as mock data source (`src/data/`)
- Two data files: `dashboard_metrics.json` for overview metrics and `sample_finance.json` for transaction data
- No database currently implemented - data is read directly from JSON files

### Frontend Architecture
- Server-rendered HTML using EJS templates
- Basic CSS styling in `public/css/style.css`
- Minimal client-side JavaScript in `public/js/main.js`
- Responsive grid layout for dashboard cards

## External Dependencies

### NPM Packages
- **express** (v5.2.1) - Web framework
- **ejs** (v4.0.1) - Templating engine
- **cors** (v2.8.6) - Cross-origin resource sharing middleware
- **dotenv** (v17.2.3) - Environment variable management

### Environment Configuration
- Uses `.env` file for configuration
- `PORT` variable configurable (defaults to 5000)
- Server binds to `0.0.0.0` for external accessibility

### No External Services
- No database connections
- No third-party API integrations
- No authentication system currently implemented
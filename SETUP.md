# 🚀 FeedbackFlow Local Development Setup

## Quick Start Guide

### Prerequisites
- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** - [Download here](https://git-scm.com/)

### 1. Clone the Repository
```bash
git clone <repository-url>
cd feedbackflow-app
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies  
cd frontend
npm install
cd ..
```

### 3. Start the Application

#### Option A: Start Both Services (Recommended)
```bash
# Terminal 1: Start Backend
cd backend
npm run dev  # Or: npm run build && npm start

# Terminal 2: Start Frontend
cd frontend
npm run dev
```

#### Option B: Use the Simple Server (Alternative)
```bash
# Terminal 1: Start Simple Backend
cd backend
npm run build
node dist/simple-server.js

# Terminal 2: Start Frontend
cd frontend
npm run dev
```

### 4. Access the Application

- **Frontend**: http://localhost:3003
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/api/v1/health

### 5. Login Credentials

Use any email and password to login (mock authentication):
- **Email**: `admin@example.com` (or any email)
- **Password**: `password` (or any password)

## 🏗️ Architecture Overview

### Backend (Port 5000)
- **Framework**: Node.js + Express + TypeScript
- **Database**: Mock PostgreSQL (for development)
- **API**: RESTful endpoints with JWT authentication
- **Features**: Organization management, user authentication, admin dashboard

### Frontend (Port 3003)
- **Framework**: React + TypeScript + Vite
- **UI**: Tailwind CSS + Custom components
- **State**: Zustand with persistence
- **Routing**: React Router v6

## 📁 Project Structure

```
feedbackflow-app/
├── backend/                 # Node.js backend
│   ├── src/
│   │   ├── models/         # Database models
│   │   ├── services/       # Business logic
│   │   ├── config/         # Configuration
│   │   └── database/       # Migration system
│   └── dist/               # Compiled JavaScript
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── stores/         # Zustand stores
│   │   └── services/       # API services
│   └── e2e/               # End-to-end tests
├── database/              # Database schemas & migrations
└── docs/                  # Documentation
```

## 🧪 Testing

### Run E2E Tests
```bash
cd frontend
./e2e/test-runner.sh fast-dashboard
```

### Run Performance Tests
```bash
cd backend
node dist/performance-test.js
```

### Run Migration Tests
```bash
cd backend
node dist/test-migrations.js
```

## 🔧 Development Commands

### Backend Commands
```bash
cd backend

# Build TypeScript
npm run build

# Start development server
npm run dev

# Run tests
npm test

# Start production server
node dist/real-database-server.js
```

### Frontend Commands
```bash
cd frontend

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui
```

## 🗄️ Database

### Current Setup (Mock Database)
- **Type**: In-memory mock database
- **Purpose**: Development and testing
- **Features**: Full CRUD operations, realistic data simulation

### Production Setup (PostgreSQL)
```bash
# Start PostgreSQL with Docker
cd database
docker compose up -d

# Run migrations
cd backend
node dist/migrate.js migrate
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Kill processes on ports 3003 and 5000
lsof -ti:3003 | xargs kill -9
lsof -ti:5000 | xargs kill -9
```

#### 2. Build Errors
```bash
# Clean and rebuild
cd backend
rm -rf dist/
npm run build
```

#### 3. Frontend Not Loading
- Check if backend is running on port 5000
- Verify Vite proxy configuration in `frontend/vite.config.ts`
- Clear browser cache

#### 4. API Errors
- Check backend logs for errors
- Verify API endpoints: http://localhost:5000/api/v1/health
- Test with curl: `curl http://localhost:5000/api/v1/admin/organizations`

### Debug Mode
```bash
# Backend with debug logs
cd backend
DEBUG=* npm run dev

# Frontend with debug
cd frontend
npm run dev -- --debug
```

## 📊 API Endpoints

### Authentication
- `POST /api/v1/auth/login/mock` - Mock login
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/refresh` - Refresh token

### Organizations
- `GET /api/v1/admin/organizations` - List organizations
- `GET /api/v1/admin/organizations/stats` - Organization statistics
- `POST /api/v1/admin/organizations` - Create organization
- `GET /api/v1/admin/organizations/check-slug` - Check slug availability

### Health
- `GET /health` - Basic health check
- `GET /api/v1/health` - API health with database status

## 🎯 Next Steps

1. **Set up real PostgreSQL database**
2. **Configure environment variables**
3. **Add Google OAuth authentication**
4. **Implement real-time features**
5. **Add comprehensive logging**
6. **Set up CI/CD pipeline**

## 📞 Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Review the logs in the terminal
3. Verify all services are running
4. Test API endpoints manually

---

**Happy coding! 🚀**


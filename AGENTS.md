# AGENTS.md - Development Guide for DATN2025 Assignment Management System

## Build/Lint/Test Commands

### Backend (Node.js/Express)
- **Development**: `cd backend && npm run dev` (starts with nodemon)
- **Production**: `cd backend && npm start`
- **Seed database**: `cd backend && npm run seed`
- **Reset database**: `cd backend && npm run reset`
- **Check database**: `cd backend && npm run check-db`

### Frontend (React)
- **Development**: `cd frontend && npm start`
- **Build**: `cd frontend && npm run build`
- **Test**: `cd frontend && npm run test`
- **Eject**: `cd frontend && npm run eject`

## Architecture Overview

### Backend (Express.js + MongoDB)
- **Framework**: Express.js with ES6 modules
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based with role-based access (admin/teacher/student)
- **File Upload**: Multer middleware for document/assignment uploads
- **Security**: Helmet, CORS, rate limiting
- **Models**:
  - User (studentId: B21DCPT001+, teacherId: GVPTIT001+)
  - Class (belongs to teacher)
  - Assignment (belongs to class, can be exam or homework)
  - Submission (student submissions for assignments)
  - Enrollment (student-class relationships)
  - Document (class materials)
  - Announcement (class notifications)
  - Comment (class discussions)

### Frontend (React + Material-UI)
- **Framework**: React 18 with hooks
- **UI Library**: Material-UI v5 with icons and charts
- **Routing**: React Router v6
- **Charts**: Recharts for data visualization
- **Date Handling**: Day.js
- **HTTP Client**: Axios (via api/client.js)

### Key APIs
- **Auth**: `/api/auth/login` (JWT + user info)
- **Teacher**: `/api/teacher/*` (dashboard, classes, assignments, submissions)
- **Student**: `/api/student/*` (dashboard, classes, assignments, profile)
- **Admin**: `/api/admin/*` (user/class management)

## Code Style Guidelines

### Backend (JavaScript/Node.js)
- **Modules**: ES6 imports/exports (type: "module")
- **Naming**: camelCase for variables/functions, PascalCase for classes/models
- **Error Handling**: Try/catch with specific error messages, global error handler
- **Database**: Mongoose models with validation, timestamps enabled
- **Security**: Input validation, authentication middleware, role checks
- **Logging**: Console logging for development, structured logging for production

### Frontend (React/JavaScript)
- **Components**: Functional components with hooks
- **State**: useState/useEffect for local state, context for global state
- **Props**: Destructure props in function parameters
- **Styling**: Material-UI sx prop for inline styles, theme-based styling
- **API Calls**: Centralized in api/client.js with error handling
- **Date Formatting**: Consistent Vietnamese locale formatting

### Database Schema
- **Users**: username (unique), fullName, email (unique), role, studentId/teacherId
- **Classes**: name, code (unique), department, teacherId
- **Assignments**: classId, title, description, dueDate, isExam, durationMinutes
- **Submissions**: assignmentId, studentId, contentUrl, score, notes, submittedAt

## Development Workflow

1. **Setup**: Clone repo, run `npm install` in both backend/ and frontend/
2. **Database**: Ensure MongoDB running, run `npm run seed` for sample data
3. **Development**: Run backend (`npm run dev`) and frontend (`npm start`) separately
4. **Testing**: Manual testing via UI, API testing via browser dev tools
5. **Deployment**: Build frontend (`npm run build`), deploy backend to server

## Demo Accounts
- **Admin**: username: `admin`, password: `123456`
- **Teacher**: username: `teacher`, password: `123456` (ID: GVPTIT001)
- **Student**: username: `student`, password: `123456` (ID: B21DCPT001)

## Important Notes
- Student IDs: B21DCPT001, B21DCPT002, etc.
- Teacher IDs: GVPTIT001, GVPTIT002, etc.
- Assignments sorted chronologically (oldest first) in UI
- JWT tokens required for teacher/student/admin routes
- File uploads stored in backend/uploads/ directory
- Proxy configuration: frontend proxies /api/* to backend (localhost:4000)

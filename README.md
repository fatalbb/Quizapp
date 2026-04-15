# SQL Quiz App

A full-stack quiz application for teaching SQL, with AI-generated questions using Ollama.

## Tech Stack

- **Backend**: .NET 9, Clean Architecture, Entity Framework Core, MediatR (CQRS)
- **Database**: MySQL 8
- **Frontend**: React 18, TypeScript, Vite, Ant Design
- **Auth**: JWT + refresh tokens
- **AI**: Ollama (local LLM) for question generation and answer evaluation

## Features

### 3 User Roles
- **Admin**: Full control - user management, all content, analytics
- **Teacher**: Create/manage categories, questions (manual + AI), quizzes, view analytics
- **Student**: Browse quizzes, take timed quizzes, view results

### Question Types
- Multiple Choice (checkbox — multiple correct)
- Single Choice (radio — one correct)
- True / False
- Input (free text — AI evaluated)

### Question Content
- Text only
- Image (uploaded by teacher)
- Excel table schemas (for SQL query questions)

### AI Generation
- **Knowledge mode**: LLM generates questions based on category name
- **Table Schema mode**: Upload Excel file with database tables (each sheet = a table) — LLM generates SQL query questions referencing those tables. The Excel file is attached to each generated question so students can view the tables while taking the quiz.

### Quiz Configuration
- Timed with auto-submit on timeout
- Difficulty distribution per category (e.g., 40% Easy, 40% Medium, 20% Hard)
- Pass/fail threshold

## Project Structure

```
QuizApp/
├── src/
│   ├── QuizApp.Domain/          # Entities, enums
│   ├── QuizApp.Application/     # CQRS handlers, DTOs
│   ├── QuizApp.Infrastructure/  # EF Core, Ollama, file storage
│   └── QuizApp.API/             # Controllers, middleware
├── client/                      # React + TypeScript + Ant Design
└── tools/
    └── DataMigration/           # SQLite -> MySQL data migration tool
```

## Setup

### Prerequisites
- .NET 9 SDK
- Node.js 18+
- MySQL 8
- Ollama with a model pulled (e.g., `ollama pull llama3`)

### 1. Database
Create the database:
```sql
CREATE DATABASE QuizAppDb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Update connection string in `src/QuizApp.API/appsettings.json` if your MySQL credentials differ.

Apply migrations:
```powershell
dotnet ef database update --project src/QuizApp.Infrastructure --startup-project src/QuizApp.API
```

Or restore from the provided backup:
```powershell
mysql -u root -p QuizAppDb < QuizAppDb_backup.sql
```

### 2. Backend
```powershell
cd src/QuizApp.API
dotnet run
```
Runs on `http://localhost:5238`. Swagger at `/swagger`.

### 3. Frontend
```powershell
cd client
npm install
npm run dev
```
Runs on `http://localhost:5173`.

### 4. Ollama (for AI features)
```powershell
ollama serve
```
Make sure the model in `appsettings.json` (`OllamaSettings:Model`) matches a pulled model.

## Default Login
- Email: `admin@quizapp.com`
- Password: `Admin123!`

## Database Backup

```powershell
mysqldump -u root -p QuizAppDb > QuizAppDb_backup.sql
```

## License
Educational project.

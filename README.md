# Jira Clone

A simplified Jira-like issue tracker: Django REST API backend + React (Vite) frontend.

## Backend setup
```
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser   # optional, for /admin/
python manage.py runserver 8000
```
API runs at http://localhost:8000/api/

## Frontend setup
```
cd frontend
npm install
npm run dev
```
App runs at http://localhost:5173/

## What's implemented
- Auth: register/login/me (token-based)
- Projects with role-based membership (Admin/Member/Viewer) — visibility is
  project-membership based, matching how real Jira works (no org-hierarchy access)
- Issues: full CRUD, Kanban board with drag-and-drop status changes
- Comments on issues
- Auto-generated Activity Log (status/priority/assignee changes)
- Filtering issues by status, priority, assignee (backend + board UI)

## Not yet implemented
- Real-time updates / WebSockets (issues update on page refresh, not live)
- Notifications
- File attachments (intentionally dropped from scope)
- Sprints/Backlog (intentionally dropped — Kanban-only)

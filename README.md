# 🚀 TaskFlow – Project Management System

A full‑stack project management application built with **Django REST Framework** (backend) and **Next.js** (frontend). Designed for collaborative task management with a modern Kanban board, real‑time‑like updates, and secure authentication.

![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white)
![Django](https://img.shields.io/badge/django-%23092E20.svg?style=for-the-badge&logo=django&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)

---

## ✨ Features

### 👤 Authentication & Security
- JWT-based authentication with **HttpOnly cookies** (XSS‑safe).
- **Login brute‑force protection** – locks account after 5 failed attempts (django‑axes).
- **Request throttling** – 1000 requests/day for authenticated users.

### 📁 Projects
- Create, edit, and delete projects.
- Upload **cover images**.
- **Search** projects by name (backend filtering).
- **Pagination** (10 projects per page).
- **Progress bar** showing task completion percentage.

### 📋 Task Management (Kanban Board)
- Three columns: **To Do**, **In Progress**, **Done**.
- **Drag & Drop** tasks between columns.
- **Role‑based permissions**:
  - **Owner** – full control.
  - **Creator** – can edit/delete their own tasks.
  - **Assignee** – can move tasks.
  - Other members – read‑only.
- **Assign tasks** to project members.
- **Edit tasks** (title, description, priority, assignee).
- **Delete tasks** with optimistic UI updates.

### 🔍 Filters & Search
- **Search** tasks by title (debounced, 300ms).
- **Filter** by status, priority, and assignee.
- **Filters stored in URL** – shareable and bookmarkable.

### 👥 Collaboration
- **Invite members** to projects (owner only).
- **Invitation system** – users receive pending invites on their profile page.
- **Accept / Decline** invitations.
- **Member avatars** in project header.

### 🎨 UI & UX
- **Dark / Light mode** (persisted in localStorage).
- **Persian (Farsi) RTL** support.
- **Skeleton loading** for better perceived performance.
- **Toast notifications** for user feedback.
- Fully **responsive** (mobile, tablet, desktop).

---

## 🛠️ Tech Stack

### Backend
- **Django** + **Django REST Framework**
- **SimpleJWT** (JWT with HttpOnly cookies)
- **django‑axes** (login brute‑force protection)
- **django‑filter** (search & filtering)
- **PostgreSQL** (or SQLite for development)

### Frontend
- **Next.js** (App Router, TypeScript)
- **Tailwind CSS** (utility‑first styling)
- **TanStack Query** (server‑state management, caching, optimistic updates)
- **@dnd‑kit** (drag & drop)
- **react‑hot‑toast** (notifications)
- **use‑debounce** (search optimisation)

---

## 📸 Screenshots

| | |
|:-------------------------:|:-------------------------:|
| **Login / Signup** | **Projects Page** |
| *Add screenshot here* | *Add screenshot here* |
| **Kanban Board** | **Filters & Search** |
| *Add screenshot here* | *Add screenshot here* |
| **Dark Mode** | **Invite Modal** |
| *Add screenshot here* | *Add screenshot here* |

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- Python 3.10+
- Node.js 18+
- Git

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/taskflow.git
cd taskflow

2. Backend setup
bash

cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver

3. Frontend setup
bash

cd frontend
npm install
npm run dev

4. Environment variables

Create .env in backend/ and .env.local in frontend/ (see .env.example files).
📁 Project Structure
text

taskflow/
├── backend/              # Django REST API
│   ├── manage.py
│   ├── taskflow/         # Project settings
│   ├── apps/             # Django apps (projects, tasks, users)
│   └── requirements.txt
├── frontend/             # Next.js app
│   ├── app/              # App Router pages
│   ├── components/       # Reusable UI components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # API client & utilities
│   └── package.json
├── .gitignore
├── .gitattributes
└── README.md

🔒 Security Highlights

    JWT stored in HttpOnly cookies – protects against XSS.

    CSRF protection with Django middleware.

    Throttling prevents API abuse.

    django‑axes blocks brute‑force login attempts.

    Environment variables for all secrets – no hardcoded keys.

    Object‑level permissions (owner, creator, assignee).

📊 ER Diagram

    Add your ER diagram image here

🤝 Contributing

This is a personal portfolio project. For suggestions, please open an issue or reach out directly.
📜 License

This project is for educational purposes. You are free to use it as a reference for your own learning.
👨‍💻 Author

Your Name
GitHub · LinkedIn
🙏 Acknowledgements

    Django, Next.js, Tailwind, and the amazing open‑source community.

    All libraries and tools used in this project.

⭐ If you found this project useful, please give it a star!

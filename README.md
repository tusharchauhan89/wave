
# 🎵 WAVE — Music Streaming Web Application

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-6-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase">
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite">
</p>

<p align="center">
  A modern full-stack music streaming platform built with React, TypeScript and FastAPI.
</p>

<p align="center">
  <a href="https://wave-gamma-two.vercel.app">🚀 Live Demo</a>
  &nbsp; • &nbsp;
  <a href="https://github.com/tusharchauhan89/wave">📂 Source Code</a>
</p>

---

## 📸 Preview

### Home / Music Player

> Add your screenshot here as `screenshots/home.png`

![WAVE Home](screenshots/home.png)

### Search & Music Discovery

> Add your screenshot here as `screenshots/search.png`

![WAVE Search](screenshots/search.png)

### Playlist / Library

> Add your screenshot here as `screenshots/playlist.png`

![WAVE Playlist](screenshots/playlist.png)

---

## ✨ About The Project

**WAVE** is a full-stack music streaming web application designed to provide a smooth and modern music discovery and playback experience.

The project combines a **React + TypeScript frontend** with a **FastAPI backend**, providing a structured full-stack architecture instead of putting all application logic inside the frontend.

The application focuses on:

* 🎵 Music discovery
* 🔎 Search
* ▶️ Music playback
* 📚 Personal music library
* ❤️ Favorites
* 🎧 Playlists
* 👤 User authentication
* 🔐 Protected backend APIs
* 📱 Responsive UI
* ⚡ Fast frontend interactions

The application is deployed and available online:

**Live Demo:** https://wave-gamma-two.vercel.app

---

## 🚀 Features

### 🎵 Music Discovery

* Search for songs and artists
* Browse available music
* Display song artwork and metadata
* Quickly start playback

### ▶️ Music Player

* Play / pause songs
* Previous / next controls
* Music progress control
* Track information
* Persistent player interface

### ❤️ Favorites

Users can save songs to their personal favorites/library for easier access later.

### 🎧 Playlists

Create and manage personal playlists and organize music according to user preferences.

### 🔐 Authentication

The application includes user authentication with protected backend functionality.

Authentication-related functionality is handled through the FastAPI backend with JWT-based authorization.

### 📱 Responsive Interface

The frontend is built with React and designed to provide a modern music-player experience across different screen sizes.

### ⚡ Toast Notifications

User actions provide immediate feedback through toast notifications.

---

## 🛠️ Tech Stack

### Frontend

| Technology      | Purpose                        |
| --------------- | ------------------------------ |
| React           | UI development                 |
| TypeScript      | Type safety                    |
| Vite            | Development & production build |
| React Router    | Client-side routing            |
| Axios           | API communication              |
| Framer Motion   | UI animations                  |
| Lucide React    | Icons                          |
| React Hot Toast | Notifications                  |

The frontend uses React 19, TypeScript, Vite, Axios, Framer Motion, Lucide React and React Router.

### Backend

| Technology    | Purpose                     |
| ------------- | --------------------------- |
| Python        | Backend development         |
| FastAPI       | REST API framework          |
| Uvicorn       | ASGI server                 |
| Pydantic      | Data validation             |
| JWT           | Authentication              |
| Supabase      | Database / backend services |
| HTTPX         | HTTP requests               |
| python-dotenv | Environment variables       |

The backend dependency configuration includes FastAPI, Uvicorn, Supabase, Pydantic, JWT libraries and related utilities.

---

## 🏗️ Architecture

```text
                    ┌──────────────────────┐
                    │      WAVE USER       │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   React Frontend     │
                    │  TypeScript + Vite   │
                    └──────────┬───────────┘
                               │
                         HTTP / REST API
                               │
                               ▼
                    ┌──────────────────────┐
                    │   FastAPI Backend    │
                    │      Python          │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
        Authentication     Music APIs       Application
          / JWT                              Services
              │
              ▼
        ┌───────────────┐
        │    Supabase   │
        │    Database   │
        └───────────────┘
```

---

## 📁 Project Structure

```text
wave/
│
├── backend/
│   ├── routers/
│   ├── services/
│   ├── utils/
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
│
├── frontend-react/
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── styles/
│   │   ├── types/
│   │   ├── App.tsx
│   │   └── main.tsx
│   │
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── .gitignore
├── package.json
└── README.md
```

The current repository follows this frontend/backend separation, with dedicated API, components, context, hooks, pages, services, styles and types directories in the React application.

---

## 🔄 Application Flow

### 1. User opens WAVE

The React frontend loads the application through Vite.

### 2. User searches for music

The frontend sends a request to the backend/API layer.

```text
User
 ↓
React Search Component
 ↓
Axios
 ↓
FastAPI API
 ↓
Music Service
 ↓
Response
 ↓
React UI
```

### 3. User plays a song

The selected track is passed to the music player and the playback state is updated through the frontend application state.

### 4. User saves a song

```text
React
 ↓
FastAPI
 ↓
Authentication
 ↓
Supabase
 ↓
Saved Music
```

### 5. User accesses protected features

Authentication information is used when communicating with protected backend endpoints.

---

## 🔐 Environment Variables

Create the required environment files locally.

### Backend

Create:

```text
backend/.env
```

Example:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
JWT_SECRET=your_jwt_secret
```

> Never commit your real `.env` file or secret keys to GitHub.

---

## 💻 Run Locally

### Prerequisites

Make sure you have installed:

* Node.js
* npm
* Python 3.10+
* Git
* A Supabase project

---

### 1. Clone the repository

```bash
git clone https://github.com/tusharchauhan89/wave.git

cd wave
```

---

### 2. Setup the backend

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate it on Windows:

```bash
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create your environment file:

```text
.env
```

Then start FastAPI:

```bash
uvicorn main:app --reload
```

Backend will normally be available at:

```text
http://127.0.0.1:8000
```

FastAPI also provides interactive API documentation at:

```text
http://127.0.0.1:8000/docs
```

---

### 3. Setup the frontend

Open another terminal:

```bash
cd frontend-react
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The Vite development server will provide the local frontend URL in the terminal.

---

## 🌐 Deployment

The frontend is deployed using **Vercel**.

### Live Application

🚀 **https://wave-gamma-two.vercel.app**

The source repository is available here:

📂 **https://github.com/tusharchauhan89/wave**

---

## 🧪 Production Build

Build the React application:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

---

## 🎯 Key Learning Outcomes

This project helped me work with:

* Full-stack application architecture
* React component development
* TypeScript
* REST API integration
* FastAPI backend development
* Authentication and authorization
* JWT
* Supabase
* API error handling
* Frontend state management
* Routing
* Responsive UI development
* Deployment with Vercel
* Git and GitHub workflows

---

## 🔮 Future Improvements

Some planned improvements include:

* [ ] Advanced music recommendations
* [ ] Better playlist management
* [ ] Queue management
* [ ] Shuffle and repeat modes
* [ ] Recently played history
* [ ] Improved mobile UI
* [ ] Audio quality selection
* [ ] More detailed artist and album pages
* [ ] Social sharing
* [ ] Improved caching
* [ ] Progressive Web App support

---

## 🧑‍💻 Author

### Tushar Chauhan

B.Tech Computer Science & Engineering

📍 Himachal Pradesh, India

GitHub:
https://github.com/tusharchauhan89

---

## ⭐ Support

If you found this project interesting, consider giving the repository a ⭐ on GitHub.

---

## 📄 License

This project is created for educational and portfolio purposes.

---

<p align="center">
  Built with ❤️ using React, TypeScript, FastAPI and Supabase.
</p>

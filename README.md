# Groove – Spotify Clone

A real-world music streaming app with:

- **Frontend**: Pure HTML / CSS / Vanilla JS (Spotify-inspired dark UI)
- **Backend**: FastAPI
- **Database & Auth**: Supabase
- **Music API**: Unofficial JioSaavn API (`https://saavn.sumit.co`)
- **AI Voice Assistant**: Browser Web Speech API + backend command parser

Supported voice commands:
- “play [song name]”
- “pause” / “stop”
- “next” / “previous”
- “volume up” / “volume down”
- “mute” / “unmute”
- “search [query]”
- “play liked songs”

---

## 1. Supabase Setup

1. Create a project at https://supabase.com
2. Go to **SQL Editor** and run:

```sql
-- profiles
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- liked songs
create table if not exists liked_songs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  song_id text not null,
  song_data jsonb not null,
  created_at timestamptz default now(),
  unique(user_id, song_id)
);

-- playlists
create table if not exists playlists (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  description text,
  cover_url text,
  is_public boolean default false,
  created_at timestamptz default now()
);

-- playlist songs
create table if not exists playlist_songs (
  id uuid default gen_random_uuid() primary key,
  playlist_id uuid references playlists(id) on delete cascade,
  song_id text not null,
  song_data jsonb not null,
  position int default 0,
  added_at timestamptz default now()
);

-- listening history
create table if not exists listening_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  song_id text not null,
  song_data jsonb not null,
  played_at timestamptz default now()
);

-- Enable RLS (basic – tighten as needed)
alter table profiles enable row level security;
alter table liked_songs enable row level security;
alter table playlists enable row level security;
alter table playlist_songs enable row level security;
alter table listening_history enable row level security;

create policy "Users can manage own profile" on profiles
  for all using (auth.uid() = id);

create policy "Users manage own liked" on liked_songs
  for all using (auth.uid() = user_id);

create policy "Users manage own playlists" on playlists
  for all using (auth.uid() = user_id);

create policy "Users manage own playlist songs" on playlist_songs
  for all using (
    playlist_id in (select id from playlists where user_id = auth.uid())
  );

create policy "Users manage own history" on listening_history
  for all using (auth.uid() = user_id);
```

3. Copy your **Project URL**, **anon key** and **service_role key** from Project Settings → API.

---

## 2. Backend

```bash
cd backend
cp .env.example .env
# edit .env and paste your Supabase keys

python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API docs → http://127.0.0.1:8000/docs

---

## 3. Frontend

Open the `frontend` folder with any static server, e.g.:

```bash
cd frontend
npx serve -p 5500
# or
python -m http.server 5500
```

Then open → http://localhost:5500/login.html

> Make sure the backend is running on port 8000.  
> The frontend is hard-coded to `http://127.0.0.1:8000/api`.

---

## 4. Voice Assistant

Works best in **Chrome / Edge**.

1. Click the green mic button (or say a command after clicking).
2. Allow microphone permission.
3. Try:
   - “play Kesariya”
   - “pause”
   - “volume up”
   - “next”

---

## Project Structure

```
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── routers/
│   │   ├── auth.py
│   │   ├── music.py
│   │   ├── playlists.py
│   │   └── voice.py
│   ├── services/
│   │   └── saavn.py
│   └── utils/
│       └── supabase_client.py
├── frontend/
│   ├── index.html
│   ├── login.html
│   ├── css/style.css
│   └── js/
│       ├── auth.js
│       ├── player.js
│       ├── voice.js
│       └── app.js
└── README.md
```

---

## Notes & Next Improvements

- Saavn is an **unofficial** API – endpoints or response shape can change.
- Some songs may not have a direct stream URL (region / DRM).
- Add proper JWT verification middleware for production.
- Add playlist create UI, queue view, lyrics, recommendations.
- For better NLP you can later plug a small LLM into `/api/voice/parse`.

Enjoy building! 🎵

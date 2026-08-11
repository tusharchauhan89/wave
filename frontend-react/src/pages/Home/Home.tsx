import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

import "./Home.css";

import {
  Music2,
  Headphones,
  ListMusic,
  Heart,
  Play,
} from "lucide-react";

import Greeting from "../../components/layout/Greeting";
import MusicRow from "../../components/layout/MusicRow";
import SongCard from "../../components/SongCard";

import {
  getHistory,
} from "../../services/music";

import {
  isLoggedIn,
} from "../../services/auth";

import {
  usePlayer,
} from "../../context/PlayerContext";

function Home() {
  const [recent, setRecent] =
    useState<any[]>([]);

  const [activeFilter, setActiveFilter] =
    useState("All");

  const {
    currentSong,
  } = usePlayer();


  /* =====================================================
     LOAD HISTORY
  ===================================================== */

  const loadHistory = async () => {
    if (!isLoggedIn()) {
      setRecent([]);
      return;
    }

    try {
      const history =
        await getHistory();

      setRecent(
        Array.isArray(history)
          ? history
          : []
      );
    } catch (error) {
      console.error(
        "history",
        error
      );
    }
  };


  /* =====================================================
     INITIAL HISTORY
  ===================================================== */

  useEffect(() => {
    loadHistory();
  }, []);


  /* =====================================================
     UPDATE RECENTLY PLAYED
  ===================================================== */

  useEffect(() => {
    if (!currentSong) {
      return;
    }

    setRecent((previous) => {
      const withoutCurrent =
        previous.filter(
          (song) =>
            song.id !==
            currentSong.id
        );

      return [
        currentSong,
        ...withoutCurrent,
      ];
    });

  }, [currentSong]);


  return (
    <div className="home-page">

      {/* =================================================
          TOP
      ================================================= */}

      <div className="home-top">

        <Greeting />

        <div className="home-filters">

          <button
            type="button"
            className={
              activeFilter === "All"
                ? "home-filter active"
                : "home-filter"
            }
            onClick={() =>
              setActiveFilter("All")
            }
          >
            All
          </button>

          <button
            type="button"
            className={
              activeFilter === "Music"
                ? "home-filter active"
                : "home-filter"
            }
            onClick={() =>
              setActiveFilter("Music")
            }
          >
            Music
          </button>

          <button
            type="button"
            className={
              activeFilter === "Podcasts"
                ? "home-filter active"
                : "home-filter"
            }
            onClick={() =>
              setActiveFilter("Podcasts")
            }
          >
            Podcasts
          </button>

        </div>

      </div>


      {/* =================================================
          QUICK ACCESS
      ================================================= */}

      <section className="quick-access-section">

        <div className="quick-access-grid">

          <QuickAccessCard
            icon={
              <Heart
                size={21}
                fill="currentColor"
              />
            }
            title="Liked Songs"
            subtitle="Your favorite music"
            className="liked"
          />

          <QuickAccessCard
            icon={
              <ListMusic size={21} />
            }
            title="My Playlists"
            subtitle="Your personal playlists"
            className="playlist"
          />

          <QuickAccessCard
            icon={
              <Music2 size={21} />
            }
            title="Recently Played"
            subtitle="Pick up where you left off"
            className="recent"
          />

          <QuickAccessCard
            icon={
              <Headphones size={21} />
            }
            title="Made For You"
            subtitle="Music picked for you"
            className="made"
          />

        </div>

      </section>


      {/* =================================================
          RECENTLY PLAYED
      ================================================= */}

      <section className="home-section">

        <div className="home-section-header">

          <div>

            <h2>
              Recently Played
            </h2>

            <p className="section-subtitle">
              Picking up where you left off...
            </p>

          </div>

          {recent.length > 0 && (
            <button
              type="button"
              className="home-show-all"
            >
              Show all
            </button>
          )}

        </div>


        {recent.length === 0 ? (

          <div className="empty-home-state">

            <Music2 size={25} />

            <span>
              Play a song and it will appear here
            </span>

          </div>

        ) : (

          <div className="home-song-row">

            {recent
              .slice(0, 8)
              .map((song) => (

                <SongCard
                  key={song.id}
                  song={song}
                  queue={recent}
                />

              ))}

          </div>

        )}

      </section>


      {/* =================================================
          MUSIC ROWS
      ================================================= */}

      <MusicRow
        title="Made For You"
        query="trending hindi songs"
      />

      <MusicRow
        title="Trending Now"
        query="top hindi songs"
      />

      <MusicRow
        title="New Music"
        query="latest hindi songs"
      />

    </div>
  );
}


/* =========================================================
   QUICK ACCESS
========================================================= */

function QuickAccessCard({
  icon,
  title,
  subtitle,
  className = "",
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`quick-access-card ${className}`}
    >

      <div className="quick-access-icon">
        {icon}
      </div>

      <div className="quick-access-text">

        <strong>
          {title}
        </strong>

        <span>
          {subtitle}
        </span>

      </div>

      <div className="quick-access-play">

        <Play
          size={16}
          fill="currentColor"
        />

      </div>

    </button>
  );
}

export default Home;
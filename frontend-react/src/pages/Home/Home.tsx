import { useEffect, useState } from "react";
import Greeting from "../../components/layout/Greeting";
import MusicRow from "../../components/layout/MusicRow";
import SongCard from "../../components/SongCard";
import { getHistory } from "../../services/music";
import { isLoggedIn } from "../../services/auth";
import "./Home.css";

const PREVIEW_COUNT = 6; // homepage pe kitne dikhne chahiye

function Home() {
  const [recent, setRecent] = useState<any[]>([]);
  const [showAllRecent, setShowAllRecent] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) return;
    getHistory()
      .then(setRecent)
      .catch((e) => console.error("history", e));
  }, []);

  const visibleRecent = showAllRecent
    ? recent
    : recent.slice(0, PREVIEW_COUNT);

  return (
    <div className="home-page">
      <Greeting />

      <section className="recent-section">
        <div className="recent-header">
          <h2>Recently Played</h2>

          {recent.length > PREVIEW_COUNT && (
            <button
              className="show-all-btn"
              type="button"
              onClick={() => setShowAllRecent((prev) => !prev)}
            >
              {showAllRecent ? "Show less" : "Show all"}
            </button>
          )}
        </div>

        {!isLoggedIn() && (
          <p className="recent-empty">Login required</p>
        )}

        {isLoggedIn() && recent.length === 0 && (
          <p className="recent-empty">
            🎵 Picking up where you left off...
          </p>
        )}

        <div className="recent-grid">
          {visibleRecent.map((s) => (
            <SongCard key={s.id} song={s} queue={recent} />
          ))}
        </div>
      </section>

      <MusicRow title="Made For You" query="trending hindi songs" />
      <MusicRow title="Trending Now" query="top hindi songs" />
    </div>
  );
}

export default Home;
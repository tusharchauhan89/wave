import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Greeting from "../../components/layout/Greeting";
import MusicRow from "../../components/layout/MusicRow";
import SongCard from "../../components/SongCard";
import { getHistory, getLikedSongs } from "../../services/music";
import { isLoggedIn } from "../../services/auth";
import { Heart, ListMusic, Headphones } from "lucide-react";
import "./Home.css";

const PREVIEW_COUNT = 6;

function Home() {
  const navigate = useNavigate();
  const [recent, setRecent] = useState<any[]>([]);
  const [, setLikedCount] = useState(0);
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "music">("all");

  // Music rows ke liye ref
  const musicRowsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoggedIn()) return;

    getHistory()
      .then(setRecent)
      .catch((e) => console.error("history", e));

    getLikedSongs()
      .then((songs) => setLikedCount(songs?.length || 0))
      .catch(() => setLikedCount(0));
  }, []);

  const visibleRecent = showAllRecent
    ? recent
    : recent.slice(0, PREVIEW_COUNT);

  // Tab click handler
  const handleTabClick = (tab: "all" | "music") => {
    setActiveTab(tab);

    if (tab === "music" && musicRowsRef.current) {
      musicRowsRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  return (
    <div className="home-page">
      {/* Greeting */}
      <Greeting />

      {/* Tabs */}
      <div className="home-tabs">
        <button
          className={`tab-btn ${activeTab === "all" ? "active" : ""}`}
          onClick={() => handleTabClick("all")}
        >
          All
        </button>
        <button
          className={`tab-btn ${activeTab === "music" ? "active" : ""}`}
          onClick={() => handleTabClick("music")}
        >
          Music
        </button>
      </div>

      {/* Quick Access Cards */}
      <div className="quick-access">
        <div className="quick-card liked" onClick={() => navigate("/liked")}>
          <div className="quick-icon">
            <Heart size={22} fill="currentColor" />
          </div>
          <div className="quick-text">
            <span className="quick-title">Liked Songs</span>
            <span className="quick-subtitle">Your favorite music</span>
          </div>
        </div>

        <div
          className="quick-card playlists"
          onClick={() => navigate("/playlists")}
        >
          <div className="quick-icon">
            <ListMusic size={22} />
          </div>
          <div className="quick-text">
            <span className="quick-title">My Playlists</span>
            <span className="quick-subtitle">Your personal playlists</span>
          </div>
        </div>

        <div
          className="quick-card made-for-you"
          onClick={() => navigate("/made-for-you")}
        >
          <div className="quick-icon">
            <Headphones size={22} />
          </div>
          <div className="quick-text">
            <span className="quick-title">Made For You</span>
            <span className="quick-subtitle">Music picked for you</span>
          </div>
        </div>
      </div>

      {/* Recently Played Section */}
      <section className="home-section">
        <div className="section-header">
          <div>
            <h2>Recently Played</h2>
            <p className="section-subtitle">Picking up where you left off...</p>
          </div>
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

        {!isLoggedIn() && <p className="empty-text">Login required</p>}

        {isLoggedIn() && recent.length === 0 && (
          <p className="empty-text">🎵 Start playing songs to see them here</p>
        )}

        <div className="recent-grid">
          {visibleRecent.map((s) => (
            <SongCard key={s.id} song={s} queue={recent} />
          ))}
        </div>
      </section>

      {/* ===== Music Rows (scroll target) ===== */}
      <div ref={musicRowsRef} className="music-rows-section">
        <MusicRow title=" Top Weekend played!" query="new hindi songs 2024" />
        <MusicRow title="Made For You" query="trending hindi songs" />
        <MusicRow title="Trending Now" query="top hindi songs" />
      </div>
    </div>
  );
}

export default Home;
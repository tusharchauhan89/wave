import { useEffect, useState } from "react";
import Greeting from "../../components/layout/Greeting";
import MusicRow from "../../components/layout/MusicRow";
import SongCard from "../../components/SongCard";
import { getHistory } from "../../services/music";
import { isLoggedIn } from "../../services/auth";

function Home() {
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    if (!isLoggedIn()) return;
    getHistory()
      .then(setRecent)
      .catch((e) => console.error("history", e));
  }, []);

  return (
    <div className="home-page">
      <Greeting />

      <section style={{ marginBottom: 24 }}>
        <h2>Recently Played</h2>
        {!isLoggedIn() && <p style={{ color: "#888" }}>Login required</p>}
        {isLoggedIn() && recent.length === 0 && (
          <p style={{ color: "#888" }}>🎵 Picking up where you left off... </p>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
          {recent.map((s) => (
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
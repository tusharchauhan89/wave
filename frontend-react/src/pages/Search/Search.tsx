import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { searchAll } from "../../services/music";
import SongCard from "../../components/SongCard";
import type { Song } from "../../context/PlayerContext";
import "./Search.css";

function Search() {
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q.trim()) {
      setSongs([]);
      return;
    }
    setLoading(true);
    searchAll(q)
      .then((r) => setSongs(r.songs || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <div className="search-page">
      <div className="search-header">
        <h1>{q ? `Results for "${q}"` : "Search"}</h1>
        {q && !loading && (
          <p>{songs.length} song{songs.length !== 1 ? "s" : ""} found</p>
        )}
      </div>

      {loading && (
        <div className="search-loading">
          <div className="spinner" />
          Searching…
        </div>
      )}

      {!loading && !q && (
        <div className="search-empty">
          <h2>Find your music</h2>
          <p>Search for songs, artists, or albums</p>
          <p className="hint">Try “Kesariya”, “Arijit Singh”, or “lofi”</p>
        </div>
      )}

      {!loading && q && songs.length === 0 && (
        <div className="search-empty">
          <h2>No results found</h2>
          <p>Try a different spelling or another song</p>
        </div>
      )}

      {!loading && songs.length > 0 && (
        <div className="search-grid">
          {songs.map((s) => (
            <SongCard 
              key={s.id} 
              song={s} 
              queue={songs}   // ← yeh sahi hai
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Search;
import { useEffect, useState } from "react";
import "./MusicRow.css";

import SongCard from "../../SongCard";
import { searchMusic } from "../../../services/music";

type MusicRowProps = {
  title: string;
  query: string;
};

function MusicRow({
  title,
  query,
}: MusicRowProps) {
  const [songs, setSongs] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadSongs = async () => {
      setLoading(true);

      try {
        const results =
          await searchMusic(
            query,
            20
          );

        if (!cancelled) {
          setSongs(
            Array.isArray(results)
              ? results
              : []
          );
        }
      } catch (error) {
        console.error(
          `Failed to load ${title}:`,
          error
        );

        if (!cancelled) {
          setSongs([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadSongs();

    return () => {
      cancelled = true;
    };
  }, [query, title]);

  return (
    <section className="music-row">

      <div className="music-row-header">

        <h2>{title}</h2>

        <button
          type="button"
          className="show-all-btn"
        >
          Show all
        </button>

      </div>


      {loading ? (
        <div className="music-row-loading">

          <div className="skeleton-card" />
          <div className="skeleton-card" />
          <div className="skeleton-card" />
          <div className="skeleton-card" />
          <div className="skeleton-card" />

        </div>
      ) : songs.length === 0 ? (
        <div className="music-row-empty">
          No music found
        </div>
      ) : (
        <div className="songs-container">

          {songs.map((song) => (
            <SongCard
              key={song.id}
              song={song}
              queue={songs}
            />
          ))}

        </div>
      )}

    </section>
  );
}

export default MusicRow;
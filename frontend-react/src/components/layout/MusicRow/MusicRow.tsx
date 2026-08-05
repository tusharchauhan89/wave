import { useEffect, useState } from "react";
import "./MusicRow.css";

import SongCard from "../../SongCard";
import { searchMusic } from "../../../services/music";

type MusicRowProps = {
  title: string;
  query: string;
};

function MusicRow({ title, query }: MusicRowProps) {
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSongs = async () => {
      try {
        const results = await searchMusic(query, 20);

        setSongs(Array.isArray(results) ? results : []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadSongs();
  }, [query]);

  return (
    <section className="music-row">
      <div className="music-row-header">
  <h2>{title}</h2>

  <button className="show-all-btn">
    Show all
  </button>
</div>

      {loading ? (
        <p className="loading">Loading...</p>
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
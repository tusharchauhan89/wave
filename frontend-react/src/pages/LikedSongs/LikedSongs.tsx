import { useEffect, useState } from "react";
import { getLikedSongs, unlikeSong } from "../../services/music";
import { isLoggedIn } from "../../services/auth";
import SongCard from "../../components/SongCard";
import { usePlayer, type Song } from "../../context/PlayerContext";

function LikedSongs() {
  const [songs, setSongs] = useState<Song[]>([]);
  const { playSong } = usePlayer();

  useEffect(() => {
    if (!isLoggedIn()) return;
    getLikedSongs().then(setSongs).catch(console.error);
  }, []);

  return (
    <div>
      <h1>Liked Songs</h1>
      {songs.length > 0 && (
        <button onClick={() => playSong(songs[0], songs)}>Play all</button>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        {songs.map((s) => (
          <div key={s.id}>
            <SongCard song={s} queue={songs} />
            <button onClick={() => unlikeSong(s.id).then(() => setSongs((p) => p.filter((x) => x.id !== s.id)))}>
              Unlike
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
export default LikedSongs;
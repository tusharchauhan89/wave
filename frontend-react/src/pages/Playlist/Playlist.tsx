import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getUserPlaylist, removeSongFromPlaylist } from "../../services/playlist";
import { normalizeSong } from "../../services/music";
import SongCard from "../../components/SongCard";
import { usePlayer, type Song } from "../../context/PlayerContext";

function Playlist() {
  const { id } = useParams<{ id: string }>();
  const [name, setName] = useState("");
  const [songs, setSongs] = useState<Song[]>([]);
  const { playSong } = usePlayer();

  useEffect(() => {
    if (!id) return;
    getUserPlaylist(id).then((pl) => {
      setName(pl?.name || "Playlist");
      setSongs((pl?.songs || []).map((r: any) => normalizeSong(r.song_data || r)));
    }).catch(console.error);
  }, [id]);

  return (
    <div>
      <h1>{name}</h1>
      {songs[0] && <button onClick={() => playSong(songs[0], songs)}>Play all</button>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        {songs.map((s) => (
          <div key={s.id}>
            <SongCard song={s} queue={songs} />
            <button onClick={() => id && removeSongFromPlaylist(id, s.id).then(() => setSongs((p) => p.filter((x) => x.id !== s.id)))}>
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
export default Playlist;
import "./SongCard.css";
import { useState } from "react";
import { Play, Heart, ListPlus } from "lucide-react";
import { usePlayer } from "../../context/PlayerContext";
import { likeSong, getRelatedSongs } from "../../services/music";
import { listPlaylists, addSongToPlaylist } from "../../services/playlist";
import { isLoggedIn } from "../../services/auth";

function SongCard({ song, queue }: { song: any; queue?: any[] }) {
  const { playSong, addToQueue } = usePlayer();
  const [menuOpen, setMenuOpen] = useState(false);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loadingPl, setLoadingPl] = useState(false);

  const image =
    song?.image?.[2]?.url ||
    song?.image?.[1]?.url ||
    song?.image?.[0]?.url ||
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Crect fill='%23333' width='160' height='160'/%3E%3C/svg%3E";

  const artist =
    song?.artists?.primary?.map((a: any) => a.name).join(", ") ||
    "Unknown";

  const onPlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await playSong(song, queue && queue.length > 0 ? queue : [song]);

      const related = await getRelatedSongs(song, 15);
      related.forEach((s) => addToQueue(s));
    } catch (err) {
      console.error(err);
    }
  };

  const onLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoggedIn()) {
      alert("Pehle login karo");
      return;
    }
    try {
      await likeSong(song);
      alert("Liked");
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Like fail");
    }
  };

  const onAddClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoggedIn()) {
      alert("Pehle login karo");
      return;
    }
    setLoadingPl(true);
    try {
      const list = await listPlaylists();
      setPlaylists(Array.isArray(list) ? list : []);
      setMenuOpen(true);
      if (!list?.length) {
        alert("Pehle Library se playlist banao");
      }
    } catch (err: any) {
      console.error(err);
      alert(
        err?.response?.data?.detail ||
          "Playlists load nahi hui (login check karo)"
      );
      setMenuOpen(false);
    } finally {
      setLoadingPl(false);
    }
  };

  const addTo = async (playlistId: string) => {
    try {
      await addSongToPlaylist(playlistId, song);
      setMenuOpen(false);
      alert("Added to playlist");
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Add fail");
    }
  };

  return (
    <div className="song-card">
      <div className="song-image">
        <img src={image} alt={song?.name || ""} />
        <button type="button" className="play-button" onClick={onPlay}>
          <Play size={22} fill="black" />
        </button>
      </div>

      <div className="song-info">
        <h3>{song?.name || "Unknown"}</h3>
        <p>{artist}</p>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <button type="button" onClick={onLike} title="Like">
          <Heart size={16} />
        </button>
        <button
          type="button"
          onClick={onAddClick}
          title="Add to playlist"
          disabled={loadingPl}
        >
          <ListPlus size={16} />
        </button>
      </div>

      {menuOpen && (
        <div
          style={{
            marginTop: 8,
            background: "#282828",
            borderRadius: 8,
            padding: 8,
          }}
        >
          {playlists.map((pl) => (
            <button
              key={pl.id}
              type="button"
              onClick={() => addTo(pl.id)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                background: "none",
                border: "none",
                color: "#fff",
                padding: "8px",
                cursor: "pointer",
              }}
            >
              {pl.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            style={{
              width: "100%",
              background: "none",
              border: "none",
              color: "#888",
              padding: 6,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

export default SongCard;
import "./NowPlaying.css";
import { X, Heart, ListMusic } from "lucide-react";
import { usePlayer } from "../../../context/PlayerContext";
import { useEffect, useState } from "react";
import { likeSong, unlikeSong, getLikedSongs } from "../../../services/music";

type Props = {
  open: boolean;
  onClose: () => void;
  onOpenQueue?: () => void;
};

function getImage(song: any) {
  if (!song?.image) return "";
  if (typeof song.image === "string") return song.image;
  const arr = song.image;
  return (
    arr.find((i: any) => i.quality === "500x500")?.url ||
    arr[2]?.url ||
    arr[1]?.url ||
    arr[0]?.url ||
    ""
  );
}

function getArtist(song: any) {
  return (
    song?.artists?.primary?.map((a: any) => a.name).join(", ") ||
    "Unknown Artist"
  );
}

export default function NowPlaying({ open, onClose, onOpenQueue }: Props) {
  const { currentSong, isPlaying } = usePlayer();
  const [liked, setLiked] = useState<string[]>([]);

  useEffect(() => {
    getLikedSongs()
      .then((res) => {
        const songs = res?.songs ?? res?.data ?? [];
        setLiked(songs.map((s: any) => String(s.id)));
      })
      .catch(() => {});
  }, []);

  if (!open || !currentSong) return null;

  const isLiked = liked.includes(currentSong.id);

  const toggleLike = async () => {
    try {
      if (isLiked) {
        await unlikeSong(currentSong.id);
        setLiked((p) => p.filter((id) => id !== currentSong.id));
      } else {
        await likeSong(currentSong);
        setLiked((p) => [...p, currentSong.id]);
      }
    } catch {}
  };

  return (
    <aside className={`now-playing-panel ${open ? "open" : ""}`}>
      <div className="np-header">
        <span className="np-title">
          {currentSong.album?.name || "Now Playing"}
        </span>
        <div className="np-actions">
          {onOpenQueue && (
            <button className="np-btn" onClick={onOpenQueue} type="button">
              <ListMusic size={18} />
            </button>
          )}
          <button className="np-btn" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="np-body">
        <div className={`np-cover-wrap ${isPlaying ? "playing" : ""}`}>
          <img src={getImage(currentSong)} alt="" className="np-cover" />
        </div>

        <div className="np-meta">
          <div className="np-row">
            <div>
              <h2 className="np-name">{currentSong.name}</h2>
              <p className="np-artist">{getArtist(currentSong)}</p>
            </div>
            <button
              className={`np-btn ${isLiked ? "liked" : ""}`}
              onClick={toggleLike}
              type="button"
            >
              <Heart
                size={20}
                fill={isLiked ? "#1DB954" : "none"}
                color={isLiked ? "#1DB954" : "currentColor"}
              />
            </button>
          </div>
          {currentSong.album?.name && (
            <p className="np-album">Album · {currentSong.album.name}</p>
          )}
        </div>
      </div>
    </aside>
  );
}
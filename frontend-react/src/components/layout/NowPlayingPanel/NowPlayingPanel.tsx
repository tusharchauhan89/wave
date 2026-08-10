import "./NowPlaying.css";
import { X, Heart, Plus } from "lucide-react";
import { usePlayer } from "../../../context/PlayerContext";

type Props = {
  onClose: () => void;
};

function NowPlaying({ onClose }: Props) {
  const { currentSong } = usePlayer();

  const image =
    currentSong?.image?.[2]?.url ||
    currentSong?.image?.[1]?.url ||
    currentSong?.image?.[0]?.url ||
    "";

  const artist =
    currentSong?.artists?.primary?.map((a: any) => a.name).join(", ") ||
    "Unknown Artist";

  return (
    <aside className="now-playing-panel">
      <div className="np-header">
        <h3>Now Playing</h3>
        <button className="np-close" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      <div className="np-content">
        {currentSong ? (
          <>
            <img src={image} alt={currentSong.name} className="np-cover" />
            <h2 className="np-title">{currentSong.name}</h2>
            <p className="np-artist">{artist}</p>

            <div className="np-actions">
              <button className="np-btn">
                <Heart size={20} />
              </button>
              <button className="np-btn">
                <Plus size={20} />
              </button>
            </div>
          </>
        ) : (
          <div className="np-empty">
            <p>Nothing playing</p>
            <span>Select a song to see details here</span>
          </div>
        )}
      </div>
    </aside>
  );
}

export default NowPlaying;
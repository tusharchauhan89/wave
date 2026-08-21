import { useMemo, useRef } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Heart,
  MoreHorizontal,
} from "lucide-react";
import { usePlayer } from "./PlayerContext";
import "./Player.css";

function formatTime(sec: number) {
  if (!sec || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getImage(song: any): string {
  if (!song?.image) return "";
  if (typeof song.image === "string") return song.image;
  const arr = song.image as { quality: string; url: string }[];
  return (
    arr.find((i) => i.quality === "500x500")?.url ||
    arr.find((i) => i.quality === "150x150")?.url ||
    arr[0]?.url ||
    ""
  );
}

function getArtist(song: any): string {
  return (
    song?.artists?.primary?.map((a: any) => a.name).join(", ") ||
    song?.primaryArtists ||
    "Unknown"
  );
}

export default function PlayerBar() {
  const {
    currentSong,
    isPlaying,
    isLoading,
    progress,
    duration,
    volume,
    isMuted,
    shuffle,
    repeat,
    togglePlay,
    next,
    previous,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
  } = usePlayer();

  const progressRef = useRef<HTMLInputElement>(null);

  // Waveform bars (visual only)
  const bars = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => {
        const wave = Math.sin(i * 0.35) * 0.5 + 0.5;
        const noise = Math.abs(Math.sin(i * 1.7 + 2)) * 0.4;
        return Math.round((wave * 0.6 + noise * 0.4) * 100);
      }),
    [currentSong?.id]
  );

  const progressPct = duration > 0 ? (progress / duration) * 100 : 0;
  const activeBars = Math.floor((progressPct / 100) * bars.length);

  if (!currentSong) return null;

  return (
    <div
      className="player-bar"
      style={
        {
          "--progress": `${progressPct}%`,
          "--vol": `${(isMuted ? 0 : volume) * 100}%`,
        } as React.CSSProperties
      }
    >
      {/* LEFT - Song info */}
      <div className="pb-left">
        <img
          src={getImage(currentSong)}
          alt=""
          className="pb-cover"
        />
        <div className="pb-meta">
          <div className="pb-title">
            <span>{currentSong.name}</span>
            <button className="pb-like" title="Like">
              <Heart size={14} />
            </button>
          </div>
          <div className="pb-artist">{getArtist(currentSong)}</div>
        </div>
      </div>

      {/* CENTER */}
      <div className="pb-center">
        {/* Waveform */}
        <div className="pb-wave-row">
          <div className="pb-wave">
            {bars.map((h, i) => (
              <span
                key={i}
                className={`pb-bar ${i < activeBars ? "active" : ""}`}
                style={{ height: `${Math.max(12, h)}%` }}
              />
            ))}
          </div>
          <span className="pb-wave-time">
            {formatTime(progress)} / {formatTime(duration)}
          </span>
        </div>

        {/* Controls */}
        <div className="pb-controls">
          <button
            className={`pb-btn ${shuffle ? "active" : ""}`}
            onClick={toggleShuffle}
            title="Shuffle"
          >
            <Shuffle size={16} />
          </button>

          <button className="pb-btn" onClick={previous} title="Previous">
            <SkipBack size={18} fill="currentColor" />
          </button>

          <button
            className="pb-play"
            onClick={togglePlay}
            disabled={isLoading}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause size={20} fill="currentColor" />
            ) : (
              <Play size={20} fill="currentColor" />
            )}
          </button>

          <button className="pb-btn" onClick={next} title="Next">
            <SkipForward size={18} fill="currentColor" />
          </button>

          <button
            className={`pb-btn ${repeat !== "off" ? "active" : ""}`}
            onClick={cycleRepeat}
            title={`Repeat: ${repeat}`}
          >
            {repeat === "one" ? <Repeat1 size={16} /> : <Repeat size={16} />}
          </button>

          <div className="pb-volume">
            <button className="pb-btn" onClick={toggleMute}>
              {isMuted || volume === 0 ? (
                <VolumeX size={16} />
              ) : (
                <Volume2 size={16} />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="pb-vol-slider"
            />
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="pb-right">
        <button className="pb-btn">
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* BOTTOM progress */}
      <div className="pb-progress-row">
        <span>{formatTime(progress)}</span>
        <input
          ref={progressRef}
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={progress}
          onChange={(e) => seek(parseFloat(e.target.value))}
          className="pb-progress"
        />
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}
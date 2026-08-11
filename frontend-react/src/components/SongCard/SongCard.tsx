import "./SongCard.css";
import { useState } from "react";
import {
  Play,
  Heart,
  ListPlus,
} from "lucide-react";

import { usePlayer } from "../../context/PlayerContext";
import { likeSong } from "../../services/music";
import {
  listPlaylists,
  addSongToPlaylist,
} from "../../services/playlist";
import { isLoggedIn } from "../../services/auth";

function SongCard({
  song,
  queue,
}: {
  song: any;
  queue: any[];
}) {
  const { playSong } = usePlayer();

  const [menuOpen, setMenuOpen] = useState(false);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loadingPl, setLoadingPl] = useState(false);

  const image =
    song?.image?.[2]?.url ||
    song?.image?.[1]?.url ||
    song?.image?.[0]?.url ||
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Crect fill='%23202020' width='300' height='300'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23888' font-size='70'%3E♪%3C/text%3E%3C/svg%3E";

  const artist =
    song?.artists?.primary
      ?.map((a: any) => a.name)
      .join(", ") ||
    "Unknown Artist";

  const songName =
    song?.name ||
    "Unknown Song";

  /* =====================================================
     PLAY
     ===================================================== */

  const onPlay = (
    e: React.MouseEvent
  ) => {
    e.stopPropagation();

    playSong(song, queue).catch(
      console.error
    );
  };


  /* =====================================================
     LIKE
     ===================================================== */

  const onLike = async (
    e: React.MouseEvent
  ) => {
    e.stopPropagation();

    if (!isLoggedIn()) {
      alert("Pehle login karo");
      return;
    }

    try {
      await likeSong(song);
    } catch (err: any) {
      alert(
        err?.response?.data?.detail ||
          "Like fail"
      );
    }
  };


  /* =====================================================
     ADD TO PLAYLIST
     ===================================================== */

  const onAddClick = async (
    e: React.MouseEvent
  ) => {
    e.stopPropagation();

    if (!isLoggedIn()) {
      alert("Pehle login karo");
      return;
    }

    setLoadingPl(true);

    try {
      const list = await listPlaylists();

      setPlaylists(
        Array.isArray(list)
          ? list
          : []
      );

      setMenuOpen(true);

      if (!list?.length) {
        alert(
          "Pehle Library se playlist banao"
        );
      }
    } catch (err: any) {
      console.error(err);

      alert(
        err?.response?.data?.detail ||
          "Playlists load nahi hui"
      );

      setMenuOpen(false);
    } finally {
      setLoadingPl(false);
    }
  };


  /* =====================================================
     ADD SONG
     ===================================================== */

  const addTo = async (
    playlistId: string
  ) => {
    try {
      await addSongToPlaylist(
        playlistId,
        song
      );

      setMenuOpen(false);

      alert("Added to playlist");
    } catch (err: any) {
      alert(
        err?.response?.data?.detail ||
          "Add fail"
      );
    }
  };


  return (
    <article className="song-card">

      {/* ALBUM ART */}

      <div className="song-image">

        <img
          src={image}
          alt={songName}
          loading="lazy"
        />

        <button
          type="button"
          className="play-button"
          onClick={onPlay}
          aria-label={`Play ${songName}`}
        >
          <Play
            size={20}
            fill="currentColor"
          />
        </button>

      </div>


      {/* SONG INFORMATION */}

      <div className="song-info">

        <h3 title={songName}>
          {songName}
        </h3>

        <p title={artist}>
          {artist}
        </p>

      </div>


      {/* CARD ACTIONS */}

      <div className="song-actions">

        <button
          type="button"
          onClick={onLike}
          title="Like song"
          className="song-action-btn"
        >
          <Heart size={16} />
        </button>

        <button
          type="button"
          onClick={onAddClick}
          title="Add to playlist"
          className="song-action-btn"
          disabled={loadingPl}
        >
          <ListPlus size={16} />
        </button>

      </div>


      {/* PLAYLIST MENU */}

      {menuOpen && (
        <div className="playlist-menu">

          <div className="playlist-menu-title">
            Add to playlist
          </div>

          {playlists.length > 0 ? (
            playlists.map((pl) => (
              <button
                key={pl.id}
                type="button"
                className="playlist-menu-item"
                onClick={() =>
                  addTo(pl.id)
                }
              >
                {pl.name}
              </button>
            ))
          ) : (
            <div className="playlist-empty">
              No playlists available
            </div>
          )}

          <button
            type="button"
            className="playlist-close"
            onClick={() =>
              setMenuOpen(false)
            }
          >
            Close
          </button>

        </div>
      )}

    </article>
  );
}

export default SongCard;
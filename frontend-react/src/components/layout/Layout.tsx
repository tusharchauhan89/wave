import "./Layout.css";

import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";

import {
  Sparkles,
  Heart,
  X,
  Trash2,
} from "lucide-react";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import Player from "./Player";
import NovaChat from "../NovaChat/NovaChat";

import {
  usePlayer,
  type Song,
} from "../../context/PlayerContext";

function Layout() {
  const [showQueue, setShowQueue] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [liked, setLiked] = useState(false);

  const {
    currentSong,
    isPlaying,
    queue,
    currentIndex,
    playSong,
    removeFromQueue,
    clearQueue,
  } = usePlayer();

  useEffect(() => {
    // Keeps Layout reactive to player changes.
  }, [currentSong, isPlaying, queue, currentIndex]);

  /* =====================================================
     CURRENT SONG
  ===================================================== */

  const image =
    currentSong?.image?.[2]?.url ||
    currentSong?.image?.[1]?.url ||
    currentSong?.image?.[0]?.url ||
    "";

  const artist =
    currentSong?.artists?.primary
      ?.map((artist) => artist.name)
      .join(", ") ||
    "Unknown Artist";

  /* =====================================================
     SONG HELPERS
  ===================================================== */

  const getSongImage = (song: Song) => {
    return (
      song?.image?.[2]?.url ||
      song?.image?.[1]?.url ||
      song?.image?.[0]?.url ||
      ""
    );
  };

  const getSongArtist = (song: Song) => {
    return (
      song?.artists?.primary
        ?.map((artist) => artist.name)
        .join(", ") ||
      "Unknown Artist"
    );
  };

  /* =====================================================
     PLAY SONG FROM QUEUE
  ===================================================== */

  const handleQueueSong = async (song: Song) => {
    try {
      await playSong(song, queue, true);
    } catch (error) {
      console.error(
        "Failed to play queue song:",
        error
      );
    }
  };

  return (
    <div className="app-layout">

      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside className="app-sidebar">
        <Sidebar />
      </aside>


      {/* =================================================
          MAIN APPLICATION
      ================================================= */}

      <div className="app-main">

        {/* =================================================
            TOPBAR
        ================================================= */}

        <header className="app-topbar">
          <Topbar />
        </header>


        {/* =================================================
            WORKSPACE
        ================================================= */}

        <div className="app-workspace">

          {/* =================================================
              MAIN PAGE
          ================================================= */}

          <main className="page-content">
            <Outlet />
          </main>


          {/* =================================================
              NOW PLAYING
          ================================================= */}

          <aside className="now-playing-panel">

            {currentSong ? (

              <div className="now-playing">

                <div className="now-playing-header">

                  <span>
                    Now Playing
                  </span>

                  <button
                    type="button"
                    className="now-playing-more"
                    aria-label="More options"
                  >
                    •••
                  </button>

                </div>


                <div className="now-playing-art-wrapper">

                  {image ? (

                    <img
                      src={image}
                      alt={currentSong.name}
                      className="now-playing-art"
                    />

                  ) : (

                    <div className="now-playing-art-placeholder">
                      ♪
                    </div>

                  )}

                </div>


                <div className="now-playing-info">

                  <div className="now-playing-title-row">

                    <div>

                      <h2>
                        {currentSong.name}
                      </h2>

                      <p>
                        {artist}
                      </p>

                    </div>


                    <button
                      type="button"
                      className={
                        liked
                          ? "now-playing-like liked"
                          : "now-playing-like"
                      }
                      title={
                        liked
                          ? "Unlike"
                          : "Like"
                      }
                      aria-label={
                        liked
                          ? "Unlike song"
                          : "Like song"
                      }
                      onClick={() =>
                        setLiked(
                          (previous) => !previous
                        )
                      }
                    >

                      <Heart
                        size={20}
                        fill={
                          liked
                            ? "currentColor"
                            : "none"
                        }
                      />

                    </button>

                  </div>

                </div>


                <div className="now-playing-bottom">

                  <div className="now-playing-album">
                    {currentSong.album?.name ||
                      "Grove"}
                  </div>

                  <div className="now-playing-status">
                    {isPlaying
                      ? "Playing"
                      : "Paused"}
                  </div>

                </div>

              </div>

            ) : (

              <div className="now-playing-empty">

                <div className="now-playing-empty-art">
                  ♪
                </div>

                <h2>
                  Nothing playing
                </h2>

                <p>
                  Select a song to start listening
                </p>

              </div>

            )}

          </aside>

        </div>


        {/* =================================================
            QUEUE PANEL
            OUTSIDE WORKSPACE
        ================================================= */}

        {showQueue && (

          <aside className="queue-panel">

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="queue-header">

              <div className="queue-header-title">

                <h2>
                  Queue
                </h2>

                <span>
                  {queue.length}{" "}
                  {queue.length === 1
                    ? "song"
                    : "songs"}
                </span>

              </div>


              <div className="queue-header-actions">

                {queue.length > 0 && (

                  <button
                    type="button"
                    className="queue-clear"
                    onClick={clearQueue}
                  >
                    Clear
                  </button>

                )}

                <button
                  type="button"
                  className="queue-close"
                  title="Close queue"
                  aria-label="Close queue"
                  onClick={() =>
                    setShowQueue(false)
                  }
                >
                  <X size={19} />
                </button>

              </div>

            </div>


            {/* =================================================
                CONTENT
            ================================================= */}

            <div className="queue-content">

              {queue.length === 0 ? (

                <div className="queue-empty">

                  <div className="queue-empty-icon">
                    ♫
                  </div>

                  <h3>
                    Your queue is empty
                  </h3>

                  <p>
                    Add songs to your queue
                    and they will appear here.
                  </p>

                </div>

              ) : (

                <>

                  {/* =========================================
                      CURRENT SONG
                  ========================================= */}

                  {currentSong && (

                    <section className="queue-section">

                      <div className="queue-section-title">
                        Now playing
                      </div>


                      <div className="queue-current queue-current-active">

                        <div className="queue-image">

                          {getSongImage(currentSong) ? (

                            <img
                              src={getSongImage(
                                currentSong
                              )}
                              alt={currentSong.name}
                            />

                          ) : (

                            <div className="queue-image-placeholder">
                              ♪
                            </div>

                          )}

                        </div>


                        <div className="queue-song-info">

                          <div className="queue-song-name queue-current-name">
                            {currentSong.name}
                          </div>

                          <div className="queue-song-artist queue-current-artist">
                            {getSongArtist(
                              currentSong
                            )}
                          </div>

                        </div>


                        <div className="queue-playing-dot">
                          ●
                        </div>

                      </div>

                    </section>

                  )}


                  {/* =========================================
                      NEXT IN QUEUE
                  ========================================= */}

                  <section className="queue-section">

                    <div className="queue-section-title">
                      Next in queue
                    </div>


                    <div className="queue-list">

                      {queue
                        .slice(currentIndex + 1)
                        .map(
                          (
                            song,
                            relativeIndex
                          ) => {

                            const actualIndex =
                              currentIndex +
                              1 +
                              relativeIndex;

                            return (

                              <div
                                className="queue-item"
                                key={`${song.id}-${actualIndex}`}
                              >

                                {/* SONG */}

                                <button
                                  type="button"
                                  className="queue-song"
                                  onClick={() =>
                                    handleQueueSong(
                                      song
                                    )
                                  }
                                >

                                  <div className="queue-image">

                                    {getSongImage(song) ? (

                                      <img
                                        src={getSongImage(
                                          song
                                        )}
                                        alt={song.name}
                                      />

                                    ) : (

                                      <div className="queue-image-placeholder">
                                        ♪
                                      </div>

                                    )}

                                  </div>


                                  <div className="queue-song-info">

                                    <div className="queue-song-name">
                                      {song.name}
                                    </div>

                                    <div className="queue-song-artist">
                                      {getSongArtist(
                                        song
                                      )}
                                    </div>

                                  </div>

                                </button>


                                {/* REMOVE */}

                                <button
                                  type="button"
                                  className="queue-remove"
                                  title="Remove from queue"
                                  aria-label="Remove from queue"
                                  onClick={() =>
                                    removeFromQueue(
                                      actualIndex
                                    )
                                  }
                                >

                                  <Trash2
                                    size={16}
                                  />

                                </button>

                              </div>

                            );
                          }
                        )}

                    </div>

                  </section>

                </>

              )}

            </div>

          </aside>

        )}


        {/* =================================================
            PLAYER
        ================================================= */}

        <div className="app-player">

          <Player
            showQueue={showQueue}
            setShowQueue={setShowQueue}
          />

        </div>

      </div>


      {/* =================================================
          NOVA
      ================================================= */}

      <button
        className="floating-ai"
        onClick={() =>
          setChatOpen(true)
        }
        type="button"
      >

        <Sparkles size={19} />

        <span>
          Nova
        </span>

      </button>


      <NovaChat
        open={chatOpen}
        onClose={() =>
          setChatOpen(false)
        }
      />

    </div>
  );
}

export default Layout;
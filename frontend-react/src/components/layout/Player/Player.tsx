import { useMemo, useRef, useState } from "react";

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
  ListMusic,
  X,
} from "lucide-react";

import { usePlayer } from "../../../context/PlayerContext";

import "./Player.css";

function formatTime(sec: number) {
  if (!sec || isNaN(sec)) return "0:00";

  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);

  return `${m}:${s
    .toString()
    .padStart(2, "0")}`;
}

function getImage(song: any): string {
  if (!song?.image) return "";

  if (typeof song.image === "string") {
    return song.image;
  }

  const arr = song.image as {
    quality: string;
    url: string;
  }[];

  return (
    arr.find(
      (i) => i.quality === "500x500"
    )?.url ||
    arr.find(
      (i) => i.quality === "150x150"
    )?.url ||
    arr[0]?.url ||
    ""
  );
}

function getArtist(song: any): string {
  return (
    song?.artists?.primary
      ?.map((a: any) => a.name)
      .join(", ") ||
    song?.primaryArtists ||
    "Unknown Artist"
  );
}

export default function PlayerBar() {
  const {
    currentSong,
    queue,
    currentIndex,

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

    playSong,
  } = usePlayer();

  const progressRef =
    useRef<HTMLInputElement | null>(null);

  const [isExpanded, setIsExpanded] =
    useState(false);

  const [showQueue, setShowQueue] =
    useState(false);

  /* =====================================================
     WAVEFORM
  ===================================================== */

  const bars = useMemo(
    () =>
      Array.from(
        { length: 48 },
        (_, i) => {
          const wave =
            Math.sin(i * 0.35) *
              0.5 +
            0.5;

          const noise =
            Math.abs(
              Math.sin(
                i * 1.7 + 2
              )
            ) * 0.4;

          return Math.round(
            (
              wave * 0.6 +
              noise * 0.4
            ) * 100
          );
        }
      ),
    [currentSong?.id]
  );

  const progressPct =
    duration > 0
      ? (progress / duration) * 100
      : 0;

  const image =
    getImage(currentSong);

  const artist =
    getArtist(currentSong);

  /* =====================================================
     CIRCULAR QUEUE

     Example:

     Queue:
     A B C D E

     If B is playing:

     Next Up:
     C D E A
  ===================================================== */

  const orderedQueue =
    currentIndex >= 0 &&
    queue.length > 0
      ? [
          ...queue.slice(
            currentIndex + 1
          ),
          ...queue.slice(
            0,
            currentIndex
          ),
        ]
      : queue;

  /* =====================================================
     NO SONG
  ===================================================== */

  if (!currentSong) {
    return null;
  }

  /* =====================================================
     PLAY / PAUSE
  ===================================================== */

  const handlePlay = (
    e: React.MouseEvent
  ) => {
    e.stopPropagation();

    togglePlay();
  };

  /* =====================================================
     MOBILE EXPANDED PLAYER
  ===================================================== */

  const openExpandedPlayer = () => {
    setIsExpanded(true);
  };

  const closeExpandedPlayer = (
    e: React.MouseEvent
  ) => {
    e.stopPropagation();

    setIsExpanded(false);
  };

  /* =====================================================
     QUEUE TOGGLE
  ===================================================== */

  const toggleQueue = (
    e: React.MouseEvent
  ) => {
    e.stopPropagation();

    setShowQueue(
      (previous) => !previous
    );
  };

  /* =====================================================
     PLAY QUEUED SONG
  ===================================================== */

  const handleQueueSong = async (
    song: any
  ) => {
    try {
      /*
       * Always keep the original queue.
       *
       * This is important because currentIndex
       * must remain tied to the original queue.
       */
      await playSong(
        song,
        queue
      );

      setShowQueue(false);
    } catch (error) {
      console.error(
        "Queue song play failed:",
        error
      );
    }
  };

  return (
    <>
      {/* =================================================
          PLAYER
      ================================================= */}

      <div
        className={`player ${
          isExpanded
            ? "player-mobile-expanded"
            : ""
        }`}
        onClick={() => {
          if (
            window.innerWidth <= 450 &&
            !isExpanded
          ) {
            openExpandedPlayer();
          }
        }}
      >
        {/* =================================================
            MOBILE EXPANDED HEADER
        ================================================= */}

        {isExpanded && (
          <div className="mobile-player-header">
            <button
              type="button"
              className="mobile-player-close"
              onClick={
                closeExpandedPlayer
              }
              aria-label="Close player"
            >
              <X size={22} />
            </button>

            <span>
              NOW PLAYING
            </span>

            <div className="mobile-player-header-spacer" />
          </div>
        )}

        {/* =================================================
            LEFT — SONG
        ================================================= */}

        <div className="player-left">
          <div className="player-cover">
            {image ? (
              <img
                src={image}
                alt={currentSong.name}
              />
            ) : (
              <div className="player-cover-placeholder">
                ♪
              </div>
            )}
          </div>

          <div className="player-song-details">
            <div
              className="player-song-name"
              title={currentSong.name}
            >
              {currentSong.name}
            </div>

            <div
              className="player-song-artist"
              title={artist}
            >
              {artist}
            </div>
          </div>

          <button
            type="button"
            className="player-add"
            onClick={(e) =>
              e.stopPropagation()
            }
            title="Like"
          >
            <Heart size={18} />
          </button>
        </div>

        {/* =================================================
            CENTER
        ================================================= */}

        <div className="player-center">
          {/* WAVEFORM */}

          <div className="player-wave">
            {bars.map(
              (height, index) => {
                const activeBars =
                  Math.floor(
                    (progressPct / 100) *
                      bars.length
                  );

                return (
                  <span
                    key={index}
                    className={
                      index <
                      activeBars
                        ? "player-wave-bar active"
                        : "player-wave-bar"
                    }
                    style={{
                      height:
                        `${Math.max(
                          12,
                          height
                        )}%`,
                    }}
                  />
                );
              }
            )}
          </div>

          {/* CONTROLS */}

          <div
            className="player-controls"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            {/* SHUFFLE */}

            <button
              type="button"
              className={
                shuffle
                  ? "player-icon active"
                  : "player-icon"
              }
              onClick={
                toggleShuffle
              }
              title="Shuffle"
            >
              <Shuffle size={16} />
            </button>

            {/* PREVIOUS */}

            <button
              type="button"
              className="player-icon"
              onClick={previous}
              title="Previous"
            >
              <SkipBack
                size={18}
                fill="currentColor"
              />
            </button>

            {/* PLAY */}

            <button
              type="button"
              className="player-main-button"
              onClick={handlePlay}
              disabled={isLoading}
              title={
                isPlaying
                  ? "Pause"
                  : "Play"
              }
            >
              {isPlaying ? (
                <Pause
                  size={20}
                  fill="currentColor"
                />
              ) : (
                <Play
                  size={20}
                  fill="currentColor"
                />
              )}
            </button>

            {/* NEXT */}

            <button
              type="button"
              className="player-icon"
              onClick={next}
              title="Next"
            >
              <SkipForward
                size={18}
                fill="currentColor"
              />
            </button>

            {/* REPEAT */}

            <button
              type="button"
              className={
                repeat !== "off"
                  ? "player-icon active"
                  : "player-icon"
              }
              onClick={
                cycleRepeat
              }
              title={`Repeat: ${repeat}`}
            >
              {repeat === "one" ? (
                <Repeat1 size={16} />
              ) : (
                <Repeat size={16} />
              )}
            </button>
          </div>

          {/* PROGRESS */}

          <div
            className="player-progress"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <span className="player-time">
              {formatTime(
                progress
              )}
            </span>

            <input
              ref={progressRef}
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={progress}
              onChange={(e) =>
                seek(
                  parseFloat(
                    e.target.value
                  )
                )
              }
              className="player-progress-slider"
            />

            <span className="player-time">
              {formatTime(
                duration
              )}
            </span>
          </div>
        </div>

        {/* =================================================
            RIGHT
        ================================================= */}

        <div
          className="player-right"
          onClick={(e) =>
            e.stopPropagation()
          }
        >
          {/* QUEUE */}

          <button
            type="button"
            className={
              showQueue
                ? "player-right-icon queue-button active"
                : "player-right-icon queue-button"
            }
            title="Playing Queue"
            aria-label="Playing Queue"
            onClick={
              toggleQueue
            }
          >
            <ListMusic size={18} />
          </button>

          {/* MORE */}

          <button
            type="button"
            className="player-right-icon"
            title="More"
          >
            <MoreHorizontal
              size={18}
            />
          </button>

          {/* VOLUME */}

          <div className="player-volume">
            <button
              type="button"
              className="player-right-icon"
              onClick={
                toggleMute
              }
              title="Mute"
            >
              {isMuted ||
              volume === 0 ? (
                <VolumeX size={17} />
              ) : (
                <Volume2 size={17} />
              )}
            </button>

            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={
                isMuted
                  ? 0
                  : volume
              }
              onChange={(e) =>
                setVolume(
                  parseFloat(
                    e.target.value
                  )
                )
              }
              className="player-volume-slider"
            />
          </div>
        </div>

        {/* =================================================
            MOBILE PLAY BUTTON
        ================================================= */}

        <button
          type="button"
          className="mobile-mini-play"
          onClick={handlePlay}
          disabled={isLoading}
          aria-label={
            isPlaying
              ? "Pause"
              : "Play"
          }
        >
          {isPlaying ? (
            <Pause
              size={18}
              fill="currentColor"
            />
          ) : (
            <Play
              size={18}
              fill="currentColor"
            />
          )}
        </button>

        {/* =================================================
            MOBILE EXPANDED ARTWORK
        ================================================= */}

        {isExpanded && (
          <div
            className="mobile-expanded-content"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="mobile-expanded-art">
              {image ? (
                <img
                  src={image}
                  alt={
                    currentSong.name
                  }
                />
              ) : (
                <div>♪</div>
              )}
            </div>

            <div className="mobile-expanded-info">
              <h2>
                {currentSong.name}
              </h2>

              <p>
                {artist}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* =================================================
          QUEUE PANEL
      ================================================= */}

      {showQueue && (
        <div
          className="player-queue-panel"
          onClick={(e) =>
            e.stopPropagation()
          }
        >
          {/* QUEUE HEADER */}

          <div className="player-queue-header">
            <div>
              <h3>
                Playing Queue
              </h3>

              <span>
                {queue.length}{" "}
                {queue.length === 1
                  ? "song"
                  : "songs"}
              </span>
            </div>

            <button
              type="button"
              className="queue-close-btn"
              onClick={() =>
                setShowQueue(false)
              }
              title="Close queue"
              aria-label="Close queue"
            >
              <X size={18} />
            </button>
          </div>

          {/* QUEUE CONTENT */}

          <div className="player-queue-list">
            {queue.length === 0 ? (
              <div className="player-queue-empty">
                <ListMusic
                  size={32}
                />

                <h4>
                  Queue is empty
                </h4>

                <p>
                  Songs you play will
                  appear here.
                </p>
              </div>
            ) : (
              <>
                {/* NOW PLAYING */}

                {currentSong && (
                  <>
                    <div className="player-queue-section-title">
                      Now Playing
                    </div>

                    <button
                      type="button"
                      className="player-queue-item current"
                      onClick={() =>
                        handleQueueSong(
                          currentSong
                        )
                      }
                    >
                      <div className="queue-item-image">
                        {getImage(
                          currentSong
                        ) ? (
                          <img
                            src={getImage(
                              currentSong
                            )}
                            alt={
                              currentSong.name
                            }
                          />
                        ) : (
                          <span>
                            ♪
                          </span>
                        )}
                      </div>

                      <div className="queue-item-info">
                        <strong>
                          {
                            currentSong.name
                          }
                        </strong>

                        <span>
                          {getArtist(
                            currentSong
                          )}
                        </span>

                        <small>
                          ● Playing
                        </small>
                      </div>
                    </button>

                    {orderedQueue.length >
                      0 && (
                      <div className="player-queue-section-title">
                        Next Up
                      </div>
                    )}
                  </>
                )}

                {/* =================================================
                    CIRCULAR NEXT QUEUE

                    If:
                    A B C D E

                    and B is playing:

                    C D E A
                ================================================= */}

                {orderedQueue.map(
                  (
                    song: any,
                    index: number
                  ) => (
                    <button
                      key={
                        song.id ||
                        index
                      }
                      type="button"
                      className="player-queue-item"
                      onClick={() =>
                        handleQueueSong(
                          song
                        )
                      }
                    >
                      <div className="queue-item-image">
                        {getImage(
                          song
                        ) ? (
                          <img
                            src={getImage(
                              song
                            )}
                            alt={
                              song.name
                            }
                          />
                        ) : (
                          <span>
                            ♪
                          </span>
                        )}
                      </div>

                      <div className="queue-item-info">
                        <strong>
                          {song.name}
                        </strong>

                        <span>
                          {getArtist(
                            song
                          )}
                        </span>
                      </div>
                    </button>
                  )
                )}

                {orderedQueue.length ===
                  0 && (
                  <div className="player-queue-no-more">
                    No more songs in queue
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
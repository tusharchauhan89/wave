import "./Player.css";

import {
  Heart,
  Shuffle,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  Repeat,
  ListMusic,
  Laptop2,
  Volume2,
  X,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import { usePlayer } from "../../../context/PlayerContext";

import {
  likeSong,
  unlikeSong,
  getLikedSongs,
} from "../../../services/music";

type PlayerProps = {
  showQueue: boolean;
  setShowQueue: React.Dispatch<
    React.SetStateAction<boolean>
  >;
};

function formatTime(seconds: number) {
  if (!seconds || Number.isNaN(seconds)) {
    return "0:00";
  }

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${mins}:${secs
    .toString()
    .padStart(2, "0")}`;
}

function Player({
  showQueue,
  setShowQueue,
}: PlayerProps) {
  const {
    currentSong,
    queue,
    currentIndex,

    isPlaying,

    progress,
    duration,

    volume,

    shuffle,
    repeat,

    play,
    pause,

    next,
    previous,

    seek,

    setVolume,

    toggleShuffle,
    cycleRepeat,

    playSong,
  } = usePlayer();

  const [
    likedSongs,
    setLikedSongs,
  ] = useState<string[]>([]);

  useEffect(() => {
    const loadLikedSongs =
      async () => {
        try {
          const response =
            await getLikedSongs();

          const songs =
            response?.songs ??
            response?.data ??
            [];

          setLikedSongs(
            songs.map(
              (song: any) =>
                String(song.id)
            )
          );
        } catch (error) {
          console.error(
            "Failed to load liked songs",
            error
          );
        }
      };

    loadLikedSongs();
  }, []);

  const handleLike =
    async () => {
      if (!currentSong) return;

      try {
        if (
          likedSongs.includes(
            currentSong.id
          )
        ) {
          await unlikeSong(
            currentSong.id
          );

          setLikedSongs(
            (prev) =>
              prev.filter(
                (id) =>
                  id !==
                  currentSong.id
              )
          );
        } else {
          await likeSong(
            currentSong
          );

          setLikedSongs(
            (prev) => [
              ...prev,
              currentSong.id,
            ]
          );
        }
      } catch (error) {
        console.error(error);
      }
    };

  const image =
    currentSong?.image?.[2]?.url ||
    currentSong?.image?.[1]?.url ||
    currentSong?.image?.[0]?.url ||
    "";

  const artist =
    currentSong?.artists?.primary
      ?.map(
        (artist) =>
          artist.name
      )
      .join(", ") ||
    "Unknown Artist";

  return (
    <>
      <footer className="player">

        {/* LEFT */}

        <div className="player-left">

          <img
            src={image}
            alt={
              currentSong?.name || ""
            }
            className="player-cover"
          />

          <div className="player-song">

            <h4>
              {currentSong?.name ??
                "Nothing Playing"}
            </h4>

            <p>{artist}</p>

          </div>

          <button
            className={`icon-button ${
              likedSongs.includes(
                currentSong?.id || ""
              )
                ? "active"
                : ""
            }`}
            onClick={handleLike}
          >
            <Heart
              size={18}
              fill={
                likedSongs.includes(
                  currentSong?.id || ""
                )
                  ? "#1DB954"
                  : "none"
              }
            />
          </button>

        </div>

        {/* CENTER */}

        <div className="player-center">

          <div className="player-controls">

            <button
              className={`icon-button ${
                shuffle
                  ? "active"
                  : ""
              }`}
              onClick={
                toggleShuffle
              }
            >
              <Shuffle size={18} />
            </button>

            <button
              className="icon-button"
              onClick={previous}
            >
              <SkipBack size={20} />
            </button>

            <button
              className="play-button-main"
              onClick={() =>
                isPlaying
                  ? pause()
                  : play()
              }
            >
              {isPlaying ? (
                <Pause
                  size={20}
                  fill="black"
                />
              ) : (
                <Play
                  size={20}
                  fill="black"
                />
              )}
            </button>

            <button
              className="icon-button"
              onClick={next}
            >
              <SkipForward size={20} />
            </button>
                        <button
              className={`icon-button ${
                repeat !== "off"
                  ? "active"
                  : ""
              }`}
              onClick={cycleRepeat}
            >
              <div className="repeat-icon">
                <Repeat size={18} />

                {repeat === "one" && (
                  <span className="repeat-badge">
                    1
                  </span>
                )}
              </div>
            </button>

          </div>

          <div className="progress-row">

            <span>
              {formatTime(progress)}
            </span>

            <input
              type="range"
              className="progress-bar"
              min={0}
              max={duration || 0}
              value={progress}
              onChange={(e) =>
                seek(
                  Number(
                    e.target.value
                  )
                )
              }
            />

            <span>
              {formatTime(duration)}
            </span>

          </div>

        </div>

        {/* RIGHT */}

        <div className="player-right">

          <button
            className={`icon-button ${
              showQueue
                ? "active"
                : ""
            }`}
            onClick={() =>
              setShowQueue(
                (prev) => !prev
              )
            }
          >
            <ListMusic size={18} />
          </button>

          <button className="icon-button">
            <Laptop2 size={18} />
          </button>

          <Volume2 size={18} />

          <input
            type="range"
            min={0}
            max={100}
            value={volume * 100}
            className="volume-slider"
            onChange={(e) =>
              setVolume(
                Number(
                  e.target.value
                ) / 100
              )
            }
          />

        </div>

      </footer>

      {/* QUEUE */}

      {showQueue && (

        <div className="queue-panel">

          <div className="queue-header">

            <h3>
              Playing Queue
            </h3>

            <button
              className="icon-button"
              onClick={() =>
                setShowQueue(
                  false
                )
              }
            >
              <X size={18} />
            </button>

          </div>

          <div className="queue-list">

            {queue.length === 0 ? (

              <p>
                No songs in queue.
              </p>

            ) : (

              <>

                {currentSong && (

                  <>

                    <div className="queue-section-title">
                      Now Playing
                    </div>

                    <div
                      className="queue-item active"
                      onClick={() =>
                        playSong(
                          currentSong,
                          queue
                        )
                      }
                    >

                      <img
                        src={
                          currentSong.image?.[2]?.url ||
                          currentSong.image?.[1]?.url ||
                          currentSong.image?.[0]?.url ||
                          ""
                        }
                        alt={currentSong.name}
                      />

                      <div className="queue-song-info">

                        <strong>
                          {currentSong.name}
                        </strong>

                        <p>
                          {currentSong
                            .artists
                            ?.primary
                            ?.map(
                              (artist) =>
                                artist.name
                            )
                            .join(", ")}
                        </p>

                        <span className="now-playing">
                          ● Playing
                        </span>

                      </div>

                    </div>

                    <div className="queue-section-title">
                      Next Up
                    </div>

                  </>

                )}

                {[
                  ...queue.slice(
                    currentIndex + 1
                  ),
                  ...queue.slice(
                    0,
                    currentIndex
                  ),
                ].map((song) => (
                                      <div
                    key={song.id}
                    className={`queue-item ${
                      currentSong?.id ===
                      song.id
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      playSong(
                        song,
                        queue
                      )
                    }
                  >

                    <img
                      src={
                        song.image?.[2]
                          ?.url ||
                        song.image?.[1]
                          ?.url ||
                        song.image?.[0]
                          ?.url ||
                        ""
                      }
                      alt={song.name}
                    />

                    <div className="queue-song-info">

                      <strong>
                        {song.name}
                      </strong>

                      <p>
                        {song
                          .artists
                          ?.primary
                          ?.map(
                            (
                              artist
                            ) =>
                              artist.name
                          )
                          .join(", ")}
                      </p>

                    </div>

                  </div>

                ))}

              </>

            )}

          </div>

        </div>

      )}
          </>
  );
}

export default Player;
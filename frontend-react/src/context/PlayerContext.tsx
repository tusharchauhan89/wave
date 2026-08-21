import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { getSong, getBestStreamUrl, addHistory } from "../services/music";
export interface SongImage {
  quality: string;
  url: string;
}

export interface DownloadUrl {
  quality: string;
  url: string;
}

export interface Artist {
  id?: string;
  name: string;
}

export interface Song {
  id: string;
  name: string;
  duration?: number;

  image?: SongImage[];

  downloadUrl?: DownloadUrl[];

  artists?: {
    primary?: Artist[];
  };

  album?: {
    id?: string;
    name?: string;
  };

  language?: string;

  [key: string]: unknown;
}

export type RepeatMode = "off" | "all" | "one";

interface PlayerContextValue {
  audio: HTMLAudioElement | null;

  queue: Song[];
  currentSong: Song | null;
  currentIndex: number;

  isPlaying: boolean;
  isLoading: boolean;
  isMuted: boolean;

  shuffle: boolean;
  repeat: RepeatMode;

  volume: number;
 progress: number;
  duration: number;
  buffered: number;
  playbackRate: number;

  play: () => Promise<void>;
  pause: () => void;
  togglePlay: () => Promise<void>;

  playSong: (
    song: Song,
    queue?: Song[],
    autoplay?: boolean
  ) => Promise<void>;

  playQueue: (
    queue: Song[],
    startIndex?: number
  ) => Promise<void>;

  next: () => Promise<void>;
  previous: () => Promise<void>;

  seek: (time: number) => void;

  setVolume: (value: number) => void;
  toggleMute: () => void;

  setPlaybackRate: (
    value: number
  ) => void;

  toggleShuffle: () => void;
  cycleRepeat: () => void;

  clearQueue: () => void;

  removeFromQueue: (
    index: number
  ) => void;

  moveQueueItem: (
    from: number,
    to: number
  ) => void;

  addToQueue: (
    song: Song
  ) => void;

  addNext: (
    song: Song
  ) => void;
}

const PlayerContext =
  createContext<PlayerContextValue | null>(
    null
  );

const STORAGE_KEY =
  "grove-player";

interface PersistedState {
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  playbackRate: number;
}

const DEFAULT_STATE: PersistedState = {
  volume: 1,
  muted: false,
  shuffle: false,
  repeat: "off",
  playbackRate: 1,
};

const clamp = (
  value: number,
  min: number,
  max: number
) =>
  Math.min(
    max,
    Math.max(min, value)
  );

export function PlayerProvider({
  children,
}: {
  children: ReactNode;
}) {
  const audioRef =
    useRef<HTMLAudioElement | null>(
      null
    );

  if (!audioRef.current) {
    audioRef.current =
      new Audio();

    audioRef.current.preload =
      "auto";
  }

  const audio =
    audioRef.current;

  const persisted =
    useMemo<PersistedState>(() => {
      if (
        typeof window ===
        "undefined"
      ) {
        return DEFAULT_STATE;
      }

      try {
        const raw =
          localStorage.getItem(
            STORAGE_KEY
          );

        if (!raw) {
          return DEFAULT_STATE;
        }

        return {
          ...DEFAULT_STATE,
          ...JSON.parse(raw),
        };
      } catch {
        return DEFAULT_STATE;
      }
    }, []);

  const [queue, setQueue] =
    useState<Song[]>([]);

  const [
    currentIndex,
    setCurrentIndex,
  ] = useState(-1);

  const [
    isPlaying,
    setIsPlaying,
  ] = useState(false);

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);

  const [
    progress,
    setProgress,
  ] = useState(0);

  const [
    duration,
    setDuration,
  ] = useState(0);

  const [
    buffered,
    setBuffered,
  ] = useState(0);

  const [
    volume,
    setVolumeState,
  ] = useState(
    persisted.volume
  );

  const [
    isMuted,
    setMuted,
  ] = useState(
    persisted.muted
  );

  const [
    shuffle,
    setShuffle,
  ] = useState(
    persisted.shuffle
  );

  const [
    repeat,
    setRepeat,
  ] =
    useState<RepeatMode>(
      persisted.repeat
    );

  const [
    playbackRate,
    setPlaybackRateState,
  ] = useState(
    persisted.playbackRate
  );

  const currentSong =
    currentIndex >= 0
      ? queue[currentIndex] ??
        null
      : null;

  const shuffledHistory =
    useRef<number[]>([]);

  useEffect(() => {
    audio.volume = volume;
    audio.muted = isMuted;
    audio.playbackRate =
      playbackRate;
  }, [
    audio,
    volume,
    isMuted,
    playbackRate,
  ]);

  useEffect(() => {
    if (
      typeof window ===
      "undefined"
    ) {
      return;
    }

    const state: PersistedState =
      {
        volume,
        muted: isMuted,
        shuffle,
        repeat,
        playbackRate,
      };

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(state)
    );
  }, [
    volume,
    isMuted,
    shuffle,
    repeat,
    playbackRate,
  ]);

const loadSong = useCallback(async (song: Song) => {
  let streamUrl = getBestStreamUrl(song);

  if (!streamUrl && song.id) {
    try {
      const full = await getSong(song.id);
      streamUrl = getBestStreamUrl(full);
      if (full.downloadUrl) song.downloadUrl = full.downloadUrl;
      if (full.image) song.image = full.image;
      if (full.artists) song.artists = full.artists;
      if (full.name) song.name = full.name;
    } catch (err) {
      console.error("Failed to resolve stream URL", err);
    }
  }

  if (!streamUrl) throw new Error("Audio stream URL not found.");

  if (audio.src !== streamUrl) {
    audio.pause();
    audio.src = streamUrl;
    audio.load();
    setProgress(0);
    setDuration(0);
    setBuffered(0);
  }

  void addHistory(song);
}, [audio]);

  const play =
    useCallback(
      async () => {
        try {
          setIsLoading(true);

          await audio.play();

          setIsPlaying(
            true
          );
        } finally {
          setIsLoading(
            false
          );
        }
      },
      [audio]
    );

  const pause =
    useCallback(() => {
      audio.pause();

      setIsPlaying(
        false
      );
    }, [audio]);

  const togglePlay =
    useCallback(
      async () => {
        if (isPlaying) {
          pause();
          return;
        }

        await play();
      },
      [
        isPlaying,
        pause,
        play,
      ]
    );
  const playSong = useCallback(
   async (
    song: Song,
    songsQueue?: Song[],
    autoplay = true
  ) => {
    let index = 0;

    if (songsQueue && songsQueue.length > 0) {
      // Album / Playlist se play → di hui queue use karo
      setQueue(songsQueue);
      index = songsQueue.findIndex((item) => item.id === song.id);
      if (index === -1) index = 0;
      setCurrentIndex(index);
    } else {
      // Search se single song → sirf yeh song queue mein rakho
      setQueue([song]);
      setCurrentIndex(0);
      index = 0;
    }

    await loadSong(song);
    setProgress(0);

    if (autoplay) {
      await play();
    }
  },
  [loadSong, play]
);

  const playQueue = useCallback(
    async (
      songs: Song[],
      startIndex = 0
    ) => {
      if (!songs.length) {
        return;
      }

      setQueue(songs);

      setCurrentIndex(startIndex);

      await loadSong(
        songs[startIndex]
      );

      await play();
    },
    [
      loadSong,
      play,
    ]
  );

  const getNextIndex =
    useCallback(() => {
      if (!queue.length) {
        return -1;
      }

      if (repeat === "one") {
        return currentIndex;
      }

      if (shuffle) {
        if (queue.length === 1) {
          return 0;
        }

        const available: number[] =
          [];

        for (
          let i = 0;
          i < queue.length;
          i++
        ) {
          if (
            i !== currentIndex
          ) {
            available.push(i);
          }
        }

        const random =
          available[
            Math.floor(
              Math.random() *
                available.length
            )
          ];

        shuffledHistory.current.push(
          currentIndex
        );

        return random;
      }

      const next =
        currentIndex + 1;

      if (next < queue.length) {
        return next;
      }

      if (repeat === "all") {
        return 0;
      }

      return -1;
    }, [
      currentIndex,
      queue,
      repeat,
      shuffle,
    ]);

  const getPreviousIndex =
    useCallback(() => {
      if (!queue.length) {
        return -1;
      }

      if (shuffle) {
        const previous =
          shuffledHistory.current.pop();

        if (
          previous !== undefined
        ) {
          return previous;
        }
      }

      if (currentIndex > 0) {
        return currentIndex - 1;
      }

      if (repeat === "all") {
        return (
          queue.length - 1
        );
      }

      return currentIndex;
    }, [
      currentIndex,
      queue,
      repeat,
      shuffle,
    ]);

  const next =
    useCallback(async () => {
      const nextIndex =
        getNextIndex();

      if (nextIndex === -1) {
        pause();

        audio.currentTime = 0;

        setProgress(0);

        return;
      }

      setCurrentIndex(
        nextIndex
      );

      const song =
        queue[nextIndex];

      await loadSong(song);

      await play();
    }, [
      audio,
      getNextIndex,
      loadSong,
      pause,
      play,
      queue,
    ]);

  const previous =
    useCallback(async () => {
      if (
        audio.currentTime > 5
      ) {
        audio.currentTime = 0;
        return;
      }

      const previousIndex =
        getPreviousIndex();

      if (
        previousIndex === -1
      ) {
        return;
      }

      setCurrentIndex(
        previousIndex
      );

      const song =
        queue[previousIndex];

      await loadSong(song);

      await play();
    }, [
      audio,
      getPreviousIndex,
      loadSong,
      play,
      queue,
    ]);
      const seek = useCallback(
    (time: number) => {
      audio.currentTime = clamp(
        time,
        0,
        duration || 0
      );
    },
    [
      audio,
      duration,
    ]
  );

  const setVolume =
    useCallback(
      (value: number) => {
        const nextVolume =
          clamp(
            value,
            0,
            1
          );

        setVolumeState(
          nextVolume
        );

        if (
          nextVolume > 0 &&
          isMuted
        ) {
          setMuted(false);
        }
      },
      [isMuted]
    );

  const toggleMute =
    useCallback(() => {
      setMuted(
        (prev) => !prev
      );
    }, []);

  const toggleShuffle =
    useCallback(() => {
      shuffledHistory.current =
        [];

      setShuffle(
        (prev) => !prev
      );
    }, []);

  const cycleRepeat =
    useCallback(() => {
      setRepeat(
        (prev) => {
          switch (prev) {
            case "off":
              return "all";

            case "all":
              return "one";

            default:
              return "off";
          }
        }
      );
    }, []);

  const setPlaybackRate =
    useCallback(
      (value: number) => {
        setPlaybackRateState(
          clamp(
            value,
            0.5,
            2
          )
        );
      },
      []
    );

  const addToQueue =
    useCallback(
      (song: Song) => {
        setQueue(
          (prev) => [
            ...prev,
            song,
          ]
        );
      },
      []
    );

  const addNext =
    useCallback(
      (song: Song) => {
        setQueue(
          (prev) => {
            if (
              currentIndex < 0
            ) {
              return [
                ...prev,
                song,
              ];
            }

            const copy = [
              ...prev,
            ];

            copy.splice(
              currentIndex + 1,
              0,
              song
            );

            return copy;
          }
        );
      },
      [currentIndex]
    );

  const removeFromQueue =
    useCallback(
      (index: number) => {
        setQueue(
          (prev) => {
            const copy = [
              ...prev,
            ];

            copy.splice(
              index,
              1
            );

            return copy;
          }
        );

        if (
          index <
          currentIndex
        ) {
          setCurrentIndex(
            (prev) =>
              prev - 1
          );
        } else if (
          index ===
          currentIndex
        ) {
          pause();
        }
      },
      [
        currentIndex,
        pause,
      ]
    );

  const moveQueueItem =
    useCallback(
      (
        from: number,
        to: number
      ) => {
        setQueue(
          (prev) => {
            const copy = [
              ...prev,
            ];

            const [item] =
              copy.splice(
                from,
                1
              );

            copy.splice(
              to,
              0,
              item
            );

            return copy;
          }
        );

        if (
          currentIndex ===
          from
        ) {
          setCurrentIndex(
            to
          );
        }
      },
      [currentIndex]
    );

  const clearQueue =
    useCallback(() => {
      pause();

      audio.pause();

      audio.removeAttribute(
        "src"
      );

      audio.load();

      setQueue([]);

      setCurrentIndex(-1);

      setProgress(0);

      setDuration(0);

      setBuffered(0);

      shuffledHistory.current =
        [];
    }, [
      audio,
      pause,
    ]);

  useEffect(() => {
    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleWaiting =
      () => {
        setIsLoading(true);
      };

    const handlePlaying =
      () => {
        setIsLoading(
          false
        );
      };

    const handleLoadedMetadata =
      () => {
        setDuration(
          audio.duration || 0
        );
      };

    const handleTimeUpdate =
      () => {
        setProgress(
          audio.currentTime
        );
      };

    const handleProgress =
      () => {
        try {
          if (
            audio.buffered
              .length
          ) {
            setBuffered(
              audio.buffered.end(
                audio.buffered
                  .length - 1
              )
            );
          }
        } catch {
          setBuffered(0);
        }
      };
          const handleEnded = async () => {
      await next();
    };

    audio.addEventListener(
      "play",
      handlePlay
    );

    audio.addEventListener(
      "pause",
      handlePause
    );

    audio.addEventListener(
      "waiting",
      handleWaiting
    );

    audio.addEventListener(
      "playing",
      handlePlaying
    );

    audio.addEventListener(
      "loadedmetadata",
      handleLoadedMetadata
    );

    audio.addEventListener(
      "timeupdate",
      handleTimeUpdate
    );

    audio.addEventListener(
      "progress",
      handleProgress
    );

    audio.addEventListener(
      "ended",
      handleEnded
    );

    return () => {
      audio.removeEventListener(
        "play",
        handlePlay
      );

      audio.removeEventListener(
        "pause",
        handlePause
      );

      audio.removeEventListener(
        "waiting",
        handleWaiting
      );

      audio.removeEventListener(
        "playing",
        handlePlaying
      );

      audio.removeEventListener(
        "loadedmetadata",
        handleLoadedMetadata
      );

      audio.removeEventListener(
        "timeupdate",
        handleTimeUpdate
      );

      audio.removeEventListener(
        "progress",
        handleProgress
      );

      audio.removeEventListener(
        "ended",
        handleEnded
      );
    };
  }, [
    audio,
    next,
  ]);

  const value =
    useMemo<PlayerContextValue>(
      () => ({
        audio,

        queue,
        currentSong,
        currentIndex,

        isPlaying,
        isLoading,
        isMuted,

        shuffle,
        repeat,

        volume,
        progress,
        duration,
        buffered,
        playbackRate,

        play,
        pause,
        togglePlay,

        playSong,
        playQueue,

        next,
        previous,

        seek,

        setVolume,
        toggleMute,

        setPlaybackRate,

        toggleShuffle,
        cycleRepeat,

        clearQueue,

        removeFromQueue,
        moveQueueItem,

        addToQueue,
        addNext,
      }),
      [
        audio,

        queue,
        currentSong,
        currentIndex,

        isPlaying,
        isLoading,
        isMuted,

        shuffle,
        repeat,

        volume,
        progress,
        duration,
        buffered,
        playbackRate,

        play,
        pause,
        togglePlay,

        playSong,
        playQueue,

        next,
        previous,

        seek,

        setVolume,
        toggleMute,

        setPlaybackRate,

        toggleShuffle,
        cycleRepeat,

        clearQueue,

        removeFromQueue,
        moveQueueItem,

        addToQueue,
        addNext,
      ]
    );

  return (
    <PlayerContext.Provider
      value={value}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context =
    useContext(PlayerContext);

  if (!context) {
    throw new Error(
      "usePlayer must be used within PlayerProvider"
    );
  }

  return context;
}
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

import {
  getSong,
  getBestStreamUrl,
  addHistory,
} from "../services/music";

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

export type RepeatMode =
  | "off"
  | "all"
  | "one";

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
  /* =====================================================
     AUDIO
  ===================================================== */

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

  /* =====================================================
     PERSISTED SETTINGS
  ===================================================== */

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

  /* =====================================================
     STATE
  ===================================================== */

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

  /* =====================================================
     REFS

     These always contain the latest queue/index.
  ===================================================== */

  const queueRef =
    useRef<Song[]>([]);

  const currentIndexRef =
    useRef(-1);

  const shuffledHistory =
    useRef<number[]>([]);

  useEffect(() => {
    queueRef.current =
      queue;
  }, [queue]);

  useEffect(() => {
    currentIndexRef.current =
      currentIndex;
  }, [currentIndex]);

  /* =====================================================
     AUDIO SETTINGS
  ===================================================== */

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

  /* =====================================================
     SAVE SETTINGS
  ===================================================== */

  useEffect(() => {
    if (
      typeof window ===
      "undefined"
    ) {
      return;
    }

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        volume,
        muted: isMuted,
        shuffle,
        repeat,
        playbackRate,
      })
    );
  }, [
    volume,
    isMuted,
    shuffle,
    repeat,
    playbackRate,
  ]);

  /* =====================================================
     LOAD SONG
  ===================================================== */

  const loadSong =
    useCallback(
      async (song: Song) => {
        let streamUrl =
          getBestStreamUrl(song);

        if (
          !streamUrl &&
          song.id
        ) {
          try {
            const full =
              await getSong(song.id);

            streamUrl =
              getBestStreamUrl(full);

            if (
              full.downloadUrl
            ) {
              song.downloadUrl =
                full.downloadUrl;
            }

            if (full.image) {
              song.image =
                full.image;
            }

            if (full.artists) {
              song.artists =
                full.artists;
            }

            if (full.name) {
              song.name =
                full.name;
            }
          } catch (error) {
            console.error(
              "Failed to resolve stream URL",
              error
            );
          }
        }

        if (!streamUrl) {
          throw new Error(
            "Audio stream URL not found."
          );
        }

        /*
         * Force the exact selected
         * stream into the audio element.
         */

        if (
          audio.src !== streamUrl
        ) {
          audio.pause();

          audio.src =
            streamUrl;

          audio.load();

          setProgress(0);
          setDuration(0);
          setBuffered(0);
        }

        void addHistory(song);
      },
      [audio]
    );

  /* =====================================================
     PLAY
  ===================================================== */

  const play =
    useCallback(
      async () => {
        try {
          setIsLoading(true);

          await audio.play();

          setIsPlaying(true);
        } finally {
          setIsLoading(false);
        }
      },
      [audio]
    );

  /* =====================================================
     PAUSE
  ===================================================== */

  const pause =
    useCallback(() => {
      audio.pause();

      setIsPlaying(false);
    }, [audio]);

  /* =====================================================
     TOGGLE PLAY
  ===================================================== */

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

  /* =====================================================
     ROTATE QUEUE

     This is the important function.

     Original:
       A B C D E

     Selected:
       B

     Result:
       B C D E A

     Selected:
       D

     Result:
       D E A B C
  ===================================================== */

  const rotateQueue =
    useCallback(
      (
        songs: Song[],
        selectedId: string
      ): Song[] => {
        if (!songs.length) {
          return [];
        }

        const selectedIndex =
          songs.findIndex(
            (song) =>
              song.id ===
              selectedId
          );

        if (
          selectedIndex === -1
        ) {
          return songs;
        }

        return [
          ...songs.slice(
            selectedIndex
          ),
          ...songs.slice(
            0,
            selectedIndex
          ),
        ];
      },
      []
    );

  /* =====================================================
     PLAY SONG

     IMPORTANT:

     Whenever the user manually selects
     a song, that song becomes position 0.

     This means the queue itself becomes:

       B C D E A

     instead of:

       A B C D E
  ===================================================== */

  const playSong =
    useCallback(
      async (
        song: Song,
        songsQueue?: Song[],
        autoplay = true
      ) => {
        let sourceQueue =
          songsQueue
            ? [...songsQueue]
            : [...queueRef.current];

        /*
         * If there is no existing queue,
         * create one containing the song.
         */

        if (
          !sourceQueue.length
        ) {
          sourceQueue = [
            song,
          ];
        }

        /*
         * Make the clicked song
         * the FIRST item.
         */

        const rotatedQueue =
          rotateQueue(
            sourceQueue,
            song.id
          );

        /*
         * If the clicked song wasn't
         * found, keep it in queue.
         */

        const finalQueue =
          rotatedQueue.some(
            (item) =>
              item.id ===
              song.id
          )
            ? rotatedQueue
            : [
                song,
                ...rotatedQueue,
              ];

        /*
         * CURRENT SONG IS ALWAYS INDEX 0
         */

        const newIndex = 0;

        /*
         * Update refs immediately.
         */

        queueRef.current =
          finalQueue;

        currentIndexRef.current =
          newIndex;

        /*
         * Update React state.
         */

        setQueue(
          finalQueue
        );

        setCurrentIndex(
          newIndex
        );

        shuffledHistory.current =
          [];

        /*
         * Play the EXACT selected
         * song object.
         */

        await loadSong(
          finalQueue[0]
        );

        setProgress(0);

        if (autoplay) {
          await play();
        }
      },
      [
        rotateQueue,
        loadSong,
        play,
      ]
    );

  /* =====================================================
     PLAY QUEUE

     startIndex song becomes index 0
     and the rest follows circularly.
  ===================================================== */

  const playQueue =
    useCallback(
      async (
        songs: Song[],
        startIndex = 0
      ) => {
        if (!songs.length) {
          return;
        }

        const safeIndex =
          clamp(
            startIndex,
            0,
            songs.length - 1
          );

        const selected =
          songs[safeIndex];

        const rotatedQueue =
          rotateQueue(
            songs,
            selected.id
          );

        queueRef.current =
          rotatedQueue;

        currentIndexRef.current =
          0;

        setQueue(
          rotatedQueue
        );

        setCurrentIndex(0);

        shuffledHistory.current =
          [];

        await loadSong(
          rotatedQueue[0]
        );

        await play();
      },
      [
        rotateQueue,
        loadSong,
        play,
      ]
    );

  /* =====================================================
     NEXT

     NOW THIS IS EXTREMELY SIMPLE.

     Queue:
       B C D E A

     currentIndex:
       0

     Next:
       queue[1] = C

     After C:

       C D E A B

     currentIndex:
       0

     Next:
       D
  ===================================================== */

  const next =
    useCallback(
      async () => {
        const activeQueue =
          queueRef.current;

        if (
          !activeQueue.length
        ) {
          return;
        }

        const activeIndex =
          currentIndexRef.current;

        /*
         * Repeat One
         */

        if (
          repeat === "one"
        ) {
          await loadSong(
            activeQueue[
              activeIndex
            ]
          );

          await play();

          return;
        }

        /*
         * Shuffle
         */

        if (shuffle) {
          if (
            activeQueue.length ===
            1
          ) {
            return;
          }

          const available =
            activeQueue
              .map(
                (_, index) =>
                  index
              )
              .filter(
                (index) =>
                  index !==
                  activeIndex
              );

          const randomIndex =
            Math.floor(
              Math.random() *
                available.length
            );

          const selectedIndex =
            available[
              randomIndex
            ];

          shuffledHistory.current.push(
            activeIndex
          );

          const shuffledSong =
            activeQueue[
              selectedIndex
            ];

          /*
           * Rotate the queue around
           * the newly selected song.
           */

          const rotatedQueue =
            rotateQueue(
              activeQueue,
              shuffledSong.id
            );

          queueRef.current =
            rotatedQueue;

          currentIndexRef.current =
            0;

          setQueue(
            rotatedQueue
          );

          setCurrentIndex(0);

          await loadSong(
            rotatedQueue[0]
          );

          await play();

          return;
        }

        /*
         * NORMAL NEXT
         *
         * Because the current song
         * is ALWAYS index 0:
         *
         * next = index 1
         */

        if (
          activeQueue.length === 1
        ) {
          await loadSong(
            activeQueue[0]
          );

          await play();

          return;
        }

        const nextSong =
          activeQueue[1];

        if (!nextSong) {
          return;
        }

        /*
         * Rotate around the next song.
         *
         * Example:
         *
         * B C D E A
         *
         * Next = C
         *
         * New queue:
         *
         * C D E A B
         */

        const rotatedQueue =
          rotateQueue(
            activeQueue,
            nextSong.id
          );

        queueRef.current =
          rotatedQueue;

        currentIndexRef.current =
          0;

        setQueue(
          rotatedQueue
        );

        setCurrentIndex(0);

        await loadSong(
          rotatedQueue[0]
        );

        setProgress(0);

        await play();
      },
      [
        repeat,
        shuffle,
        rotateQueue,
        loadSong,
        play,
      ]
    );

  /* =====================================================
     PREVIOUS

     Current:
       C D E A B

     Previous:
       B

     New queue:
       B C D E A
  ===================================================== */

  const previous =
    useCallback(
      async () => {
        if (
          audio.currentTime > 5
        ) {
          audio.currentTime = 0;

          return;
        }

        const activeQueue =
          queueRef.current;

        if (
          !activeQueue.length
        ) {
          return;
        }

        /*
         * Shuffle history
         */

        if (shuffle) {
          const previousIndex =
            shuffledHistory.current.pop();

          if (
            previousIndex !==
            undefined
          ) {
            const previousSong =
              activeQueue[
                previousIndex
              ];

            const rotatedQueue =
              rotateQueue(
                activeQueue,
                previousSong.id
              );

            queueRef.current =
              rotatedQueue;

            currentIndexRef.current =
              0;

            setQueue(
              rotatedQueue
            );

            setCurrentIndex(0);

            await loadSong(
              rotatedQueue[0]
            );

            await play();

            return;
          }
        }

        /*
         * Because current song is index 0,
         * previous is the LAST song.
         */

        const previousSong =
          activeQueue[
            activeQueue.length - 1
          ];

        if (!previousSong) {
          return;
        }

        const rotatedQueue =
          rotateQueue(
            activeQueue,
            previousSong.id
          );

        queueRef.current =
          rotatedQueue;

        currentIndexRef.current =
          0;

        setQueue(
          rotatedQueue
        );

        setCurrentIndex(0);

        await loadSong(
          rotatedQueue[0]
        );

        setProgress(0);

        await play();
      },
      [
        audio,
        shuffle,
        rotateQueue,
        loadSong,
        play,
      ]
    );

  /* =====================================================
     SEEK
  ===================================================== */

  const seek =
    useCallback(
      (time: number) => {
        audio.currentTime =
          clamp(
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

  /* =====================================================
     VOLUME
  ===================================================== */

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
        (previous) =>
          !previous
      );
    }, []);

  /* =====================================================
     SHUFFLE
  ===================================================== */

  const toggleShuffle =
    useCallback(() => {
      shuffledHistory.current =
        [];

      setShuffle(
        (previous) =>
          !previous
      );
    }, []);

  /* =====================================================
     REPEAT
  ===================================================== */

  const cycleRepeat =
    useCallback(() => {
      setRepeat(
        (previous) => {
          if (
            previous ===
            "off"
          ) {
            return "all";
          }

          if (
            previous ===
            "all"
          ) {
            return "one";
          }

          return "off";
        }
      );
    }, []);

  /* =====================================================
     PLAYBACK RATE
  ===================================================== */

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

  /* =====================================================
     ADD TO QUEUE
  ===================================================== */

  const addToQueue =
    useCallback(
      (song: Song) => {
        setQueue(
          (previous) => {
            const updated = [
              ...previous,
              song,
            ];

            queueRef.current =
              updated;

            return updated;
          }
        );
      },
      []
    );

  /* =====================================================
     ADD NEXT
  ===================================================== */

  const addNext =
    useCallback(
      (song: Song) => {
        setQueue(
          (previous) => {
            const updated = [
              ...previous,
            ];

            const index =
              currentIndexRef.current;

            if (
              index < 0
            ) {
              updated.push(song);
            } else {
              updated.splice(
                index + 1,
                0,
                song
              );
            }

            queueRef.current =
              updated;

            return updated;
          }
        );
      },
      []
    );

  /* =====================================================
     REMOVE FROM QUEUE
  ===================================================== */

  const removeFromQueue =
    useCallback(
      (index: number) => {
        setQueue(
          (previous) => {
            const updated = [
              ...previous,
            ];

            if (
              index >= 0 &&
              index <
                updated.length
            ) {
              updated.splice(
                index,
                1
              );
            }

            queueRef.current =
              updated;

            return updated;
          }
        );

        const activeIndex =
          currentIndexRef.current;

        if (
          index <
          activeIndex
        ) {
          const newIndex =
            activeIndex - 1;

          currentIndexRef.current =
            newIndex;

          setCurrentIndex(
            newIndex
          );
        }
      },
      []
    );

  /* =====================================================
     MOVE QUEUE ITEM
  ===================================================== */

  const moveQueueItem =
    useCallback(
      (
        from: number,
        to: number
      ) => {
        setQueue(
          (previous) => {
            const updated = [
              ...previous,
            ];

            if (
              from < 0 ||
              from >=
                updated.length ||
              to < 0 ||
              to >=
                updated.length
            ) {
              return previous;
            }

            const [item] =
              updated.splice(
                from,
                1
              );

            updated.splice(
              to,
              0,
              item
            );

            queueRef.current =
              updated;

            return updated;
          }
        );

        if (
          currentIndexRef.current ===
          from
        ) {
          currentIndexRef.current =
            to;

          setCurrentIndex(to);
        }
      },
      []
    );

  /* =====================================================
     CLEAR QUEUE
  ===================================================== */

  const clearQueue =
    useCallback(() => {
      audio.pause();

      audio.removeAttribute(
        "src"
      );

      audio.load();

      queueRef.current =
        [];

      currentIndexRef.current =
        -1;

      setQueue([]);

      setCurrentIndex(-1);

      setIsPlaying(false);

      setProgress(0);

      setDuration(0);

      setBuffered(0);

      shuffledHistory.current =
        [];
    }, [audio]);

  /* =====================================================
     AUDIO EVENTS
  ===================================================== */

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
        setIsLoading(false);
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
            audio.buffered.length
          ) {
            setBuffered(
              audio.buffered.end(
                audio.buffered.length -
                  1
              )
            );
          }
        } catch {
          setBuffered(0);
        }
      };

    const handleEnded =
      async () => {
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

  /* =====================================================
     CONTEXT VALUE
  ===================================================== */

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
import "./Topbar.css";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  ChevronLeft,
  ChevronRight,
  Search,
  Mic,
  Bell,
  ChevronDown,
  Home,
  Trophy,
  Clock,
  Star,
  X,
} from "lucide-react";

import {
  getDisplayName,
  isLoggedIn,
} from "../../../services/auth";


/* =========================================================
   SPEECH RECOGNITION TYPES
========================================================= */

interface SpeechResultItem {
  transcript: string;
}

interface SpeechResult {
  [index: number]: SpeechResultItem;
}

interface SpeechRecognitionEventLike extends Event {
  results: {
    [index: number]: SpeechResult;
    length: number;
  };
}

interface SpeechRecognitionErrorEventLike
  extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;

  start: () => void;
  stop: () => void;
  abort: () => void;

  onstart:
    | (() => void)
    | null;

  onend:
    | (() => void)
    | null;

  onresult:
    | ((
        event: SpeechRecognitionEventLike
      ) => void)
    | null;

  onerror:
    | ((
        event: SpeechRecognitionErrorEventLike
      ) => void)
    | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionLike;
}

interface SpeechWindow extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;

  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}


/* =========================================================
   NOTIFICATION TYPE
========================================================= */

interface NotificationItem {
  id: number;

  type:
    | "general"
    | "premium";

  title: string;

  message: string;

  time: string;

  read: boolean;
}


/* =========================================================
   TOPBAR
========================================================= */

function Topbar() {

  const navigate =
    useNavigate();


  /* =====================================================
     SEARCH
  ===================================================== */

  const [query, setQuery] =
    useState("");


  /* =====================================================
     VOICE
  ===================================================== */

  const [listening, setListening] =
    useState(false);

  const [voiceStatus, setVoiceStatus] =
    useState("");


  /* =====================================================
     NOTIFICATIONS
  ===================================================== */

  const [showNotifications, setShowNotifications] =
    useState(false);

  const [notifications, setNotifications] =
    useState<NotificationItem[]>([
      {
        id: 1,

        type: "general",

        title: "Welcome to Grove",

        message:
          "Start listening to your favorite music.",

        time: "Just now",

        read: false,
      },

      {
        id: 2,

        type: "premium",

        title: "Premium Progress",

        message:
          "Keep listening to unlock Grove Premium.",

        time: "Today",

        read: false,
      },
    ]);


  /* =====================================================
     NOTIFICATION DROPDOWN REF
  ===================================================== */

  const dropdownRef =
    useRef<HTMLDivElement | null>(
      null
    );


  /* =====================================================
     PREMIUM PROGRESS
  ===================================================== */

  /*
   * Grove Premium unlock threshold:
   * 60 minutes listening time.
   *
   * This currently uses localStorage so the
   * notification UI works without requiring
   * another backend endpoint.
   */

  const [listeningMinutes, setListeningMinutes] =
    useState(0);

  const premiumThreshold =
    60;

  const isPremium =
    listeningMinutes >=
    premiumThreshold;

  const minutesLeft =
    Math.max(
      premiumThreshold -
        listeningMinutes,
      0
    );

  const progressPercent =
    Math.min(
      (
        listeningMinutes /
        premiumThreshold
      ) * 100,
      100
    );


  /* =====================================================
     RECOGNITION REFS
  ===================================================== */

  const recognitionRef =
    useRef<SpeechRecognitionLike | null>(
      null
    );

  const shouldListenRef =
    useRef(false);

  const transcriptRef =
    useRef("");


  /* =====================================================
     UNREAD COUNT
  ===================================================== */

  const unreadCount =
    notifications.filter(
      (notification) =>
        !notification.read
    ).length;


  /* =====================================================
     LOAD LISTENING PROGRESS
  ===================================================== */

  useEffect(() => {

    const stored =
      localStorage.getItem(
        "grove_listening_minutes"
      );

    if (stored) {

      const value =
        Number(stored);

      if (
        Number.isFinite(value) &&
        value >= 0
      ) {

        setListeningMinutes(
          value
        );

      }

    }

  }, []);


  /* =====================================================
     SAVE PREMIUM STATUS
  ===================================================== */

  useEffect(() => {

    if (isPremium) {

      const alreadyShown =
        localStorage.getItem(
          "grove_premium_notification"
        );

      if (
        alreadyShown !== "true"
      ) {

        setNotifications(
          (previous) => [

            {
              id:
                Date.now(),

              type:
                "premium",

              title:
                "Premium Unlocked 🎉",

              message:
                "You've reached 1 hour of listening time.",

              time:
                "Just now",

              read:
                false,
            },

            ...previous,

          ]
        );

        localStorage.setItem(
          "grove_premium_notification",
          "true"
        );

      }

    }

  }, [isPremium]);


  /* =====================================================
     CLOSE NOTIFICATION ON OUTSIDE CLICK
  ===================================================== */

  useEffect(() => {

    const handleOutsideClick =
      (event: MouseEvent) => {

        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(
            event.target as Node
          )
        ) {

          setShowNotifications(
            false
          );

        }

      };


    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );


    return () => {

      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );

    };

  }, []);


  /* =====================================================
     MARK ALL READ
  ===================================================== */

  const markAllRead = () => {

    setNotifications(
      (previous) =>
        previous.map(
          (notification) => ({
            ...notification,
            read: true,
          })
        )
    );

  };


  /* =====================================================
     REMOVE NOTIFICATION
  ===================================================== */

  const removeNotification =
    (id: number) => {

      setNotifications(
        (previous) =>
          previous.filter(
            (notification) =>
              notification.id !== id
          )
      );

    };


  /* =====================================================
     INITIALIZE SPEECH RECOGNITION
  ===================================================== */

  useEffect(() => {

    const speechWindow =
      window as SpeechWindow;

    const SpeechRecognition =
      speechWindow.webkitSpeechRecognition ||
      speechWindow.SpeechRecognition;


    if (!SpeechRecognition) {

      setVoiceStatus(
        "Voice search is not supported in this browser"
      );

      return;

    }


    const recognition =
      new SpeechRecognition();


    /* ===================================================
       SETTINGS
    =================================================== */

    recognition.continuous =
      true;

    recognition.interimResults =
      true;

    recognition.lang =
      "en-IN";

    recognition.maxAlternatives =
      1;


    /* ===================================================
       START
    =================================================== */

    recognition.onstart =
      () => {

        setListening(
          true
        );

        setVoiceStatus(
          "Listening... speak now"
        );

      };


    /* ===================================================
       RESULTS
    =================================================== */

    recognition.onresult =
      (
        event
      ) => {

        let finalText =
          "";

        for (
          let i = 0;
          i <
          event.results.length;
          i++
        ) {

          const result =
            event.results[i];

          const text =
            result[0]?.transcript ||
            "";

          if (
            text.trim()
          ) {

            finalText +=
              text + " ";

          }

        }


        const transcript =
          finalText.trim();


        if (!transcript) {
          return;
        }


        transcriptRef.current =
          transcript;


        setQuery(
          transcript
        );


        setVoiceStatus(
          `Heard: ${transcript}`
        );

      };


    /* ===================================================
       ERROR
    =================================================== */

    recognition.onerror =
      (
        event
      ) => {

        console.error(
          "Speech recognition error:",
          event.error,
          event.message
        );


        if (
          event.error ===
          "no-speech"
        ) {

          if (
            shouldListenRef.current
          ) {

            setVoiceStatus(
              "Still listening... please speak"
            );

            return;

          }

        }


        if (
          event.error ===
          "not-allowed"
        ) {

          shouldListenRef.current =
            false;

          setListening(
            false
          );

          setVoiceStatus(
            "Microphone permission denied"
          );

          return;

        }


        if (
          event.error ===
          "audio-capture"
        ) {

          shouldListenRef.current =
            false;

          setListening(
            false
          );

          setVoiceStatus(
            "Microphone is not available"
          );

          return;

        }


        if (
          event.error ===
          "network"
        ) {

          shouldListenRef.current =
            false;

          setListening(
            false
          );

          setVoiceStatus(
            "Speech recognition network error"
          );

          return;

        }


        shouldListenRef.current =
          false;

        setListening(
          false
        );

        setVoiceStatus(
          "Voice search failed"
        );

      };


    /* ===================================================
       END
    =================================================== */

    recognition.onend =
      () => {

        if (
          shouldListenRef.current
        ) {

          setTimeout(
            () => {

              if (
                shouldListenRef.current &&
                recognitionRef.current
              ) {

                try {

                  recognitionRef.current.start();

                } catch {

                  // Already running.

                }

              }

            },
            250
          );

          return;

        }


        setListening(
          false
        );


        const finalTranscript =
          transcriptRef.current.trim();


        if (
          finalTranscript
        ) {

          navigate(
            `/search?q=${encodeURIComponent(
              finalTranscript
            )}`
          );


          transcriptRef.current =
            "";

          setVoiceStatus(
            ""
          );

        }

      };


    recognitionRef.current =
      recognition;


    /* ===================================================
       CLEANUP
    =================================================== */

    return () => {

      shouldListenRef.current =
        false;

      recognition.abort();

      recognitionRef.current =
        null;

    };

  }, [navigate]);


  /* =====================================================
     NORMAL SEARCH
  ===================================================== */

  const submitSearch = () => {

    const q =
      query.trim();


    if (!q) {
      return;
    }


    navigate(
      `/search?q=${encodeURIComponent(q)}`
    );

  };


  /* =====================================================
     VOICE SEARCH
  ===================================================== */

  const handleVoiceSearch =
    () => {

      const recognition =
        recognitionRef.current;


      if (!recognition) {

        setVoiceStatus(
          "Voice search is not supported in this browser"
        );

        return;

      }


      /* =================================================
         STOP
      ================================================= */

      if (listening) {

        shouldListenRef.current =
          false;

        recognition.stop();

        setVoiceStatus(
          "Stopping..."
        );

        return;

      }


      /* =================================================
         START
      ================================================= */

      transcriptRef.current =
        "";

      shouldListenRef.current =
        true;

      setVoiceStatus(
        "Starting microphone..."
      );


      try {

        recognition.start();

      } catch (
        error
      ) {

        console.error(
          "Speech recognition start error:",
          error
        );

        shouldListenRef.current =
          false;

        setListening(
          false
        );

        setVoiceStatus(
          "Could not start microphone"
        );

      }

    };


  /* =====================================================
     NOTIFICATION TOGGLE
  ===================================================== */

  const toggleNotifications =
    () => {

      setShowNotifications(
        (previous) =>
          !previous
      );

    };


  /* =====================================================
     RENDER
  ===================================================== */

  return (

    <header className="topbar">


      {/* =================================================
          LEFT NAVIGATION
      ================================================= */}

      <div className="topbar-left">

        <button
          className="topbar-nav-btn"
          onClick={() =>
            navigate(-1)
          }
          type="button"
          title="Go back"
          aria-label="Go back"
        >

          <ChevronLeft
            size={21}
          />

        </button>


        <button
          className="topbar-nav-btn"
          onClick={() =>
            navigate(1)
          }
          type="button"
          title="Go forward"
          aria-label="Go forward"
        >

          <ChevronRight
            size={21}
          />

        </button>


        <button
          className="topbar-home-btn"
          onClick={() =>
            navigate("/")
          }
          type="button"
          title="Home"
          aria-label="Home"
        >

          <Home
            size={20}
          />

        </button>

      </div>


      {/* =================================================
          SEARCH
      ================================================= */}

      <div className="search-container">

        <Search
          className="search-icon"
          size={21}
        />


        <input
          type="text"
          placeholder="What do you want to play?"
          value={query}
          onChange={(event) =>
            setQuery(
              event.target.value
            )
          }
          onKeyDown={(event) => {

            if (
              event.key ===
              "Enter"
            ) {

              submitSearch();

            }

          }}
        />


        {/* =================================================
            MIC
        ================================================= */}

        <button
          className={
            listening
              ? "voice-btn listening"
              : "voice-btn"
          }
          type="button"
          title={
            listening
              ? "Stop listening"
              : "Voice search"
          }
          aria-label={
            listening
              ? "Stop voice search"
              : "Voice search"
          }
          onClick={
            handleVoiceSearch
          }
        >

          <Mic
            size={19}
          />

        </button>

      </div>


      {/* =================================================
          RIGHT SIDE
      ================================================= */}

      <div className="topbar-right">


        {/* =================================================
            NOVA
        ================================================= */}

        <button
          className="premium-btn"
          type="button"
          onClick={() =>
            navigate("/nova")
          }
          title="Nova"
          aria-label="Nova"
        >

          Nova

        </button>


        {/* =================================================
            NOTIFICATIONS
        ================================================= */}

        <div
          className="notification-wrapper"
          ref={dropdownRef}
        >

          <button
            className="notification-btn"
            type="button"
            title="Notifications"
            aria-label="Notifications"
            aria-expanded={
              showNotifications
            }
            onClick={
              toggleNotifications
            }
          >

            <Bell
              size={20}
            />


            {unreadCount > 0 && (

              <span className="notification-dot">

                {unreadCount}

              </span>

            )}

          </button>


          {/* =================================================
              NOTIFICATION DROPDOWN
          ================================================= */}

          {showNotifications && (

            <div className="notification-dropdown">


              {/* HEADER */}

              <div className="notification-header">

                <h3>
                  Notifications
                </h3>


                {notifications.length >
                  0 && (

                  <button
                    type="button"
                    onClick={
                      markAllRead
                    }
                  >
                    Mark all read
                  </button>

                )}

              </div>


              {/* =================================================
                  PREMIUM MILESTONE
              ================================================= */}

              {isLoggedIn() && (

                <div
                  className={
                    `milestone-card ${
                      isPremium
                        ? "unlocked"
                        : ""
                    }`
                  }
                >

                  {isPremium ? (

                    <>

                      <div className="milestone-icon premium">

                        <Trophy
                          size={22}
                        />

                      </div>


                      <div className="milestone-content">

                        <p className="milestone-title">
                          Premium Unlocked 🎉
                        </p>

                        <p className="milestone-desc">
                          You've reached 1 hour of listening time
                        </p>

                      </div>

                    </>

                  ) : (

                    <>

                      <div className="milestone-icon">

                        <Clock
                          size={20}
                        />

                      </div>


                      <div className="milestone-content">

                        <p className="milestone-title">
                          Premium Progress
                        </p>


                        <p className="milestone-desc">

                          {listeningMinutes}
                          {" min listened • "}
                          {minutesLeft}
                          {" min left"}

                        </p>


                        <div className="progress-bar">

                          <div
                            className="progress-fill"
                            style={{
                              width:
                                `${progressPercent}%`,
                            }}
                          />

                        </div>

                      </div>

                    </>

                  )}

                </div>

              )}


              {/* =================================================
                  NOTIFICATION LIST
              ================================================= */}

              <div className="notification-list">

                {notifications.length ===
                0 ? (

                  <div className="no-notifications">

                    {isPremium
                      ? "You're a Premium User ⭐"
                      : "Keep listening to unlock Premium"}

                  </div>

                ) : (

                  notifications.map(
                    (notification) => (

                      <div
                        key={
                          notification.id
                        }
                        className={
                          `notification-item ${
                            notification.type
                          } ${
                            notification.read
                              ? "read"
                              : ""
                          }`
                        }
                      >

                        {/* ICON */}

                        <div className="notification-icon">

                          {notification.type ===
                          "premium" ? (

                            <Star
                              size={18}
                              fill="currentColor"
                            />

                          ) : (

                            <Bell
                              size={18}
                            />

                          )}

                        </div>


                        {/* CONTENT */}

                        <div className="notification-content">

                          <p className="notification-title">

                            {
                              notification.title
                            }

                          </p>


                          <p className="notification-message">

                            {
                              notification.message
                            }

                          </p>


                          <span className="notification-time">

                            {
                              notification.time
                            }

                          </span>

                        </div>


                        {/* REMOVE */}

                        <button
                          type="button"
                          className="notification-close"
                          title="Remove notification"
                          aria-label="Remove notification"
                          onClick={() =>
                            removeNotification(
                              notification.id
                            )
                          }
                        >

                          <X
                            size={14}
                          />

                        </button>

                      </div>

                    )
                  )

                )}

              </div>

            </div>

          )}

        </div>


        {/* =================================================
            PROFILE
        ================================================= */}

        <button
          className="profile-btn"
          type="button"
          onClick={() =>
            navigate(
              isLoggedIn()
                ? "/profile"
                : "/login"
            )
          }
        >

          <div className="profile-avatar">

            {getDisplayName()
              ?.charAt(0)
              ?.toUpperCase() ||
              "G"}

          </div>


          <div className="profile-info">

            <span className="profile-name">

              {getDisplayName() ||
                "Guest"}

            </span>

          </div>


          <ChevronDown
            className="profile-chevron"
            size={17}
          />

        </button>

      </div>


      {/* =================================================
          VOICE STATUS
      ================================================= */}

      {voiceStatus && (

        <div
          className={
            listening
              ? "voice-status-toast listening"
              : "voice-status-toast"
          }
        >

          {voiceStatus}

        </div>

      )}

    </header>

  );
}


export default Topbar;
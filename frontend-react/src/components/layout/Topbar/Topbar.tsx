import "./Topbar.css";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import NovaChat from "../../NovaChat/NovaChat";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Mic,
  Bell,
  ChevronDown,
  X,
  Star,
  Clock,
  Trophy,
} from "lucide-react";
import { getDisplayName, isLoggedIn } from "../../../services/auth";
import { getHistory } from "../../../services/music";
import { useVoice } from "../../../hooks/useVoice";

interface Notification {
  id: number;
  title: string;
  message: string;
  type: "premium" | "progress" | "info";
  time: string;
  read: boolean;
}

function Topbar() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const { listening, status, statusKind, toggle } = useVoice();

  const [novaOpen, setNovaOpen] = useState(false);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [listeningMinutes, setListeningMinutes] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch real listening time
  useEffect(() => {
    if (!isLoggedIn()) return;

    const fetchListeningTime = async () => {
      try {
        const hist = await getHistory();
        const totalSeconds = (hist || []).reduce(
          (acc: number, s: any) => acc + (s.duration || 0),
          0
        );
        const minutes = Math.floor(totalSeconds / 60);
        setListeningMinutes(minutes);
        setIsPremium(minutes >= 50); // 50 minutes unlock
      } catch (err) {
        console.error("Failed to fetch history", err);
      }
    };

    fetchListeningTime();

    // Refresh every 30 seconds
    const interval = setInterval(fetchListeningTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Premium unlock notification
  useEffect(() => {
    if (!isLoggedIn() || listeningMinutes < 50) return;

    const alreadyNotified = localStorage.getItem("premium_unlocked");
    if (!alreadyNotified) {
      setNotifications((prev) => [
        {
          id: Date.now(),
          title: "🎉 Premium Unlocked!",
          message: `Congratulations! You've listened for ${listeningMinutes} min and became a Premium User.`,
          type: "premium",
          time: "Just now",
          read: false,
        },
        ...prev,
      ]);
      localStorage.setItem("premium_unlocked", "true");
    }
  }, [listeningMinutes]);

  // Listen for external events (from Profile)
  useEffect(() => {
    const handleNotification = (e: any) => {
      const { title, message, type } = e.detail;
      setNotifications((prev) => [
        {
          id: Date.now(),
          title,
          message,
          type: type || "info",
          time: "Just now",
          read: false,
        },
        ...prev,
      ]);
    };

    window.addEventListener("grove-notification", handleNotification);
    return () =>
      window.removeEventListener("grove-notification", handleNotification);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const progressPercent = Math.min((listeningMinutes / 50) * 100, 100);
  const minutesLeft = Math.max(50 - listeningMinutes, 0);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const removeNotification = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const submitSearch = () => {
    const q = query.trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <header className="topbar">
      {/* Left */}
      <div className="topbar-left">
        <button
          className="circle-btn"
          onClick={() => navigate(-1)}
          type="button"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          className="circle-btn"
          onClick={() => navigate(1)}
          type="button"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Center */}
      <div className="search-container">
        <Search size={20} />
        <input
          type="text"
          placeholder="What do you want to play?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitSearch()}
        />
        <button
          className={`voice-btn ${listening ? "listening" : ""}`}
          type="button"
          onClick={toggle}
        >
          <Mic size={18} />
        </button>
      </div>

      {/* Right */}
      <div className="topbar-right">
        {/* Nova AI Button */}
        <button
          className="nova-btn"
          type="button"
          onClick={() => setNovaOpen(true)}
          title="Grove AI"
        >
          <span className="nova-icon">✦</span>
          Nova
        </button>

        <div className="notification-wrapper" ref={dropdownRef}>
          <button
            className="notification-btn"
            type="button"
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (!showNotifications) markAllRead();
            }}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="notification-dot">{unreadCount}</span>
            )}
          </button>

          {showNotifications && (
            <div className="notification-dropdown">
              <div className="notification-header">
                <h3>Notifications</h3>
                {notifications.length > 0 && (
                  <button onClick={markAllRead}>Mark all read</button>
                )}
              </div>

              {/* Milestone / Progress Card */}
              {isLoggedIn() && (
                <div
                  className={`milestone-card ${isPremium ? "unlocked" : ""}`}
                >
                  {isPremium ? (
                    <>
                      <div className="milestone-icon premium">
                        <Trophy size={22} />
                      </div>
                      <div className="milestone-content">
                        <p className="milestone-title">Premium Unlocked 🎉</p>
                        <p className="milestone-desc">
                          You've reached 50 minutes of listening time
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="milestone-icon">
                        <Clock size={20} />
                      </div>
                      <div className="milestone-content">
                        <p className="milestone-title">Premium Progress</p>
                        <p className="milestone-desc">
                          {listeningMinutes} min listened • {minutesLeft} min
                          left
                        </p>
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Notifications list */}
              <div className="notification-list">
                {notifications.length === 0 ? (
                  <div className="no-notifications">
                    {isPremium
                      ? "You're a Premium User ⭐"
                      : "Keep listening to unlock Premium"}
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`notification-item ${n.type} ${
                        n.read ? "read" : ""
                      }`}
                    >
                      <div className="notification-icon">
                        {n.type === "premium" ? (
                          <Star size={18} fill="currentColor" />
                        ) : (
                          <Bell size={18} />
                        )}
                      </div>
                      <div className="notification-content">
                        <p className="notification-title">{n.title}</p>
                        <p className="notification-message">{n.message}</p>
                        <span className="notification-time">{n.time}</span>
                      </div>
                      <button
                        className="notification-close"
                        onClick={() => removeNotification(n.id)}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button
          className="profile-btn"
          type="button"
          onClick={() => navigate(isLoggedIn() ? "/profile" : "/login")}
        >
          <div className="profile-info">
            <span
              className={`profile-name ${isPremium ? "premium-name" : ""}`}
            >
              {getDisplayName()}
            </span>
          </div>
          <ChevronDown size={18} />
        </button>
      </div>

      {status && (
        <div className={`voice-status-toast ${statusKind}`}>{status}</div>
      )}

      {/* Nova AI Panel */}
      <NovaChat open={novaOpen} onClose={() => setNovaOpen(false)} />
    </header>
  );
}

export default Topbar;
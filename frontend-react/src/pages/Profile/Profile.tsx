import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getDisplayName,
  getUser,
  isLoggedIn,
  logout,
} from "../../services/auth";
import { getLikedSongs, getHistory } from "../../services/music";
import {
  LogOut,
  Mail,
  User,
  Crown,
  Settings,
  Heart,
  Clock,
  History,
  Star,
} from "lucide-react";
import groveLogo from "../../assets/image.png";
import "./Profile.css";

function Profile() {
  const navigate = useNavigate();
  const user = getUser();

  const [likedCount, setLikedCount] = useState(0);
  const [historyCount, setHistoryCount] = useState(0);
  const [listeningHours, setListeningHours] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn()) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [liked, hist] = await Promise.all([
          getLikedSongs(),
          getHistory(),
        ]);

        setLikedCount(liked?.length || 0);
        setHistoryCount(hist?.length || 0);

        const totalSeconds = (hist || []).reduce(
          (acc: number, s: any) => acc + (s.duration || 0),
          0
        );
        setListeningHours(Math.round(totalSeconds / 3600));
      } catch (err) {
        console.error("Failed to load profile data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 🔥 Premium Unlock → Topbar Notification
  useEffect(() => {
    if (loading || !isLoggedIn()) return;

    if (listeningHours >= 1) {
      const alreadyNotified = localStorage.getItem("premium_unlocked");

      if (!alreadyNotified) {
        // Topbar me notification bhejo
        window.dispatchEvent(
          new CustomEvent("grove-notification", {
            detail: {
              type: "premium",
              title: "🎉 Premium Unlocked!",
              message: `You've unlocked Grove Premium by listening for ${listeningHours} hour(s). Enjoy your glowing status!`,
            },
          })
        );

        localStorage.setItem("premium_unlocked", "true");
      }
    }
  }, [loading, listeningHours]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Not logged in
  if (!isLoggedIn()) {
    return (
      <div className="profile-page">
        <div className="not-logged-card">
          <img src={groveLogo} alt="Grove" className="not-logged-logo" />
          <h1>Welcome to Grove</h1>
          <p>Login to unlock your music profile</p>
          <button className="primary-btn" onClick={() => navigate("/login")}>
            Log In
          </button>
        </div>
      </div>
    );
  }

  const name = getDisplayName();
  const initial = name.charAt(0).toUpperCase();
  const email = user?.email || "";

  // Premium logic
  const isPremium = listeningHours >= 1;

  return (
    <div className="profile-page">
      {/* HERO */}
      <div className="profile-hero">
        <div className="hero-bg" />
        <div className="hero-content">
          <div className="avatar-wrapper">
            <div className={`avatar ${isPremium ? "premium-avatar" : ""}`}>
              {initial}
            </div>
            <div className={`avatar-ring ${isPremium ? "premium-ring" : ""}`} />
          </div>

          <div className="hero-info">
            <span className="hero-label">Profile</span>
            <h1>{name}</h1>
            <div className="hero-meta">
              <span>
                <Mail size={14} />
                {email}
              </span>
              <span className="dot">•</span>

              <span className={`plan-badge ${isPremium ? "premium" : ""}`}>
                {isPremium ? (
                  <>
                    <Star size={13} fill="currentColor" />
                    Premium User
                  </>
                ) : (
                  <>
                    <Crown size={13} />
                    Free Plan
                  </>
                )}
              </span>
            </div>
          </div>

          <img src={groveLogo} alt="Grove" className="hero-logo" />
        </div>
      </div>

      {/* BODY */}
      <div className="profile-body">
        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card">
            <Heart size={22} />
            <div>
              <span className="stat-value">
                {loading ? "—" : likedCount}
              </span>
              <span className="stat-label">Liked Songs</span>
            </div>
          </div>

          <div className="stat-card">
            <History size={22} />
            <div>
              <span className="stat-value">
                {loading ? "—" : historyCount}
              </span>
              <span className="stat-label">Recently Played</span>
            </div>
          </div>

          <div className="stat-card">
            <Clock size={22} />
            <div>
              <span className="stat-value">
                {loading ? "—" : `${listeningHours}h`}
              </span>
              <span className="stat-label">Listening Time</span>
            </div>
          </div>
        </div>

        {/* Premium Tip for Free users */}
        {!isPremium && !loading && (
          <div className="premium-tip">
            🎧 Listen for <strong>1 hour</strong> to unlock{" "}
            <span>Premium</span> status
          </div>
        )}

        {/* Account Details */}
        <section className="section">
          <div className="section-header">
            <h2>Account Details</h2>
          </div>

          <div className="glass-card">
            <div className="info-row">
              <div className="info-icon">
                <User size={18} />
              </div>
              <div className="info-text">
                <span className="label">Display Name</span>
                <p>{name}</p>
              </div>
            </div>

            <div className="info-row">
              <div className="info-icon">
                <Mail size={18} />
              </div>
              <div className="info-text">
                <span className="label">Email Address</span>
                <p>{email}</p>
              </div>
            </div>

            <div className="info-row">
              <div className={`info-icon ${isPremium ? "premium-icon" : ""}`}>
                <Crown size={18} />
              </div>
              <div className="info-text">
                <span className="label">Subscription</span>
                <p>{isPremium ? "Grove Premium" : "Grove Free"}</p>
              </div>

              {isPremium ? (
                <button className="premium-btn">
                  <Star size={14} fill="currentColor" />
                  Premium Member
                </button>
              ) : (
                <button className="upgrade-btn">Upgrade</button>
              )}
            </div>
          </div>
        </section>

        {/* Actions */}
        <section className="section">
          <div className="actions-row">
            <button className="secondary-btn">
              <Settings size={17} />
              Settings
            </button>
            <button className="logout-btn" onClick={handleLogout}>
              <LogOut size={17} />
              Log out
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Profile;
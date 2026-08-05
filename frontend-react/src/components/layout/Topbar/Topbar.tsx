import "./Topbar.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Mic,
  Bell,
  ChevronDown,
} from "lucide-react";
import { getDisplayName, isLoggedIn } from "../../../services/auth";
import { useVoice } from "../../../hooks/useVoice";

function Topbar() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const { listening, status, statusKind, toggle } = useVoice();

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

      {/* Center search + mic */}
      <div className="search-container">
        <Search size={20} />
        <input
          type="text"
          placeholder="What do you want to play?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitSearch();
          }}
        />
        <button
          className={`voice-btn ${listening ? "listening" : ""}`}
          type="button"
          title="Voice command"
          onClick={toggle}
        >
          <Mic size={18} />
        </button>
      </div>

      {/* Right */}
      <div className="topbar-right">
        <button className="notification-btn" type="button">
          <Bell size={20} />
          <span className="notification-dot"></span>
        </button>

        <button
          className="profile-btn"
          type="button"
          onClick={() => navigate(isLoggedIn() ? "/profile" : "/login")}
        >
          <div className="profile-info">
            <span className="profile-name">{getDisplayName()}</span>
          </div>
          <ChevronDown size={18} />
        </button>
      </div>

      {/* Voice status toast */}
      {status && (
        <div className={`voice-status-toast ${statusKind}`}>{status}</div>
      )}
    </header>
  );
}

export default Topbar;
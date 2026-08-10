import "./Layout.css";
import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sparkles } from "lucide-react";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import Player from "./Player";
import NowPlaying from "./NowPlaying/NowPlaying";
import MobileNav from "./MobileNav/MobileNav";
import NovaChat from "../NovaChat/NovaChat";
import { usePlayer } from "../../context/PlayerContext";

function Layout() {
  const [showQueue, setShowQueue] = useState(false);
  const [showNowPlaying, setShowNowPlaying] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const { currentSong } = usePlayer();

  useEffect(() => {
    if (!currentSong) {
      setShowNowPlaying(false);
      return;
    }

    // Phone pe auto-open mat karo — playbar hide ho jata hai
    const isMobile = window.innerWidth <= 450;
    if (!isMobile) {
      setShowNowPlaying(true);
    }
  }, [currentSong?.id]);

  return (
    <div className={`app-layout ${showNowPlaying ? "np-open" : ""}`}>
      <Sidebar />

      <div className="content-area">
        <Topbar />

        <main className="page-content">
          <Outlet />
        </main>

        <Player
          showQueue={showQueue}
          setShowQueue={setShowQueue}
          showNowPlaying={showNowPlaying}
          setShowNowPlaying={setShowNowPlaying}
        />

        <MobileNav />
      </div>

      <NowPlaying
        open={showNowPlaying}
        onClose={() => setShowNowPlaying(false)}
        onOpenQueue={() => {
          setShowNowPlaying(false);
          setShowQueue(true);
        }}
      />

      <button
        className="floating-ai"
        onClick={() => setChatOpen(true)}
        style={{
          position: "fixed",
          right: showNowPlaying ? 388 : 28,
          bottom: 100,
          height: 56,
          padding: "0 22px",
          border: "none",
          borderRadius: 999,
          background: "#1DB954",
          color: "white",
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 15,
          fontWeight: 700,
          cursor: "pointer",
          zIndex: 999,
          boxShadow: "0 10px 30px rgba(29,185,84,.35)",
          transition: "right 0.28s ease",
        }}
      >
        <Sparkles size={20} />
        <span>Nova</span>
      </button>

      <NovaChat open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}

export default Layout;
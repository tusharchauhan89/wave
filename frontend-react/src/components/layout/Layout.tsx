import "./Layout.css";
import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import Player from "./Player";
import NowPlaying from "./NowPlaying/NowPlaying";
import MobileNav from "./MobileNav/MobileNav";
import { usePlayer } from "../../context/PlayerContext";

function Layout() {
  const [showQueue, setShowQueue] = useState(false);
  const [showNowPlaying, setShowNowPlaying] = useState(false);
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
    </div>
  );
}

export default Layout;
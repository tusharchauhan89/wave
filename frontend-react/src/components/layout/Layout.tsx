import "./Layout.css";
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sparkles } from "lucide-react";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import Player from "./Player";
import NovaChat from "../NovaChat/NovaChat";

function Layout() {
  const [showQueue, setShowQueue] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar />

      <div className="content-area">
        <Topbar />

        <main className="page-content">
          <Outlet />
        </main>

        <Player showQueue={showQueue} setShowQueue={setShowQueue} />
      </div>

      {/* Floating Nova button */}
      <button
        className="floating-ai"
        onClick={() => setChatOpen(true)}
        style={{
          position: "fixed",
          right: 28,
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
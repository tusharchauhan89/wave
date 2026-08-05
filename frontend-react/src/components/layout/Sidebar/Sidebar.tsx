import "./Sidebar.css";
import { useEffect, useState } from "react";
import {
  Circle,
  House,
  Search,
  Library,
  Heart,
  Plus,
  Mic2,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { listPlaylists, createPlaylist } from "../../../services/playlist";
import { isLoggedIn } from "../../../services/auth";

function Sidebar() {
  const [playlists, setPlaylists] = useState<any[]>([]);
  const navigate = useNavigate();

  const loadPlaylists = async () => {
    if (!isLoggedIn()) {
      setPlaylists([]);
      return;
    }
    try {
      const data = await listPlaylists();
      setPlaylists(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("playlists load fail", err);
      setPlaylists([]);
    }
  };

  useEffect(() => {
    loadPlaylists();
  }, []);

  // jab page focus ho / wapas aao to refresh (optional)
  useEffect(() => {
    const onFocus = () => loadPlaylists();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const handleCreate = async () => {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }
    const name = window.prompt("Playlist name");
    if (!name?.trim()) return;
    try {
      const pl = await createPlaylist(name.trim());
      if (pl?.id) {
        setPlaylists((prev) => [pl, ...prev]);
        navigate(`/playlist/${pl.id}`);
      }
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Playlist create fail");
    }
  };

  return (
    <aside className="sidebar">
      <div className="logo">
        <Circle className="logo-dot" size={12} fill="#1DB954" />
        <h2>Grove</h2>
      </div>

      <nav className="menu">
        <NavLink to="/" end>
          <House size={20} />
          <span>Home</span>
        </NavLink>

        <NavLink to="/search">
          <Search size={20} />
          <span>Search</span>
        </NavLink>
      </nav>

      <div className="divider"></div>

      

      <nav className="menu">
        <NavLink to="/library">
          <Library size={20} />
          <span>Library</span>
        </NavLink>

        <NavLink to="/liked">
          <Heart size={20} />
          <span>Liked Songs</span>
        </NavLink>

        <button
          type="button"
          className="sidebar-create-btn"
          onClick={handleCreate}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            width: "100%",
            background: "transparent",
            border: "none",
            color: "#b3b3b3",
            padding: "10px 12px",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 14,
            fontFamily: "inherit",
          }}
        >
          <Plus size={20} />
          <span>Create Playlist</span>
        </button>
      </nav>

      <div className="divider"></div>

      

      <div className="divider"></div>

      <div className="playlist-section">
        <h4>Playlists</h4>

        {!isLoggedIn() && (
          <p style={{ color: "#666", fontSize: 13, padding: "4px 8px" }}>
            Login to see playlists
          </p>
        )}

        {isLoggedIn() && playlists.length === 0 && (
          <p style={{ color: "#666", fontSize: 13, padding: "4px 8px" }}>
            No playlists yet
          </p>
        )}

        {playlists.map((pl) => (
          <NavLink key={pl.id} to={`/playlist/${pl.id}`}>
            {pl.name}
          </NavLink>
        ))}
      </div>
    </aside>
  );
}

export default Sidebar;
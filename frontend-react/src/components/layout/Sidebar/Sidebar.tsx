import "./Sidebar.css";
import { useEffect, useState } from "react";
import {
  House,
  Search,
  Heart,
  Plus,
  Library,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { listPlaylists, createPlaylist } from "../../../services/playlist";
import { isLoggedIn } from "../../../services/auth";
import groveLogo from "../../../assets/image.png"; // check path

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
      {/* Logo */}
      <div className="logo">
        <img src={groveLogo} alt="GROOVE" className="logo-img" />
      </div>

      {/* Icons */}
      <nav className="menu">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          title="Home"
        >
          <House size={24} />
        </NavLink>

        <NavLink
          to="/search"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          title="Search"
        >
          <Search size={24} />
        </NavLink>

        <NavLink
          to="/liked"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          title="Liked Songs"
        >
          <Heart size={24} />
        </NavLink>

        <button
          type="button"
          className="nav-item"
          onClick={handleCreate}
          title="Create Playlist"
        >
          <Plus size={24} />
        </button>

        <NavLink
          to="/library"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          title="Library"
        >
          <Library size={22} />
        </NavLink>
      </nav>
    </aside>
  );
}

export default Sidebar;
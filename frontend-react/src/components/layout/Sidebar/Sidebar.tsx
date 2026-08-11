import "./Sidebar.css";
import { useEffect, useState } from "react";

import {
  House,
  Search,
  Library,
  Heart,
  Plus,
  ListMusic,
} from "lucide-react";

import {
  NavLink,
  useNavigate,
} from "react-router-dom";

import {
  listPlaylists,
  createPlaylist,
} from "../../../services/playlist";

import {
  isLoggedIn,
} from "../../../services/auth";

function Sidebar() {
  const [playlists, setPlaylists] =
    useState<any[]>([]);

  const navigate = useNavigate();

  const loadPlaylists = async () => {
    if (!isLoggedIn()) {
      setPlaylists([]);
      return;
    }

    try {
      const data = await listPlaylists();

      setPlaylists(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (err) {
      console.error(
        "playlists load fail",
        err
      );

      setPlaylists([]);
    }
  };

  useEffect(() => {
    loadPlaylists();
  }, []);

  useEffect(() => {
    const onFocus = () =>
      loadPlaylists();

    window.addEventListener(
      "focus",
      onFocus
    );

    return () => {
      window.removeEventListener(
        "focus",
        onFocus
      );
    };
  }, []);

  const handleCreate = async () => {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }

    const name = window.prompt(
      "Playlist name"
    );

    if (!name?.trim()) return;

    try {
      const pl =
        await createPlaylist(
          name.trim()
        );

      if (pl?.id) {
        setPlaylists((prev) => [
          pl,
          ...prev,
        ]);

        navigate(
          `/playlist/${pl.id}`
        );
      }
    } catch (err: any) {
      alert(
        err?.response?.data?.detail ||
          "Playlist create fail"
      );
    }
  };

  return (
    <aside className="sidebar">

      {/* =====================================
          GROVE BRAND
      ===================================== */}

      <div
        className="grove-brand"
        title="Grove"
        onClick={() =>
          navigate("/")
        }
      >
        <img
          src="/grove-logo.png"
          alt="Grove"
          className="grove-logo-image"
        />
      </div>

      {/* =====================================
          MAIN NAVIGATION
      ===================================== */}

      <nav className="sidebar-nav">

        <NavLink
          to="/"
          end
          className="sidebar-item"
          title="Home"
        >
          <House
            size={22}
            strokeWidth={2}
          />
        </NavLink>

        <NavLink
          to="/search"
          className="sidebar-item"
          title="Search"
        >
          <Search
            size={22}
            strokeWidth={2}
          />
        </NavLink>

        <NavLink
          to="/library"
          className="sidebar-item"
          title="Your Library"
        >
          <Library
            size={22}
            strokeWidth={2}
          />
        </NavLink>

        <NavLink
          to="/liked"
          className="sidebar-item"
          title="Liked Songs"
        >
          <Heart
            size={22}
            strokeWidth={2}
          />
        </NavLink>

        {/* CREATE PLAYLIST */}

        <button
          type="button"
          className="sidebar-item sidebar-button"
          onClick={handleCreate}
          title="Create Playlist"
        >
          <Plus
            size={24}
            strokeWidth={2}
          />
        </button>

      </nav>

      {/* =====================================
          PLAYLISTS
      ===================================== */}

      <div className="sidebar-playlists">

        {playlists.map((pl) => (
          <NavLink
            key={pl.id}
            to={`/playlist/${pl.id}`}
            className="playlist-icon"
            title={pl.name}
          >
            <ListMusic
              size={21}
            />
          </NavLink>
        ))}

        {/* Empty playlist indicator */}

        {isLoggedIn() &&
          playlists.length === 0 && (
            <div
              className="playlist-icon playlist-empty"
              title="No playlists yet"
            >
              <ListMusic
                size={20}
              />
            </div>
          )}

      </div>

    </aside>
  );
}

export default Sidebar;
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listPlaylists, createPlaylist, type Playlist } from "../../services/playlist";
import { isLoggedIn } from "../../services/auth";
import { Heart, Music, Plus } from "lucide-react";
import "./Library.css";

function Library() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoggedIn()) {
      setLoading(false);
      return;
    }
    listPlaylists()
      .then(setPlaylists)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const create = async () => {
    const name = prompt("Playlist name");
    if (!name?.trim()) return;
    const pl = await createPlaylist(name.trim());
    if (pl?.id) {
      setPlaylists((p) => [pl, ...p]);
      navigate(`/playlist/${pl.id}`);
    }
  };

  if (!isLoggedIn()) {
    return (
      <div className="library-page">
        <div className="library-empty">
          <h2>Your Library</h2>
          <p>Log in to see your playlists and liked songs</p>
          <Link to="/login" className="btn-new-playlist">
            Log in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="library-page">
      <div className="library-header">
        <h1>Your Library</h1>
        <div className="library-actions">
          <button className="btn-new-playlist" onClick={create}>
            <Plus size={16} style={{ marginRight: 6, verticalAlign: -3 }} />
            New playlist
          </button>
        </div>
      </div>

      <div className="library-grid">
        {/* Liked Songs card */}
        <Link to="/liked" className="library-card">
          <div className="library-card-cover liked">
            <Heart size={48} fill="#fff" color="#fff" />
          </div>
          <div className="library-card-info">
            <h3>Liked Songs</h3>
            <p>Playlist</p>
          </div>
        </Link>

        {/* User playlists */}
        {playlists.map((pl) => (
          <Link key={pl.id} to={`/playlist/${pl.id}`} className="library-card">
            <div className="library-card-cover">
              {pl.cover ? (
                <img src={pl.cover} alt={pl.name} />
              ) : (
                <Music size={40} color="#b3b3b3" />
              )}
            </div>
            <div className="library-card-info">
              <h3>{pl.name}</h3>
              <p>Playlist</p>
            </div>
          </Link>
        ))}
      </div>

      {!loading && playlists.length === 0 && (
        <div className="library-empty" style={{ marginTop: 40 }}>
          <p>No playlists yet. Create your first one!</p>
        </div>
      )}
    </div>
  );
}

export default Library;
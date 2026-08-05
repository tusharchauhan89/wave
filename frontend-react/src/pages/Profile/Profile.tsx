import { useNavigate } from "react-router-dom";
import {
  getDisplayName,
  getUser,
  isLoggedIn,
  logout,
} from "../../services/auth";

function Profile() {
  const navigate = useNavigate();
  const user = getUser();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  if (!isLoggedIn()) {
    return (
      <div style={{ padding: 20 }}>
        <h1>Profile</h1>
        <p style={{ color: "#94a3b8" }}>Pehle login karo.</p>
        <button
          type="button"
          onClick={() => navigate("/login")}
          style={{
            marginTop: 12,
            background: "#1DB954",
            color: "#000",
            border: "none",
            padding: "10px 20px",
            borderRadius: 999,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Log In
        </button>
      </div>
    );
  }

  const name = getDisplayName();
  const initial = name.charAt(0).toUpperCase();

  return (
    <div style={{ padding: 20 }}>
      <h1>Profile</h1>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          background: "#181818",
          padding: 20,
          borderRadius: 12,
          marginBottom: 24,
          marginTop: 16,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "#1DB954",
            color: "#000",
            fontWeight: 700,
            fontSize: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {initial}
        </div>

        <div>
          <h2 style={{ margin: 0 }}>{name}</h2>
          <p style={{ color: "#94a3b8", margin: "4px 0 0" }}>
            {user?.email || ""}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        style={{
          background: "transparent",
          border: "1px solid #444",
          color: "#fff",
          padding: "10px 20px",
          borderRadius: 999,
          cursor: "pointer",
        }}
      >
        Log out
      </button>
    </div>
  );
}

export default Profile;
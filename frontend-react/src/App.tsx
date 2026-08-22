import "./services/voice"; // Voice module load hoga

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PlayerProvider } from "./context/PlayerContext";
import Layout from "./components/layout";

import Home from "./pages/Home/Home";
import Search from "./pages/Search/Search";
import Playlist from "./pages/Playlist/Playlist";
import LikedSongs from "./pages/LikedSongs/LikedSongs";
import Library from "./pages/Library/Library";

import Profile from "./pages/Profile/Profile";
import Settings from "./pages/Settings/Settings";
import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import MadeForYou from "./pages/MadeForYou/MadeForYou";
function App() {
  return (
    <BrowserRouter>
      <PlayerProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="search" element={<Search />} />
            <Route path="liked" element={<LikedSongs />} />
            <Route path="library" element={<Library />} />
            <Route path="playlist/:id" element={<Playlist />} />
          <Route path="playlists" element={<Library />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Settings />} />
            <Route path="made-for-you" element={<MadeForYou />} />
          </Route>
        </Routes>
      </PlayerProvider>
    </BrowserRouter>
  );
}

export default App;
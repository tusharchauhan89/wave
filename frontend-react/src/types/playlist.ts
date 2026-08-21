import api from "../api/axios";
import { normalizeSong } from "./music";
import type { Song } from "../context/PlayerContext";

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  is_public?: boolean;
  user_id?: string;
  created_at?: string;
  songs?: any[];
  cover?: string;
}

export const listPlaylists = async (): Promise<Playlist[]> => {
  return (await api.get("/api/playlists/")).data?.data || [];
};

export const createPlaylist = async (name: string, description = "") => {
  return (await api.post("/api/playlists/", { name, description, is_public: false })).data?.data;
};

export const getUserPlaylist = async (id: string) => {
  return (await api.get(`/api/playlists/${id}`)).data?.data;
};

export const getPlaylistSongs = async (id: string): Promise<Song[]> => {
  const pl = await getUserPlaylist(id);
  return (pl?.songs || []).map((r: any) => normalizeSong(r.song_data || r));
};

export const addSongToPlaylist = async (playlistId: string, song: any) => {
  return (await api.post(`/api/playlists/${playlistId}/songs`, {
    song_id: String(song.id),
    song_data: song,
  })).data;
};

export const removeSongFromPlaylist = async (playlistId: string, songId: string) => {
  return (await api.delete(`/api/playlists/${playlistId}/songs/${songId}`)).data;
};
export const getHistory = async () => {
  console.log("Calling history API...");

  const res = await api.get("/api/playlists/history");

  console.log("History API Response:", res);

  const rows = res.data?.data || [];

  console.log("Rows:", rows);

  return rows.map((row: any) =>
    normalizeSong(row.song_data || row)
  );
};
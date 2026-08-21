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

export async function listPlaylists(): Promise<Playlist[]> {
  const res = await api.get("/api/playlists/");
  return res.data?.data || [];
}

export async function createPlaylist(
  name: string,
  description = "",
  is_public = false
): Promise<Playlist> {
  const res = await api.post("/api/playlists/", {
    name,
    description,
    is_public,
  });
  return res.data?.data;
}

export async function getUserPlaylist(playlistId: string) {
  const res = await api.get("/api/playlists/" + playlistId);
  return res.data?.data;
}

export async function getPlaylistSongs(playlistId: string): Promise<Song[]> {
  const pl = await getUserPlaylist(playlistId);
  const rows = pl?.songs || [];
  return rows.map(function (row: any) {
    return normalizeSong(row.song_data || row);
  });
}

export async function addSongToPlaylist(playlistId: string, song: any) {
  const res = await api.post("/api/playlists/" + playlistId + "/songs", {
    song_id: String(song.id),
    song_data: song,
  });
  return res.data;
}

export async function removeSongFromPlaylist(
  playlistId: string,
  songId: string
) {
  const res = await api.delete(
    "/api/playlists/" + playlistId + "/songs/" + songId
  );
  return res.data;
}
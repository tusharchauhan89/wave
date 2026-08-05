import api from "../api/axios";
import type { Song } from "../context/PlayerContext";

function unwrapData(payload: any): any {
  let d = payload;
  if (d?.data !== undefined) d = d.data;
  if (d?.data !== undefined && (d.path || d.data?.songs || d.data?.results)) d = d.data;
  if (d?.data !== undefined && !Array.isArray(d) && !d.songs && !d.results && !d.id) d = d.data;
  return d;
}

export function normalizeSong(raw: any): Song {
  if (!raw) return { id: "", name: "Unknown" };
  const downloadUrl =
    raw.downloadUrl || raw.download_url ||
    (raw.media_url ? [{ quality: "default", url: raw.media_url }] : undefined);
  let artists = raw.artists;
  if (!artists && (raw.primaryArtists || raw.singers || raw.artist)) {
    const names = String(raw.primaryArtists || raw.singers || raw.artist)
      .split(",")
      .map((n: string) => n.trim())
      .filter(Boolean);
    artists = { primary: names.map((name: string) => ({ name })) };
  }
  return {
    id: String(raw.id || raw.song_id || ""),
    name: raw.name || raw.title || "Unknown",
    duration: Number(raw.duration) || 0,
    image: Array.isArray(raw.image)
      ? raw.image
      : raw.image
      ? [{ quality: "default", url: raw.image }]
      : undefined,
    downloadUrl,
    artists,
    album: raw.album,
    language: raw.language,
    ...raw,
  };
}

export function extractSongs(payload: any): Song[] {
  const d = unwrapData(payload);
  const list: any[] = [];
  const push = (arr: any) => {
    if (!Array.isArray(arr)) return;
    for (const s of arr) {
      if (!s) continue;
      if (s.type && s.type !== "song" && !s.downloadUrl && !s.name && !s.title) continue;
      list.push(s);
    }
  };
  if (d?.songs?.results) push(d.songs.results);
  else if (Array.isArray(d?.songs)) push(d.songs);
  if (d?.topQuery?.results) push(d.topQuery.results);
  if (Array.isArray(d?.results)) push(d.results);
  if (Array.isArray(d)) push(d);
  if (Array.isArray(d?.data)) push(d.data);

  const seen: Record<string, boolean> = {};
  return list
    .map(normalizeSong)
    .filter((s) => {
      if (!s.id || seen[s.id]) return false;
      seen[s.id] = true;
      return true;
    });
}

export function getBestStreamUrl(song: any): string {
  const dl = song?.downloadUrl || song?.download_url;
  if (Array.isArray(dl) && dl.length) {
    const best = dl[dl.length - 1];
    return best?.url || best?.link || "";
  }
  if (typeof dl === "string") return dl;
  if (song?.media_url) return song.media_url;
  return "";
}

export const searchMusic = async (
  query: string,
  limit = 20,
  page = 0
): Promise<Song[]> => {
  const res = await api.get("/api/music/search", {
    params: { query, limit, page },
  });
  return extractSongs(res.data);
};

export const searchAll = async (query: string, limit = 50) => {
  const res = await api.get("/api/music/search", {
    params: { query, limit },
  });
  return { songs: extractSongs(res.data), raw: res.data };
};

export const getSong = async (songId: string): Promise<Song> => {
  const res = await api.get(`/api/music/song/${songId}`);
  const data = unwrapData(res.data) || res.data?.data || res.data;
  if (Array.isArray(data)) return normalizeSong(data[0]);
  if (data?.songs) return normalizeSong(data.songs[0]);
  return normalizeSong(data);
};

export const likeSong = async (song: any) => {
  return (
    await api.post("/api/playlists/liked", {
      song_id: String(song.id),
      song_data: song,
    })
  ).data;
};

export const unlikeSong = async (songId: string) => {
  return (await api.delete(`/api/playlists/liked/${songId}`)).data;
};

export const getLikedSongs = async (): Promise<Song[]> => {
  const res = await api.get("/api/playlists/liked/list");
  return (res.data?.data || []).map((row: any) =>
    normalizeSong(row.song_data || row)
  );
};

export const addHistory = async (song: any) => {
  if (!localStorage.getItem("access_token")) return;
  try {
    await api.post("/api/playlists/history", {
      song_id: String(song.id),
      song_data: song,
    });
  } catch (e) {
    console.error("history save fail", e);
  }
};

export const getHistory = async () => {
  const res = await api.get("/api/playlists/history");
  const rows = res.data?.data || []; // ← yahan fix kiya (pehle rchaes tha)
  const seen: Record<string, boolean> = {};
  const out: any[] = [];
  for (const row of rows) {
    const s = normalizeSong(row.song_data || row);
    if (!s?.id || seen[s.id]) continue;
    seen[s.id] = true;
    out.push(s);
  }
  return out;
};
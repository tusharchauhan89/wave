import api from "../api/axios";

export const login = async (email: string, password: string) => {
  const res = await api.post("/api/auth/signin", {
    email: email.trim(),
    password,
  });

  const session = res.data?.session;

  if (!session?.access_token) {
    throw new Error(
      "No session returned. Supabase me email confirm band karo, ya user confirm karo."
    );
  }

  localStorage.setItem("access_token", session.access_token);
  localStorage.setItem("refresh_token", session.refresh_token || "");
  localStorage.setItem("user", JSON.stringify(session.user || res.data?.user || {}));

  return session;
};

export const register = async (
  email: string,
  password: string,
  full_name: string
) => {
  const res = await api.post("/api/auth/signup", {
    email: email.trim(),
    password,
    full_name: full_name.trim(),
  });

  const session = res.data?.session;

  if (session?.access_token) {
    localStorage.setItem("access_token", session.access_token);
    localStorage.setItem("refresh_token", session.refresh_token || "");
    localStorage.setItem(
      "user",
      JSON.stringify(session.user || res.data?.user || {})
    );
  }

  return res.data;
};

export const logout = async () => {
  try {
    await api.post("/api/auth/signout");
  } catch {
    // ignore
  }
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
};

export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

export const isLoggedIn = () => !!localStorage.getItem("access_token");

export const getMe = async () => (await api.get("/api/auth/me")).data;

export const getDisplayName = () => {
  const u = getUser();
  if (!u) return "Guest";
  return (
    u.full_name ||
    u.user_metadata?.full_name ||
    u.email?.split("@")[0] ||
    "User"
  );
};
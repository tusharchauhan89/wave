const API = "https://groove-fpft.onrender.com/api";

function getToken() {
    return localStorage.getItem("access_token");
}

function setSession(session) {
    if (session ? .access_token) {
        localStorage.setItem("access_token", session.access_token);
        localStorage.setItem("refresh_token", session.refresh_token || "");
        localStorage.setItem("user", JSON.stringify(session.user || {}));
    }
}

function clearSession() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
}

function getUser() {
    try {
        return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
        return {};
    }
}

async function api(path, options = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
    };
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API}${path}`, {
        ...options,
        headers,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.detail || data.message || "Request failed");
    }
    return data;
}

async function signIn(email, password) {
    const data = await api("/auth/signin", {
        method: "POST",
        body: JSON.stringify({ email, password }),
    });
    setSession(data.session);
    return data;
}

async function signUp(email, password, full_name) {
    const data = await api("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password, full_name }),
    });
    if (data.session) setSession(data.session);
    return data;
}

async function signOut() {
    try {
        await api("/auth/signout", { method: "POST" });
    } catch {}
    clearSession();
    window.location.href = "login.html";
}

function requireAuth() {
    if (!getToken()) {
        window.location.href = "login.html";
        return false;
    }
    return true;
}

window.Auth = {
    getToken,
    getUser,
    api,
    signIn,
    signUp,
    signOut,
    requireAuth,
    clearSession,
    setSession,
};
const API = "https://groove-fpft.onrender.com/api";

function getToken() {
    return localStorage.getItem("access_token");
}

function setSession(session) {
    if (session && session.access_token) {
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
    } catch (e) {
        return {};
    }
}

async function api(path, options) {
    options = options || {};
    var headers = {
        "Content-Type": "application/json",
    };
    if (options.headers) {
        for (var k in options.headers) headers[k] = options.headers[k];
    }
    var token = getToken();
    if (token) headers["Authorization"] = "Bearer " + token;

    var res = await fetch(API + path, {
        method: options.method || "GET",
        headers: headers,
        body: options.body,
    });
    var data = {};
    try {
        data = await res.json();
    } catch (e) {}
    if (!res.ok) {
        throw new Error(data.detail || data.message || "Request failed");
    }
    return data;
}

async function signIn(email, password) {
    var data = await api("/auth/signin", {
        method: "POST",
        body: JSON.stringify({ email: email, password: password }),
    });
    setSession(data.session);
    return data;
}

async function signUp(email, password, full_name) {
    var data = await api("/auth/signup", {
        method: "POST",
        body: JSON.stringify({
            email: email,
            password: password,
            full_name: full_name,
        }),
    });
    if (data.session) setSession(data.session);
    return data;
}

async function signOut() {
    try {
        await api("/auth/signout", { method: "POST" });
    } catch (e) {}
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
    getToken: getToken,
    getUser: getUser,
    api: api,
    signIn: signIn,
    signUp: signUp,
    signOut: signOut,
    requireAuth: requireAuth,
    clearSession: clearSession,
    setSession: setSession,
};
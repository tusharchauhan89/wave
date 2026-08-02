const Player = (() => {
    const audio = new Audio();
    audio.volume = 0.7;

    let queue = [];
    let currentIndex = -1;
    let isPlaying = false;
    let els = {};
    let playToken = 0; // prevents race: old play() vs new song

    function init() {
        els = {
            cover: document.getElementById("np-cover"),
            title: document.getElementById("np-title"),
            artist: document.getElementById("np-artist"),
            playBtn: document.getElementById("btn-play"),
            progress: document.getElementById("progress-filled"),
            progressBar: document.getElementById("progress-bar"),
            currentTime: document.getElementById("current-time"),
            duration: document.getElementById("duration"),
            volume: document.getElementById("volume"),
        };

        audio.addEventListener("timeupdate", onTimeUpdate);
        audio.addEventListener("ended", function() {
            if (currentIndex < queue.length - 1) next();
        });
        audio.addEventListener("loadedmetadata", function() {
            if (els.duration) els.duration.textContent = formatTime(audio.duration);
        });
        audio.addEventListener("playing", function() {
            isPlaying = true;
            updatePlayButton();
        });
        audio.addEventListener("pause", function() {
            // only mark paused if we didn't just switch tracks
            if (audio.paused) {
                isPlaying = false;
                updatePlayButton();
            }
        });
        audio.addEventListener("error", function() {
            console.error("Audio error:", audio.error && audio.error.code, audio.src);
        });

        if (els.progressBar) {
            els.progressBar.addEventListener("click", function(e) {
                if (!audio.duration) return;
                var rect = els.progressBar.getBoundingClientRect();
                var pct = (e.clientX - rect.left) / rect.width;
                audio.currentTime = pct * audio.duration;
            });
        }

        if (els.volume) {
            els.volume.addEventListener("input", function(e) {
                audio.volume = e.target.value / 100;
            });
        }
    }

    function formatTime(sec) {
        if (!sec || isNaN(sec)) return "0:00";
        var m = Math.floor(sec / 60);
        var s = Math.floor(sec % 60).toString().padStart(2, "0");
        return m + ":" + s;
    }

    function onTimeUpdate() {
        if (!audio.duration) return;
        var pct = (audio.currentTime / audio.duration) * 100;
        if (els.progress) els.progress.style.width = pct + "%";
        if (els.currentTime) els.currentTime.textContent = formatTime(audio.currentTime);
    }

    function unwrap(obj) {
        var s = obj;
        for (var i = 0; i < 6; i++) {
            if (!s || typeof s !== "object") break;
            if (Array.isArray(s)) {
                s = s[0];
                continue;
            }
            if (s.downloadUrl || s.download_url || s.media_url) break;
            if (s.id && (s.name || s.title)) break;
            if (s.data !== undefined) {
                s = s.data;
                continue;
            }
            break;
        }
        if (Array.isArray(s)) s = s[0];
        return s || {};
    }

    function getBestUrl(obj) {
        var s = unwrap(obj);
        var dl = s.downloadUrl || s.download_url;
        if (Array.isArray(dl) && dl.length) {
            var sorted = dl.slice().sort(function(a, b) {
                var qa = parseInt(String((a && a.quality) || "0"), 10) || 0;
                var qb = parseInt(String((b && b.quality) || "0"), 10) || 0;
                return qb - qa;
            });
            var best = sorted[0];
            if (typeof best === "string") return best;
            return (best && (best.url || best.link)) || null;
        }
        if (typeof dl === "string") return dl;
        if (s.media_url) return s.media_url;
        if (s.mediaUrl) return s.mediaUrl;
        return null;
    }

    function getImage(s) {
        if (Array.isArray(s.image)) {
            var best = s.image[s.image.length - 1] || s.image[0];
            return (best && (best.url || best.link)) || "";
        }
        if (typeof s.image === "string") return s.image;
        return "";
    }

    function normalizeSong(raw) {
        var s = unwrap(raw);
        var artists = "Unknown";
        if (s.primaryArtists) artists = s.primaryArtists;
        else if (s.primary_artists) artists = s.primary_artists;
        else if (s.singers) artists = s.singers;
        else if (s.artists && s.artists.primary) {
            artists = s.artists.primary.map(function(a) {
                return a.name;
            }).join(", ");
        } else if (s.subtitle) artists = s.subtitle;

        return {
            id: String(s.id || s.song_id || ""),
            name: s.name || s.title || s.song || "Unknown",
            artists: artists,
            image: getImage(s),
            duration: s.duration || 0,
            url: getBestUrl(s),
            raw: s,
        };
    }

    async function resolveUrl(song) {
        if (song.url) return song.url;
        if (!song.id) return null;
        try {
            var res = await Auth.api("/music/song/" + encodeURIComponent(song.id));
            var url = getBestUrl(res);
            if (url) {
                song.url = url;
                var full = normalizeSong(res);
                song.name = full.name || song.name;
                song.artists = full.artists || song.artists;
                song.image = full.image || song.image;
                song.raw = full.raw || song.raw;
            }
            return url || null;
        } catch (err) {
            console.error("resolveUrl failed", err);
            return null;
        }
    }

    async function playAtIndex(index) {
        if (index < 0 || index >= queue.length) {
            console.log("playAtIndex out of range", index, "len", queue.length);
            return;
        }

        var myToken = ++playToken;
        currentIndex = index;
        var song = queue[currentIndex];
        console.log("playAtIndex", index, song.id, song.name, "queueLen=", queue.length);

        var url = await resolveUrl(song);
        if (myToken !== playToken) return; // newer request started
        if (!url) {
            alert("Stream URL not found for: " + song.name);
            return;
        }

        // Change source WITHOUT calling pause() first (avoids interrupt error)
        try {
            audio.src = url;
            audio.load();
            updateUI(song);
            if (els.progress) els.progress.style.width = "0%";
            if (els.currentTime) els.currentTime.textContent = "0:00";

            var playPromise = audio.play();
            if (playPromise && playPromise.then) {
                await playPromise;
            }
            if (myToken !== playToken) return;
            isPlaying = true;
            updatePlayButton();

            if (window.Auth && Auth.getToken() && song.id) {
                Auth.api("/playlists/history", {
                    method: "POST",
                    body: JSON.stringify({ song_id: song.id, song_data: song.raw }),
                }).catch(function() {});
            }
        } catch (err) {
            // Ignore AbortError / interrupted play — happens on fast next clicks
            if (err && (err.name === "AbortError" || String(err.message || "").indexOf("interrupted") !== -1)) {
                console.log("Play interrupted (ok):", err.message);
                return;
            }
            console.error("Play error", err);
            alert("Playback failed: " + (err.message || "unknown"));
        }
    }

    async function playSong(songData) {
        var song = normalizeSong(songData);
        queue = [song];
        await playAtIndex(0);
    }

    async function playQueue(songs, startIndex) {
        if (startIndex === undefined) startIndex = 0;
        if (!songs || !songs.length) return;
        queue = songs.map(normalizeSong);
        console.log("Queue set:", queue.length, "songs, start=", startIndex);
        queue.forEach(function(s, i) {
            console.log("  [" + i + "]", s.id, s.name);
        });
        await playAtIndex(startIndex);
    }

    function play() {
        var p = audio.play();
        if (p && p.then) {
            p.then(function() {
                isPlaying = true;
                updatePlayButton();
            }).catch(function(err) {
                if (String(err.message || "").indexOf("interrupted") === -1) console.error(err);
            });
        }
    }

    function pause() {
        audio.pause();
        isPlaying = false;
        updatePlayButton();
    }

    function toggle() {
        if (!audio.paused) pause();
        else play();
    }

    function next() {
        console.log("NEXT click — index", currentIndex, "of", queue.length);
        if (queue.length <= 1) {
            console.log("Queue has only 1 song — Next has nowhere to go. Search & click a result first.");
            return;
        }
        if (currentIndex >= queue.length - 1) {
            console.log("Already last song");
            return;
        }
        playAtIndex(currentIndex + 1);
    }

    function prev() {
        console.log("PREV click — index", currentIndex, "time", audio.currentTime);
        if (queue.length === 0) return;
        if (audio.currentTime > 3) {
            audio.currentTime = 0;
            return;
        }
        if (currentIndex <= 0) return;
        playAtIndex(currentIndex - 1);
    }

    function volumeUp() {
        audio.volume = Math.min(1, audio.volume + 0.1);
        if (els.volume) els.volume.value = Math.round(audio.volume * 100);
    }

    function volumeDown() {
        audio.volume = Math.max(0, audio.volume - 0.1);
        if (els.volume) els.volume.value = Math.round(audio.volume * 100);
    }

    function mute() {
        audio.muted = true;
    }

    function unmute() {
        audio.muted = false;
    }

    function updateUI(song) {
        if (els.cover) els.cover.src = song.image || "";
        if (els.title) els.title.textContent = song.name;
        if (els.artist) els.artist.textContent = song.artists;
    }

    function updatePlayButton() {
        if (!els.playBtn) return;
        els.playBtn.innerHTML = !audio.paused ?
            '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>' :
            '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M8 5v14l11-7z"/></svg>';
    }

    function getQueue() {
        return queue.slice();
    }

    function getCurrentIndex() {
        return currentIndex;
    }

    var onChange = null;

    function setOnChange(fn) {
        onChange = fn;
    }

    function notify() {
        if (typeof onChange === "function") {
            try { onChange(queue.slice(), currentIndex); } catch (e) {}
        }
    }

    // wrap playAtIndex notify - patch after successful play by hooking updateUI
    var _updateUI = updateUI;
    updateUI = function(song) {
        _updateUI(song);
        notify();
    };

    return {
        init: init,
        playSong: playSong,
        playQueue: playQueue,
        play: play,
        pause: pause,
        toggle: toggle,
        next: next,
        prev: prev,
        volumeUp: volumeUp,
        volumeDown: volumeDown,
        mute: mute,
        unmute: unmute,
        getQueue: getQueue,
        getCurrentIndex: getCurrentIndex,
        setOnChange: setOnChange,
        playAtIndex: playAtIndex,
    };
})();

window.Player = Player;
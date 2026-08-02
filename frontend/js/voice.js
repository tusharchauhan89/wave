const Voice = (() => {
    let recognition = null;
    let isListening = false;
    let preferredLang = "en-IN"; // switchable: en-IN | hi-IN

    function init() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("SpeechRecognition not supported");
            return false;
        }

        recognition = new SpeechRecognition();
        recognition.lang = preferredLang;
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 3;

        recognition.onstart = function() {
            isListening = true;
            setMicState(true);
            showStatus("Listening…", "listen");
        };

        recognition.onend = function() {
            isListening = false;
            setMicState(false);
        };

        recognition.onerror = function(e) {
            console.error("Speech error", e.error);
            isListening = false;
            setMicState(false);
            if (e.error === "not-allowed") {
                showStatus("Mic permission denied", "error");
            } else if (e.error === "no-speech") {
                showStatus("No speech heard — try again", "error");
            } else {
                showStatus("Voice error: " + e.error, "error");
            }
        };

        recognition.onresult = function(event) {
            var interim = "";
            var finalText = "";
            for (var i = event.resultIndex; i < event.results.length; i++) {
                var t = event.results[i][0].transcript;
                if (event.results[i].isFinal) finalText += t;
                else interim += t;
            }
            if (interim) showStatus("Hearing: " + interim, "listen");
            if (finalText) {
                showStatus("You said: “" + finalText.trim() + "”", "ok");
                handleCommand(finalText.trim());
            }
        };

        return true;
    }

    function setMicState(on) {
        var btn = document.getElementById("mic-btn");
        if (!btn) return;
        if (on) btn.classList.add("listening");
        else btn.classList.remove("listening");
    }

    function showStatus(msg, kind) {
        var el = document.getElementById("voice-status");
        if (!el) {
            el = document.createElement("div");
            el.id = "voice-status";
            el.className = "voice-status";
            document.body.appendChild(el);
        }
        el.textContent = msg;
        el.className = "voice-status show " + (kind || "");
        clearTimeout(showStatus._t);
        showStatus._t = setTimeout(function() {
            el.classList.remove("show");
        }, 4000);
    }

    function toggle() {
        if (!recognition) {
            if (!init()) {
                alert("Voice not supported. Use Chrome or Edge.");
                return;
            }
        }
        if (isListening) {
            try {
                recognition.stop();
            } catch (e) {}
            showStatus("Stopped", "ok");
        } else {
            try {
                recognition.lang = preferredLang;
                recognition.start();
            } catch (e) {
                console.error(e);
                showStatus("Could not start mic", "error");
            }
        }
    }

    function setLang(lang) {
        preferredLang = lang || "en-IN";
        if (recognition) recognition.lang = preferredLang;
        showStatus("Voice language: " + preferredLang, "ok");
    }

    function normalize(text) {
        return String(text || "")
            .toLowerCase()
            .replace(/[^\w\s\u0900-\u097F]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    /** Strip filler words from song query */
    function cleanQuery(q) {
        return q
            .replace(/^(the|a|an|song|gaana|gana|please|pls)\s+/i, "")
            .replace(/\s+(please|pls|song|gaana)$/i, "")
            .trim();
    }

    async function handleCommand(text) {
        var lower = normalize(text);
        console.log("Voice command:", lower);

        // ---- Hindi + English player controls ----
        if (
            /\b(pause|stop|ruk|roko|band|band karo|rok do)\b/.test(lower) ||
            lower === "रुको" ||
            lower.indexOf("रोक") !== -1
        ) {
            Player.pause();
            speak("Paused");
            showStatus("⏸ Paused", "ok");
            return;
        }

        // play / resume without song name
        if (
            (/^\s*(play|resume|continue|chalao|chalu|start)\s*$/.test(lower) ||
                /\b(resume|continue|unpause|dobara|start again)\b/.test(lower)) &&
            !/\b(play|chalao)\s+\w+/.test(lower)
        ) {
            Player.play();
            speak("Playing");
            showStatus("▶ Playing", "ok");
            return;
        }

        if (/\b(next|skip|aage|agli|agla|agla gaana|next song)\b/.test(lower)) {
            Player.next();
            speak("Next");
            showStatus("⏭ Next", "ok");
            return;
        }

        if (/\b(previous|prev|back|peeche|pichla|pichhli|last song)\b/.test(lower)) {
            Player.prev();
            speak("Previous");
            showStatus("⏮ Previous", "ok");
            return;
        }

        if (
            /volume up|louder|increase volume|awaz badhao|awaaz badhao|sound badhao|volume badhao/.test(
                lower
            )
        ) {
            Player.volumeUp();
            speak("Volume up");
            showStatus("🔊 Volume up", "ok");
            return;
        }

        if (
            /volume down|softer|decrease volume|lower volume|awaz kam|awaaz kam|sound kam|volume kam/.test(
                lower
            )
        ) {
            Player.volumeDown();
            speak("Volume down");
            showStatus("🔉 Volume down", "ok");
            return;
        }

        if (/\b(mute|chup|silent)\b/.test(lower)) {
            Player.mute();
            speak("Muted");
            showStatus("🔇 Muted", "ok");
            return;
        }

        if (/\b(unmute|awaz on|sound on)\b/.test(lower)) {
            Player.unmute();
            speak("Unmuted");
            showStatus("🔊 Unmuted", "ok");
            return;
        }

        // Liked songs
        if (/\b(liked|favourites|favorites|pasand|pasandeeda)\b/.test(lower)) {
            showStatus("♥ Playing liked songs…", "ok");
            if (window.App && App.playLiked) await App.playLiked();
            speak("Liked songs");
            return;
        }

        // Recently played
        if (/\b(recent|history|recently played|pichle|last played)\b/.test(lower)) {
            showStatus("🕒 Opening recently played…", "ok");
            if (window.App && App.showRecent) App.showRecent();
            speak("Recently played");
            return;
        }

        // Lyrics
        if (/\b(lyrics|geet ke bol|bol dikhao)\b/.test(lower)) {
            if (window.App && App.showLyrics) App.showLyrics();
            showStatus("📝 Lyrics", "ok");
            return;
        }

        // Home
        if (/\b(home|ghar|main page)\b/.test(lower) && !/play/.test(lower)) {
            if (window.App && App.showHome) App.showHome();
            showStatus("🏠 Home", "ok");
            return;
        }

        // Search only (don't auto-play)
        var searchOnly = lower.match(/^(?:search|khojo|dhundo|find)\s+(.+)/);
        if (searchOnly) {
            var sq = cleanQuery(searchOnly[1]);
            showStatus("🔍 Search: " + sq, "ok");
            if (window.App && App.doSearch) await App.doSearch(sq);
            speak("Searching " + sq);
            return;
        }

        // Play <song>
        var playMatch = lower.match(
            /^(?:play|start|chalao|chala do|gaana chalao|song)\s+(.+)/
        );
        if (playMatch) {
            var q = cleanQuery(playMatch[1]);
            // remove trailing "song" / "gaana"
            q = q.replace(/\s+(song|gaana|gana)$/i, "").trim();
            if (q) {
                showStatus("▶ Playing: " + q, "ok");
                speak("Playing " + q);
                if (window.App && App.searchAndPlay) await App.searchAndPlay(q);
                return;
            }
        }

        // Backend parser fallback
        try {
            var res = await window.Auth.api("/voice/parse", {
                method: "POST",
                body: JSON.stringify({ text: text }),
            });
            await executeAction(res);
        } catch (err) {
            console.error(err);
            // last resort: treat as song name
            var fallback = cleanQuery(lower.replace(/^(play|search)\s+/, ""));
            if (fallback.length > 1) {
                showStatus("▶ Trying: " + fallback, "ok");
                if (window.App && App.searchAndPlay) await App.searchAndPlay(fallback);
            } else {
                showStatus("Didn't understand — try “play Kesariya”", "error");
                speak("Sorry, I did not understand");
            }
        }
    }

    async function executeAction(res) {
        if (!res || !res.action) return;
        switch (res.action) {
            case "play_search":
                showStatus("▶ " + res.query, "ok");
                speak("Playing " + res.query);
                if (window.App) await App.searchAndPlay(res.query);
                break;
            case "search":
                showStatus("🔍 " + res.query, "ok");
                if (window.App) await App.doSearch(res.query);
                break;
            case "play_liked":
                if (window.App) await App.playLiked();
                break;
            case "pause":
                Player.pause();
                break;
            case "resume":
                Player.play();
                break;
            case "next":
                Player.next();
                break;
            case "previous":
                Player.prev();
                break;
            case "volume_up":
                Player.volumeUp();
                break;
            case "volume_down":
                Player.volumeDown();
                break;
            case "mute":
                Player.mute();
                break;
            case "unmute":
                Player.unmute();
                break;
            default:
                showStatus("Unknown command", "error");
                speak("Sorry, I didn't catch that");
        }
    }

    function speak(text) {
        if (!window.speechSynthesis) return;
        try {
            window.speechSynthesis.cancel();
            var u = new SpeechSynthesisUtterance(text);
            u.rate = 1.05;
            u.pitch = 1;
            u.lang = preferredLang.indexOf("hi") === 0 ? "hi-IN" : "en-IN";
            window.speechSynthesis.speak(u);
        } catch (e) {}
    }

    return {
        init: init,
        toggle: toggle,
        handleCommand: handleCommand,
        setLang: setLang,
    };
})();

window.Voice = Voice;
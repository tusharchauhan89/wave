import { useCallback, useEffect, useRef, useState } from "react";
import { parseVoiceCommand } from "../services/voice";
import { usePlayer } from "../context/PlayerContext";
import { searchMusic } from "../services/music";

type StatusKind = "listen" | "ok" | "error" | "";

export function useVoice() {
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState("");
  const [statusKind, setStatusKind] = useState<StatusKind>("");
  const recognitionRef = useRef<any>(null);
  const { playSong, pause, play, next, previous, setVolume, toggleMute, volume, isMuted } =
    usePlayer();

  const showStatus = useCallback((msg: string, kind: StatusKind = "") => {
    setStatus(msg);
    setStatusKind(kind);
    setTimeout(() => {
      setStatus("");
      setStatusKind("");
    }, 3500);
  }, []);

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.05;
      u.lang = "en-IN";
      window.speechSynthesis.speak(u);
    } catch {
      /* ignore */
    }
  }, []);

  const runAction = useCallback(
    async (action?: string, query?: string) => {
      if (!action) return;

      try {
        switch (action) {
          case "play_search": {
            if (!query) break;
            showStatus(`▶ Playing: ${query}`, "ok");
            speak(`Playing ${query}`);
            const results = await searchMusic(query, 10);
            const songs = Array.isArray(results) ? results : [];
            if (songs.length > 0) {
              await playSong(songs[0], songs);
            }
            break;
          }
          case "search": {
            if (query) {
              window.location.href = `/search?q=${encodeURIComponent(query)}`;
            }
            break;
          }
          case "pause":
            pause();
            showStatus("⏸ Paused", "ok");
            speak("Paused");
            break;
          case "resume":
            await play();
            showStatus("▶ Playing", "ok");
            speak("Playing");
            break;
          case "next":
            await next();
            showStatus("⏭ Next", "ok");
            speak("Next");
            break;
          case "previous":
            await previous();
            showStatus("⏮ Previous", "ok");
            speak("Previous");
            break;
          case "volume_up":
            setVolume(Math.min(1, (volume || 0.7) + 0.1));
            showStatus("🔊 Volume up", "ok");
            break;
          case "volume_down":
            setVolume(Math.max(0, (volume || 0.7) - 0.1));
            showStatus("🔉 Volume down", "ok");
            break;
          case "mute":
            if (!isMuted) toggleMute();
            showStatus("🔇 Muted", "ok");
            break;
          case "unmute":
            if (isMuted) toggleMute();
            showStatus("🔊 Unmuted", "ok");
            break;
          case "play_liked":
            // optional: wire your liked songs later
            showStatus("♥ Liked songs", "ok");
            break;
          default:
            showStatus("Didn't understand", "error");
            speak("Sorry, I did not understand");
        }
      } catch (err) {
        console.error("Voice action error:", err);
        showStatus("Action failed", "error");
      }
    },
    [playSong, pause, play, next, previous, setVolume, toggleMute, volume, isMuted, showStatus, speak]
  );

  const handleCommand = useCallback(
    async (text: string) => {
      const lower = text.toLowerCase().trim();
      console.log("Voice:", lower);

      // Quick local commands
      if (/\b(pause|stop|ruk|roko)\b/.test(lower)) {
        await runAction("pause");
        return;
      }
      if (/\b(next|skip|aage)\b/.test(lower)) {
        await runAction("next");
        return;
      }
      if (/\b(previous|prev|back|peeche)\b/.test(lower)) {
        await runAction("previous");
        return;
      }
      if (/volume up|louder|awaz badhao/.test(lower)) {
        await runAction("volume_up");
        return;
      }
      if (/volume down|softer|awaz kam/.test(lower)) {
        await runAction("volume_down");
        return;
      }
      if (/\bmute\b/.test(lower)) {
        await runAction("mute");
        return;
      }
      if (/\bunmute\b/.test(lower)) {
        await runAction("unmute");
        return;
      }

      const playMatch = lower.match(/(?:play|chalao|start)\s+(.+)/);
      if (playMatch) {
        await runAction("play_search", playMatch[1].trim());
        return;
      }

      // Backend parser
      try {
        const res = await parseVoiceCommand(text);
        await runAction(res.action, res.query);
      } catch (err) {
        console.error(err);
        // fallback: treat as song search
        if (lower.length > 1) {
          await runAction("play_search", lower);
        } else {
          showStatus("Didn't understand", "error");
        }
      }
    },
    [runAction, showStatus]
  );

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("SpeechRecognition not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      showStatus("Listening…", "listen");
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.onerror = (e: any) => {
      setListening(false);
      if (e.error === "not-allowed") {
        showStatus("Mic permission denied", "error");
      } else if (e.error === "no-speech") {
        showStatus("No speech heard", "error");
      } else {
        showStatus("Voice error: " + e.error, "error");
      }
    };

    recognition.onresult = (event: any) => {
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript;
        }
      }
      if (finalText.trim()) {
        showStatus(`You said: “${finalText.trim()}”`, "ok");
        void handleCommand(finalText.trim());
      }
    };

    recognitionRef.current = recognition;
  }, [handleCommand, showStatus]);

  const toggle = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      alert("Voice not supported. Use Chrome or Edge.");
      return;
    }

    if (listening) {
      try {
        recognition.stop();
      } catch {
        /* ignore */
      }
    } else {
      try {
        recognition.start();
      } catch (e) {
        console.error(e);
        showStatus("Could not start mic", "error");
      }
    }
  }, [listening, showStatus]);

  return {
    listening,
    status,
    statusKind,
    toggle,
  };
}
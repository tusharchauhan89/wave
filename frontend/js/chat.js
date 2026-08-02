const Chat = (() => {
    let history = [];
    let open = false;
    let sending = false;

    function els() {
        return {
            panel: document.getElementById("chat-panel"),
            msgs: document.getElementById("chat-messages"),
            input: document.getElementById("chat-input"),
            send: document.getElementById("chat-send"),
            toggle: document.getElementById("btn-chat"),
            close: document.getElementById("chat-close"),
        };
    }

    function init() {
        var e = els();
        if (!e.panel) return;

        if (e.toggle) e.toggle.addEventListener("click", toggle);
        if (e.close) e.close.addEventListener("click", function() { setOpen(false); });
        if (e.send) e.send.addEventListener("click", submit);
        if (e.input) {
            e.input.addEventListener("keydown", function(ev) {
                if (ev.key === "Enter" && !ev.shiftKey) {
                    ev.preventDefault();
                    submit();
                }
            });
        }

        // welcome
        if (e.msgs && !e.msgs.children.length) {
            addBubble(
                "assistant",
                "Hey! I'm Nova 🎵 — your music companion. Ask me anything: mood recommendations, “play Kesariya”, what Groove can do, or what fits your day."
            );
        }

        // status badge
        Auth.api("/chat/status")
            .then(function(res) {
                var st = document.getElementById("chat-provider");
                if (!st || !res) return;
                if (res.smart) {
                    st.textContent = "AI · " + res.provider;
                } else {
                    var keys = res.keys || {};
                    if (!keys.gemini && !keys.groq && !keys.openai) {
                        st.textContent = "Offline · no API key in .env";
                    } else {
                        st.textContent = "Offline · key present but provider failed";
                    }
                }
            })
            .catch(function() {
                var st = document.getElementById("chat-provider");
                if (st) st.textContent = "Offline · API unreachable";
            });
    }

    function toggle() {
        setOpen(!open);
    }

    function setOpen(v) {
        open = v;
        var e = els();
        if (e.panel) e.panel.classList.toggle("open", open);
        if (open && e.input) e.input.focus();
    }

    function addBubble(role, text) {
        var e = els();
        if (!e.msgs) return;
        var div = document.createElement("div");
        div.className = "chat-bubble " + role;
        div.textContent = text;
        e.msgs.appendChild(div);
        e.msgs.scrollTop = e.msgs.scrollHeight;
    }

    function addTyping() {
        var e = els();
        var div = document.createElement("div");
        div.className = "chat-bubble assistant typing";
        div.id = "chat-typing";
        div.textContent = "Nova is thinking…";
        e.msgs.appendChild(div);
        e.msgs.scrollTop = e.msgs.scrollHeight;
    }

    function removeTyping() {
        var t = document.getElementById("chat-typing");
        if (t) t.remove();
    }

    async function submit() {
        var e = els();
        if (!e.input || sending) return;
        var text = e.input.value.trim();
        if (!text) return;
        e.input.value = "";
        addBubble("user", text);
        history.push({ role: "user", content: text });
        sending = true;
        addTyping();
        try {
            var res = await Auth.api("/chat/", {
                method: "POST",
                body: JSON.stringify({
                    message: text,
                    history: history.slice(-10),
                }),
            });
            removeTyping();
            var data = (res && res.data) || res || {};
            var reply = data.reply || "Hmm, I couldn't reply.";
            addBubble("assistant", reply);
            history.push({ role: "assistant", content: reply });
            await runAction(data.action, data.query);
        } catch (err) {
            removeTyping();
            addBubble("assistant", "Error: " + (err.message || "chat failed"));
        } finally {
            sending = false;
        }
    }

    async function runAction(action, query) {
        if (!action || !window.App) return;
        switch (action) {
            case "play_search":
                if (query) await App.searchAndPlay(query);
                break;
            case "search":
                if (query) await App.doSearch(query);
                break;
            case "play_liked":
                await App.playLiked();
                break;
            case "show_recent":
                if (App.showRecent) App.showRecent();
                break;
            case "show_home":
                if (App.showHome) App.showHome();
                break;
        }
    }

    // quick chips
    function quick(text) {
        var e = els();
        if (e.input) e.input.value = text;
        setOpen(true);
        submit();
    }

    return { init: init, toggle: toggle, quick: quick, setOpen: setOpen };
})();

window.Chat = Chat;
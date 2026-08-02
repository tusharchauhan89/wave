const App = (() => {
    const contentEl = () => document.getElementById("main-content");

    const PLACEHOLDER =
        "data:image/svg+xml," +
        encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect fill="#333" width="40" height="40"/><text x="50%" y="54%" fill="#888" font-size="16" text-anchor="middle">♪</text></svg>'
        );

    const PLACEHOLDER_BIG =
        "data:image/svg+xml," +
        encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><rect fill="#1db954" width="180" height="180"/><text x="50%" y="54%" fill="#000" font-size="28" text-anchor="middle">♪</text></svg>'
        );

    function unwrapData(payload) {
        var d = payload;
        if (d && d.data) d = d.data;
        if (d && d.data && (d.path || d.data.songs || d.data.topQuery || d.data.id)) d = d.data;
        if (d && d.data && !Array.isArray(d) && !d.songs && !d.id && !d.name) d = d.data;
        return d;
    }

    function extractSongs(payload) {
        var d = unwrapData(payload);
        var songs = [];

        function pushList(list) {
            if (!list || !Array.isArray(list)) return;
            for (var i = 0; i < list.length; i++) {
                var s = list[i];
                if (!s) continue;
                if (s.type && s.type !== "song" && !s.downloadUrl && !s.primaryArtists && !s.singers && !s.title && !s.name)
                    continue;
                songs.push(s);
            }
        }
        if (d && d.songs && d.songs.results) pushList(d.songs.results);
        else if (d && d.songs && Array.isArray(d.songs)) pushList(d.songs);
        if (d && d.topQuery && d.topQuery.results) pushList(d.topQuery.results);
        if (d && d.topSongs && Array.isArray(d.topSongs)) pushList(d.topSongs);
        if (d && d.results && Array.isArray(d.results)) pushList(d.results);
        if (Array.isArray(d)) pushList(d);
        if (d && Array.isArray(d.data)) pushList(d.data);

        var seen = {};
        var unique = [];
        for (var j = 0; j < songs.length; j++) {
            var id = String(songs[j].id || songs[j].song_id || j);
            if (seen[id]) continue;
            seen[id] = true;
            unique.push(songs[j]);
        }
        return unique;
    }

    function extractAlbumsFromSearch(payload) {
        var d = unwrapData(payload);
        if (d && d.albums && d.albums.results) return d.albums.results;
        if (d && d.albums && Array.isArray(d.albums)) return d.albums;
        return [];
    }

    function extractArtistsFromSearch(payload) {
        var d = unwrapData(payload);
        if (d && d.artists && d.artists.results) return d.artists.results;
        if (d && d.artists && Array.isArray(d.artists)) return d.artists;
        return [];
    }


    function scoreSong(s, query) {
        var q = String(query || "").toLowerCase().replace(/\bby\b/g, " ").replace(/\s+/g, " ").trim();
        if (!q) return 0;
        var tokens = q.split(" ").filter(Boolean);
        var name = String(s.title || s.name || s.song || "").toLowerCase();
        var artist = String(
            s.primaryArtists || s.primary_artists || s.singers || s.subtitle || ""
        ).toLowerCase();
        if (s.artists && s.artists.primary) {
            artist += " " + s.artists.primary.map(function(a) { return a.name || ""; }).join(" ").toLowerCase();
        }
        var album = "";
        if (typeof s.album === "string") album = s.album.toLowerCase();
        else if (s.album && s.album.name) album = String(s.album.name).toLowerCase();
        var blob = name + " " + artist + " " + album;
        var score = 0;
        // exact title match
        if (name === tokens[0] || name === q) score += 50;
        if (name.indexOf(tokens[0]) === 0) score += 25;
        tokens.forEach(function(t) {
            if (name.indexOf(t) !== -1) score += 12;
            if (artist.indexOf(t) !== -1) score += 18; // artist match heavily weighted
            if (blob.indexOf(t) !== -1) score += 3;
        });
        // all tokens present
        var all = tokens.every(function(t) { return blob.indexOf(t) !== -1; });
        if (all) score += 40;
        return score;
    }

    function rankSongs(songs, query) {
        if (!songs || !songs.length) return songs || [];
        var scored = songs.map(function(s) {
            return { s: s, score: scoreSong(s, query) };
        });
        scored.sort(function(a, b) { return b.score - a.score; });
        return scored.map(function(x) { return x.s; });
    }

    function getImageUrl(s) {
        if (!s) return "";
        if (Array.isArray(s.image)) {
            var best = s.image[s.image.length - 1] || s.image[0];
            return (best && (best.url || best.link)) || "";
        }
        if (typeof s.image === "string") return s.image;
        return "";
    }

    function escapeHtml(str) {
        return String(str == null ? "" : str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function greeting() {
        var h = new Date().getHours();
        if (h < 12) return "morning";
        if (h < 18) return "afternoon";
        return "evening";
    }

    function formatDuration(sec) {
        var s = parseInt(sec, 10);
        if (isNaN(s)) return "";
        var m = Math.floor(s / 60);
        var r = (s % 60).toString().padStart(2, "0");
        return m + ":" + r;
    }

    // ---------- Search ----------
    var lastSearchQuery = "";
    var lastSearchPage = 0;
    var lastSearchSongs = [];

    async function doSearch(query, page) {
        if (page === undefined) page = 0;
        if (!query || !query.trim()) return;
        var el = contentEl();
        if (page === 0) {
            el.innerHTML = '<div class="loading">Searching for “' + escapeHtml(query) + '”…</div>';
            lastSearchSongs = [];
        }
        lastSearchQuery = query;
        lastSearchPage = page;
        try {
            var res = await Auth.api(
                "/music/search?query=" + encodeURIComponent(query) + "&page=" + page + "&limit=50"
            );
            var songs = rankSongs(extractSongs(res), query);
            var albums = page === 0 ? extractAlbumsFromSearch(res) : [];
            var artists = page === 0 ? extractArtistsFromSearch(res) : [];
            if (page === 0) lastSearchSongs = songs;
            else {
                var seen = {};
                lastSearchSongs.forEach(function(s) {
                    seen[String(s.id)] = true;
                });
                songs.forEach(function(s) {
                    if (!seen[String(s.id)]) lastSearchSongs.push(s);
                });
            }
            renderSearchPage(query, lastSearchSongs, albums, artists, true);
        } catch (err) {
            el.innerHTML = '<div class="loading">Search failed: ' + err.message + "</div>";
        }
    }

    function renderSearchPage(query, songs, albums, artists, showLoadMore) {
        var el = contentEl();
        var html = '<h2 class="section-title">Results for “' + escapeHtml(query) + '”</h2>';

        if (artists && artists.length) {
            html += '<h3 class="section-sub">Artists</h3><div class="grid" style="margin-bottom:24px">';
            artists.slice(0, 6).forEach(function(a) {
                var name = a.title || a.name || "Artist";
                var img = getImageUrl(a);
                var aid = a.id || "";
                html +=
                    '<div class="card" onclick="App.showArtist(\'' +
                    escapeHtml(aid) +
                    "')\">" +
                    '<img src="' +
                    (img || PLACEHOLDER_BIG) +
                    '" onerror="this.src=\'' +
                    PLACEHOLDER_BIG +
                    '\'">' +
                    "<h4>" +
                    escapeHtml(name) +
                    "</h4>" +
                    "<p>Artist</p></div>";
            });
            html += "</div>";
        }

        if (albums && albums.length) {
            html += '<h3 class="section-sub">Albums</h3><div class="grid" style="margin-bottom:24px">';
            albums.slice(0, 6).forEach(function(a) {
                var name = a.title || a.name || "Album";
                var img = getImageUrl(a);
                var aid = a.id || "";
                var sub = a.artist || a.description || "Album";
                html +=
                    '<div class="card" onclick="App.showAlbum(\'' +
                    escapeHtml(aid) +
                    "')\">" +
                    '<img src="' +
                    (img || PLACEHOLDER_BIG) +
                    '" onerror="this.src=\'' +
                    PLACEHOLDER_BIG +
                    '\'">' +
                    "<h4>" +
                    escapeHtml(name) +
                    "</h4>" +
                    "<p>" +
                    escapeHtml(sub) +
                    "</p></div>";
            });
            html += "</div>";
        }

        html +=
            '<h3 class="section-sub">Songs (' +
            (songs ? songs.length : 0) +
            ")</h3>";
        el.innerHTML = html;
        if (songs && songs.length) {
            renderSongListInner(el, songs, showLoadMore, false);
        } else {
            el.innerHTML += '<p style="color:var(--text-muted)">No songs found.</p>';
        }
    }

    function renderSongList(title, songs, showLoadMore) {
        var el = contentEl();
        var html = '<h2 class="section-title">' + escapeHtml(title) + "</h2>";
        el.innerHTML = html;
        if (!songs || !songs.length) {
            el.innerHTML += '<p style="color:var(--text-muted)">No songs found.</p>';
            return;
        }
        renderSongListInner(el, songs, showLoadMore, true);
    }

    function renderSongListInner(el, songs, showLoadMore, append) {
        var html = '<div class="song-list">';
        songs.forEach(function(s, i) {
            var name = s.title || s.name || s.song || "Unknown";
            var artist = s.primaryArtists || s.primary_artists || s.singers || s.subtitle || "";
            var img = getImageUrl(s);
            var albumName = typeof s.album === "string" ? s.album : (s.album && s.album.name) || "";
            var albumId = s.album && s.album.id ? s.album.id : "";
            var artistId = "";
            if (s.artists && s.artists.primary && s.artists.primary[0]) {
                artistId = s.artists.primary[0].id || "";
                if (!artist) artist = s.artists.primary.map(function(a) { return a.name; }).join(", ");
            }
            var dur = s.duration ? formatDuration(s.duration) : "";

            html +=
                '<div class="song-row" data-index="' +
                i +
                '">' +
                '<img src="' +
                (img || PLACEHOLDER) +
                '" onerror="this.src=\'' +
                PLACEHOLDER +
                '\'">' +
                "<div>" +
                '<div class="title">' +
                escapeHtml(name) +
                "</div>" +
                '<div class="artist">' +
                (artistId ?
                    '<a href="#" class="link-artist" data-artist-id="' +
                    escapeHtml(artistId) +
                    '">' +
                    escapeHtml(artist) +
                    "</a>" :
                    escapeHtml(artist)) +
                "</div></div>" +
                '<div class="artist">' +
                (albumId ?
                    '<a href="#" class="link-album" data-album-id="' +
                    escapeHtml(albumId) +
                    '">' +
                    escapeHtml(albumName) +
                    "</a>" :
                    escapeHtml(albumName)) +
                "</div>" +
                '<div class="duration">' +
                dur +
                "</div>" +
                '<button class="like-btn" data-id="' +
                (s.id || "") +
                '" title="Like">♥</button>' +
                "</div>";
        });
        html += "</div>";
        if (showLoadMore && lastSearchQuery) {
            html +=
                '<div style="text-align:center;margin:24px 0">' +
                '<button class="btn-green" id="btn-load-more">Load more songs</button></div>';
        }

        if (append) el.innerHTML += html;
        else el.innerHTML += html;

        var loadMoreBtn = document.getElementById("btn-load-more");
        if (loadMoreBtn) {
            loadMoreBtn.onclick = function() {
                loadMoreBtn.textContent = "Loading…";
                loadMoreBtn.disabled = true;
                doSearch(lastSearchQuery, lastSearchPage + 1);
            };
        }

        el.querySelectorAll(".song-row").forEach(function(row, idx) {
            row.addEventListener("click", function(e) {
                if (e.target.classList.contains("like-btn")) return;
                if (e.target.classList.contains("link-album") || e.target.classList.contains("link-artist"))
                    return;
                Player.playQueue(songs, idx);
            });
        });

        el.querySelectorAll(".link-album").forEach(function(a) {
            a.addEventListener("click", function(e) {
                e.preventDefault();
                e.stopPropagation();
                showAlbum(a.getAttribute("data-album-id"));
            });
        });
        el.querySelectorAll(".link-artist").forEach(function(a) {
            a.addEventListener("click", function(e) {
                e.preventDefault();
                e.stopPropagation();
                showArtist(a.getAttribute("data-artist-id"));
            });
        });

        el.querySelectorAll(".like-btn").forEach(function(btn) {
            btn.addEventListener("click", async function(e) {
                e.stopPropagation();
                var id = btn.dataset.id;
                if (!id) {
                    alert("Song id missing");
                    return;
                }
                var song = songs.find(function(s) {
                    return String(s.id) === String(id);
                });
                if (!song) return;
                if (!Auth.getToken()) {
                    alert("Please login again");
                    return;
                }
                try {
                    btn.disabled = true;
                    await Auth.api("/playlists/liked", {
                        method: "POST",
                        body: JSON.stringify({ song_id: String(id), song_data: song }),
                    });
                    btn.style.color = "#1db954";
                    btn.textContent = "♥ Liked";
                } catch (err) {
                    alert("Could not like: " + (err.message || err));
                } finally {
                    btn.disabled = false;
                }
            });
        });
    }

    async function searchAndPlay(query) {
        try {
            var res = await Auth.api(
                "/music/search?query=" + encodeURIComponent(query) + "&limit=30"
            );
            var songs = rankSongs(extractSongs(res), query);
            if (songs.length) Player.playQueue(songs, 0);
            else alert("No song found for: " + query);
        } catch (err) {
            alert(err.message);
        }
    }

    // ---------- Album page ----------
    async function showAlbum(albumId) {
        if (!albumId) return;
        var el = contentEl();
        el.innerHTML = '<div class="loading">Loading album…</div>';
        try {
            var res = await Auth.api("/music/album/" + encodeURIComponent(albumId));
            var album = unwrapData(res);
            if (Array.isArray(album)) album = album[0];
            if (!album || !album.id) {
                el.innerHTML = "<p>Album not found</p>";
                return;
            }

            var img = getImageUrl(album);
            var artists =
                (album.artists &&
                    album.artists.primary &&
                    album.artists.primary.map(function(a) {
                        return a.name;
                    }).join(", ")) ||
                album.description ||
                "";
            var primaryArtistId =
                album.artists && album.artists.primary && album.artists.primary[0] ?
                album.artists.primary[0].id :
                "";

            var header =
                '<button class="btn-back" onclick="App.showHome()">← Back</button>' +
                '<div class="entity-header">' +
                '<img class="entity-cover" src="' +
                (img || PLACEHOLDER_BIG) +
                '" onerror="this.src=\'' +
                PLACEHOLDER_BIG +
                '\'">' +
                "<div>" +
                '<p class="entity-type">Album</p>' +
                "<h1>" +
                escapeHtml(album.name || album.title) +
                "</h1>" +
                "<p>" +
                (primaryArtistId ?
                    '<a href="#" class="link-artist" data-artist-id="' +
                    primaryArtistId +
                    '">' +
                    escapeHtml(artists) +
                    "</a>" :
                    escapeHtml(artists)) +
                "</p>" +
                "<p style=\"color:var(--text-muted)\">" +
                escapeHtml(String(album.year || "")) +
                (album.songCount ? " · " + album.songCount + " songs" : "") +
                (album.language ? " · " + album.language : "") +
                "</p>" +
                '<button class="btn-green" id="btn-play-album">▶ Play album</button>' +
                "</div></div>";

            el.innerHTML = header;
            var songs = album.songs && Array.isArray(album.songs) ? album.songs : [];
            if (songs.length) {
                renderSongListInner(el, songs, false, true);
                document.getElementById("btn-play-album").onclick = function() {
                    Player.playQueue(songs, 0);
                };
            } else {
                el.innerHTML += '<p style="color:var(--text-muted)">No songs in this album.</p>';
            }

            el.querySelectorAll(".link-artist").forEach(function(a) {
                a.addEventListener("click", function(e) {
                    e.preventDefault();
                    showArtist(a.getAttribute("data-artist-id"));
                });
            });
        } catch (err) {
            el.innerHTML = "<p>Failed to load album: " + escapeHtml(err.message) + "</p>";
        }
    }

    // ---------- Artist page ----------
    async function showArtist(artistId) {
        if (!artistId) return;
        var el = contentEl();
        el.innerHTML = '<div class="loading">Loading artist…</div>';
        try {
            var res = await Auth.api("/music/artist/" + encodeURIComponent(artistId));
            var artist = unwrapData(res);
            if (Array.isArray(artist)) artist = artist[0];
            if (!artist || !artist.id) {
                el.innerHTML = "<p>Artist not found</p>";
                return;
            }

            var img = getImageUrl(artist);
            var bio = "";
            if (artist.bio && Array.isArray(artist.bio) && artist.bio[0]) {
                bio = artist.bio[0].text || "";
            } else if (typeof artist.bio === "string") {
                bio = artist.bio;
            }
            if (bio.length > 280) bio = bio.slice(0, 280) + "…";

            var header =
                '<button class="btn-back" onclick="App.showHome()">← Back</button>' +
                '<div class="entity-header">' +
                '<img class="entity-cover round" src="' +
                (img || PLACEHOLDER_BIG) +
                '" onerror="this.src=\'' +
                PLACEHOLDER_BIG +
                '\'">' +
                "<div>" +
                '<p class="entity-type">Artist</p>' +
                "<h1>" +
                escapeHtml(artist.name || artist.title) +
                "</h1>" +
                (artist.followerCount ?
                    '<p style="color:var(--text-muted)">' +
                    Number(artist.followerCount).toLocaleString() +
                    " followers</p>" :
                    "") +
                (bio ? '<p class="entity-bio">' + escapeHtml(bio) + "</p>" : "") +
                '<button class="btn-green" id="btn-play-artist">▶ Play top songs</button>' +
                "</div></div>";

            el.innerHTML = header;

            var topSongs = artist.topSongs && Array.isArray(artist.topSongs) ? artist.topSongs : [];
            var topAlbums = artist.topAlbums && Array.isArray(artist.topAlbums) ? artist.topAlbums : [];

            if (topAlbums.length) {
                var albHtml = '<h2 class="section-title" style="margin-top:24px">Albums</h2><div class="grid">';
                topAlbums.forEach(function(a) {
                    var aname = a.name || a.title || "Album";
                    var aimg = getImageUrl(a);
                    albHtml +=
                        '<div class="card" data-album-id="' +
                        (a.id || "") +
                        '">' +
                        '<img src="' +
                        (aimg || PLACEHOLDER_BIG) +
                        '" onerror="this.src=\'' +
                        PLACEHOLDER_BIG +
                        '\'">' +
                        "<h4>" +
                        escapeHtml(aname) +
                        "</h4>" +
                        "<p>" +
                        escapeHtml(String(a.year || a.songCount || "")) +
                        "</p></div>";
                });
                albHtml += "</div>";
                el.innerHTML += albHtml;
                el.querySelectorAll("[data-album-id]").forEach(function(card) {
                    card.addEventListener("click", function() {
                        var id = card.getAttribute("data-album-id");
                        if (id) showAlbum(id);
                    });
                });
            }

            if (topSongs.length) {
                el.innerHTML += '<h2 class="section-title" style="margin-top:24px">Popular</h2>';
                renderSongListInner(el, topSongs, false, true);
                var playBtn = document.getElementById("btn-play-artist");
                if (playBtn) {
                    playBtn.onclick = function() {
                        Player.playQueue(topSongs, 0);
                    };
                }
            } else {
                el.innerHTML += '<p style="color:var(--text-muted)">No top songs found.</p>';
            }
        } catch (err) {
            el.innerHTML = "<p>Failed to load artist: " + escapeHtml(err.message) + "</p>";
        }
    }

    // ---------- Home / Charts ----------
    async function showHome() {
        var el = contentEl();
        el.innerHTML = '<div class="loading">Loading home…</div>';

        var sections = [
            { title: "Trending Hindi", q: "trending hindi songs" },
            { title: "Arijit Singh", q: "Arijit Singh" },
            { title: "Punjabi Hits", q: "punjabi hits" },
            { title: "English Pop", q: "english pop hits" },
        ];

        var html =
            '<h2 class="section-title">Good ' +
            greeting() +
            "</h2>" +
            '<p style="color:var(--text-muted);margin-bottom:16px">Discover music · Albums · Artists · Playlists</p>';

        // Language filters
        html += '<div class="filter-section"><p class="filter-label">Language</p><div class="filter-chips">';
        ["hindi", "english", "punjabi", "tamil", "telugu"].forEach(function(v) {
            html +=
                '<button class="chip" onclick="App.applyFilter(\'' +
                v +
                "')\">" +
                v.charAt(0).toUpperCase() +
                v.slice(1) +
                "</button>";
        });
        html += "</div></div>";

        // Mood / genre filters
        html += '<div class="filter-section"><p class="filter-label">Mood & Genre</p><div class="filter-chips">';
        [
            ["romantic", "Romantic"],
            ["party", "Party"],
            ["lofi", "Lofi"],
            ["workout", "Workout"],
            ["sad", "Sad"],
            ["happy", "Happy"],
            ["devotional", "Devotional"],
            ["indie", "Indie"],
            ["rap", "Rap"],
            ["classical", "Classical"],
        ].forEach(function(pair) {
            html +=
                '<button class="chip" onclick="App.applyFilter(\'' +
                pair[0] +
                "')\">" +
                pair[1] +
                "</button>";
        });
        html += "</div></div>";

        html += '<div class="grid" style="margin:24px 0 32px">';
        html +=
            '<div class="card" onclick="App.showRecent()"><img src="' +
            PLACEHOLDER_BIG +
            '"><h4>Recently Played</h4><p>Your history</p></div>';
        html +=
            '<div class="card" onclick="App.playLiked()"><img src="' +
            PLACEHOLDER_BIG +
            '"><h4>Liked Songs</h4><p>Your favourites</p></div>';
        html +=
            '<div class="card" onclick="App.showPlaylists()"><img src="' +
            PLACEHOLDER_BIG +
            '"><h4>Your Playlists</h4><p>Manage</p></div>';
        html +=
            '<div class="card" onclick="App.showArtist(\'459320\')"><img src="https://c.saavncdn.com/artists/Arijit_Singh_004_20241118063717_500x500.jpg" onerror="this.src=\'' +
            PLACEHOLDER_BIG +
            '\'"><h4>Arijit Singh</h4><p>Artist</p></div>';
        html += "</div>";

        el.innerHTML = html + '<div class="loading">Loading charts…</div>';

        for (var i = 0; i < sections.length; i++) {
            try {
                var res = await Auth.api(
                    "/music/search?query=" + encodeURIComponent(sections[i].q) + "&limit=20"
                );
                var songs = extractSongs(res).slice(0, 8);
                if (!songs.length) continue;
                html +=
                    '<h2 class="section-title" style="margin-top:28px">' +
                    escapeHtml(sections[i].title) +
                    "</h2>";
                html += '<div class="grid">';
                songs.forEach(function(s, idx) {
                    var name = s.title || s.name || "Song";
                    var artist = s.primaryArtists || s.singers || "";
                    var img = getImageUrl(s);
                    html +=
                        '<div class="card chart-card" data-section="' +
                        i +
                        '" data-idx="' +
                        idx +
                        '">' +
                        '<img src="' +
                        (img || PLACEHOLDER_BIG) +
                        '" onerror="this.src=\'' +
                        PLACEHOLDER_BIG +
                        '\'">' +
                        "<h4>" +
                        escapeHtml(name) +
                        "</h4>" +
                        "<p>" +
                        escapeHtml(artist) +
                        "</p></div>";
                });
                html += "</div>";
                window.__chartSongs = window.__chartSongs || {};
                window.__chartSongs[i] = songs;
                el.innerHTML = html;
            } catch (e) {
                console.warn("chart section failed", sections[i], e);
            }
        }

        el.querySelectorAll(".chart-card").forEach(function(card) {
            card.addEventListener("click", function() {
                var sec = card.getAttribute("data-section");
                var idx = parseInt(card.getAttribute("data-idx"), 10);
                var list = (window.__chartSongs && window.__chartSongs[sec]) || [];
                if (list.length) Player.playQueue(list, idx);
            });
        });
    }

    // ---------- Liked ----------
    async function playLiked() {
        try {
            var res = await Auth.api("/playlists/liked/list");
            var items = res.data || [];
            if (!items.length) {
                alert("No liked songs yet");
                return;
            }
            Player.playQueue(
                items.map(function(i) {
                    return i.song_data;
                }),
                0
            );
        } catch (err) {
            alert("Login required");
        }
    }

    async function showLiked() {
        try {
            var res = await Auth.api("/playlists/liked/list");
            var items = res.data || [];
            var songs = items.map(function(i) {
                return i.song_data;
            });
            renderSongList("Liked Songs", songs);
        } catch (err) {
            contentEl().innerHTML = "<p>Login required</p>";
        }
    }

    async function showRecent() {
        var el = contentEl();
        el.innerHTML = '<div class="loading">Loading recently played…</div>';
        try {
            var res = await Auth.api("/playlists/history/list");
            var items = res.data || [];
            if (!items.length) {
                el.innerHTML =
                    '<h2 class="section-title">Recently Played</h2>' +
                    '<p style="color:var(--text-muted)">Play some songs — they will show up here.</p>';
                return;
            }
            var songs = items
                .map(function(i) {
                    return i.song_data;
                })
                .filter(Boolean);
            renderSongList("Recently Played · " + songs.length + " songs", songs);
        } catch (err) {
            el.innerHTML =
                '<h2 class="section-title">Recently Played</h2>' +
                '<p style="color:var(--text-muted)">Could not load history.</p>' +
                '<p style="color:#888;font-size:0.85rem">' +
                escapeHtml(err.message || "") +
                "</p>";
        }
    }

    function applyFilter(value) {
        var map = {
            hindi: "hindi songs",
            english: "english songs",
            punjabi: "punjabi songs",
            tamil: "tamil songs",
            telugu: "telugu hits",
            romantic: "romantic bollywood songs",
            party: "party dance bollywood",
            lofi: "lofi chill beats",
            workout: "workout gym motivation songs",
            sad: "sad emotional songs",
            happy: "happy upbeat songs",
            devotional: "devotional bhajan",
            indie: "indie indian songs",
            rap: "hindi rap hip hop",
            classical: "classical indian music",
        };
        doSearch(map[value] || value + " songs");
    }

    // ---------- Playlists ----------
    async function showPlaylists() {
        var el = contentEl();
        el.innerHTML = '<div class="loading">Loading playlists…</div>';
        try {
            var res = await Auth.api("/playlists/");
            var list = res.data || [];
            var html =
                '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">' +
                '<h2 class="section-title" style="margin:0">Your Playlists</h2>' +
                '<button class="btn-green" id="btn-new-playlist">+ New Playlist</button>' +
                "</div>";

            if (!list.length) {
                html += '<p style="color:var(--text-muted)">No playlists yet. Create one!</p>';
            } else {
                html += '<div class="grid">';
                list.forEach(function(pl) {
                    html +=
                        '<div class="card" data-pl="' +
                        pl.id +
                        '">' +
                        '<img src="' +
                        PLACEHOLDER_BIG +
                        '">' +
                        "<h4>" +
                        escapeHtml(pl.name) +
                        "</h4>" +
                        "<p>" +
                        escapeHtml(pl.description || "Playlist") +
                        "</p></div>";
                });
                html += "</div>";
            }
            el.innerHTML = html;

            document.getElementById("btn-new-playlist").onclick = createPlaylistPrompt;
            el.querySelectorAll("[data-pl]").forEach(function(card) {
                card.onclick = function() {
                    openPlaylist(card.getAttribute("data-pl"));
                };
            });
            refreshSidebarPlaylists(list);
        } catch (err) {
            el.innerHTML = "<p>Error: " + err.message + "</p>";
        }
    }

    async function createPlaylistPrompt() {
        var name = prompt("Playlist name:");
        if (!name || !name.trim()) return;
        try {
            await Auth.api("/playlists/", {
                method: "POST",
                body: JSON.stringify({ name: name.trim(), description: "" }),
            });
            showPlaylists();
        } catch (err) {
            alert(err.message);
        }
    }

    async function openPlaylist(id) {
        var el = contentEl();
        el.innerHTML = '<div class="loading">Loading playlist…</div>';
        try {
            var res = await Auth.api("/playlists/" + id);
            var pl = res.data;
            var songs = (pl.songs || []).map(function(row) {
                return row.song_data;
            });
            renderSongList(pl.name + " · " + songs.length + " songs", songs);
        } catch (err) {
            el.innerHTML = "<p>" + err.message + "</p>";
        }
    }

    async function refreshSidebarPlaylists(list) {
        var box = document.getElementById("playlist-list");
        if (!box) return;
        if (!list) {
            try {
                var res = await Auth.api("/playlists/");
                list = res.data || [];
            } catch (e) {
                return;
            }
        }
        var html =
            '<div class="playlist-item" onclick="App.showRecent()">🕒 Recently Played</div>' +
            '<div class="playlist-item" onclick="App.showLiked()">♥ Liked Songs</div>';
        list.forEach(function(pl) {
            html +=
                '<div class="playlist-item" onclick="App.openPlaylist(\'' +
                pl.id +
                "')\">" +
                escapeHtml(pl.name) +
                "</div>";
        });
        box.innerHTML = html;
    }

    // ---------- Lyrics ----------
    async function showLyrics() {
        var q = Player.getQueue();
        var idx = Player.getCurrentIndex();
        var song = q[idx];
        if (!song || !song.id) {
            alert("Play a song first");
            return;
        }
        openLyricsModal(song.name, "Loading lyrics…");
        try {
            var res = await Auth.api("/music/song/" + encodeURIComponent(song.id) + "/lyrics");
            var data = res.data;
            var text = "";
            if (typeof data === "string") text = data;
            else if (data && data.data && data.data.lyrics) text = data.data.lyrics;
            else if (data && data.lyrics) text = data.lyrics;
            else if (data && data.data && typeof data.data === "string") text = data.data;
            else text = "Lyrics not available for this song.";
            if (!text || text === "{}" || text === "null") text = "Lyrics not available for this song.";
            openLyricsModal(song.name, text);
        } catch (err) {
            openLyricsModal(song.name, "Lyrics not found for this song.");
        }
    }

    function openLyricsModal(title, body) {
        var modal = document.getElementById("lyrics-modal");
        if (!modal) return;
        document.getElementById("lyrics-title").textContent = title;
        document.getElementById("lyrics-body").textContent = body;
        modal.classList.add("open");
    }

    function closeLyricsModal() {
        var modal = document.getElementById("lyrics-modal");
        if (modal) modal.classList.remove("open");
    }

    // ---------- Queue panel ----------
    function renderQueue(queue, index) {
        var panel = document.getElementById("queue-list");
        if (!panel) return;
        if (!queue || !queue.length) {
            panel.innerHTML = '<p class="queue-empty">Queue empty</p>';
            return;
        }
        var html = "";
        queue.forEach(function(s, i) {
            html +=
                '<div class="queue-item' +
                (i === index ? " active" : "") +
                '" data-qi="' +
                i +
                '">' +
                '<span class="qi-name">' +
                escapeHtml(s.name) +
                "</span>" +
                '<span class="qi-artist">' +
                escapeHtml(s.artists || "") +
                "</span></div>";
        });
        panel.innerHTML = html;
        panel.querySelectorAll(".queue-item").forEach(function(row) {
            row.onclick = function() {
                var i = parseInt(row.getAttribute("data-qi"), 10);
                Player.playAtIndex(i);
            };
        });
    }

    function toggleQueuePanel() {
        var panel = document.getElementById("queue-panel");
        if (panel) panel.classList.toggle("open");
    }

    // ---------- Init ----------
    function init() {
        if (!Auth.requireAuth()) return;

        Player.init();
        if (window.Chat) Chat.init();

        if (window.Voice) {
            Voice.init();
            // always listen for wake word "Nova"
            setTimeout(function() {
                if (Voice.startAlways) Voice.startAlways();
            }, 800);
        }
        Player.setOnChange(renderQueue);

        var user = Auth.getUser();
        var name =
            (user && user.user_metadata && user.user_metadata.full_name) ||
            (user && user.email && user.email.split("@")[0]) ||
            "User";
        var avatar = document.getElementById("user-avatar");
        var uname = document.getElementById("user-name");
        if (avatar) avatar.textContent = (name[0] || "U").toUpperCase();
        if (uname) uname.textContent = name;

        var input = document.getElementById("search-input");
        if (input) {
            input.addEventListener("keydown", function(e) {
                if (e.key === "Enter") doSearch(input.value);
            });
        }

        var mic = document.getElementById("mic-btn");
        if (mic)
            mic.addEventListener("click", function() {
                Voice.toggle();
            });
        var bp = document.getElementById("btn-play");
        if (bp)
            bp.addEventListener("click", function() {
                Player.toggle();
            });
        var bn = document.getElementById("btn-next");
        if (bn)
            bn.addEventListener("click", function() {
                Player.next();
            });
        var bpr = document.getElementById("btn-prev");
        if (bpr)
            bpr.addEventListener("click", function() {
                Player.prev();
            });
        var lo = document.getElementById("logout-btn");
        if (lo)
            lo.addEventListener("click", function() {
                Auth.signOut();
            });

        var lyricsBtn = document.getElementById("btn-lyrics");
        if (lyricsBtn) lyricsBtn.addEventListener("click", showLyrics);
        var queueBtn = document.getElementById("btn-queue");
        if (queueBtn) queueBtn.addEventListener("click", toggleQueuePanel);
        var closeLyrics = document.getElementById("lyrics-close");
        if (closeLyrics) closeLyrics.addEventListener("click", closeLyricsModal);
        var closeQueue = document.getElementById("queue-close");
        if (closeQueue) closeQueue.addEventListener("click", toggleQueuePanel);

        refreshSidebarPlaylists();
        showHome();
    }

    return {
        init: init,
        doSearch: doSearch,
        searchAndPlay: searchAndPlay,
        playLiked: playLiked,
        showLiked: showLiked,
        showRecent: showRecent,
        applyFilter: applyFilter,
        showHome: showHome,
        showPlaylists: showPlaylists,
        openPlaylist: openPlaylist,
        showLyrics: showLyrics,
        toggleQueuePanel: toggleQueuePanel,
        showAlbum: showAlbum,
        showArtist: showArtist,
    };
})();

window.App = App;
document.addEventListener("DOMContentLoaded", function() {
    App.init();
});
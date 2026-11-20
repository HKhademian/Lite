/** Search index types and client-side instant search modal script (`runtime/search.js`). */

export type SearchEntryKind =
  | 'handbook'
  | 'doc'
  | 'module'
  | 'symbol'
  | 'tool'
  | 'learn'
  | 'gym'
  | 'gallery';

export type SearchEntry = Readonly<{
  kind: SearchEntryKind;
  title: string;
  subtitle: string;
  href: string;
  keywords: string;
  badge?: string;
}>;

export const searchClientJs = `(function () {
  var basePath = (document.body && document.body.dataset.basePath) || "";
  var trigger = document.getElementById("site-search-btn");
  var indexCache = null;
  var indexPromise = null;
  var modal = null;
  var input = null;
  var resultsEl = null;
  var countEl = null;
  var activeKind = "all";
  var selectedIdx = 0;
  var visibleMatches = [];

  function loadIndex() {
    if (indexCache) return Promise.resolve(indexCache);
    if (!indexPromise) {
      indexPromise = fetch(basePath + "search-index.json")
        .then(function (res) {
          if (!res.ok) throw new Error("Failed to load search index");
          return res.json();
        })
        .then(function (data) {
          indexCache = Array.isArray(data) ? data : [];
          return indexCache;
        })
        .catch(function () {
          return [];
        });
    }
    return indexPromise;
  }

  function escapeText(text) {
    return String(text)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function ensureModal() {
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "lite-search-modal";
    modal.className = "search-modal";
    modal.hidden = true;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "Search Lite documentation, modules, learn, and gym");
    modal.innerHTML =
      '<div class="search-backdrop" data-close="true"></div>' +
      '<div class="search-dialog">' +
      '  <div class="search-bar">' +
      '    <input id="lite-search-input" class="search-input" type="search" placeholder="Search docs, modules, symbols, learn, gym..." autocomplete="off" spellcheck="false" aria-label="Search query">' +
      '    <button class="search-close" type="button" data-close="true" aria-label="Close search">Esc</button>' +
      '  </div>' +
      '  <div class="search-cats" role="group" aria-label="Filter search by category">' +
      '    <button class="search-cat-btn" type="button" data-search-kind="all" aria-pressed="true">All</button>' +
      '    <button class="search-cat-btn" type="button" data-search-kind="handbook" aria-pressed="false">Handbook</button>' +
      '    <button class="search-cat-btn" type="button" data-search-kind="learn" aria-pressed="false">Learn</button>' +
      '    <button class="search-cat-btn" type="button" data-search-kind="gym" aria-pressed="false">Gym</button>' +
      '    <button class="search-cat-btn" type="button" data-search-kind="doc" aria-pressed="false">Spec</button>' +
      '    <button class="search-cat-btn" type="button" data-search-kind="module" aria-pressed="false">Modules</button>' +
      '    <button class="search-cat-btn" type="button" data-search-kind="tool" aria-pressed="false">Tools</button>' +
      '    <button class="search-cat-btn" type="button" data-search-kind="gallery" aria-pressed="false">Gallery</button>' +
      '  </div>' +
      '  <div id="lite-search-count" class="search-meta">Type to search...</div>' +
      '  <div id="lite-search-results" class="search-results" role="listbox"></div>' +
      '  <div class="search-foot"><span><kbd>&uarr;</kbd><kbd>&darr;</kbd> Navigate</span><span><kbd>&crarr;</kbd> Open</span><span><kbd>Esc</kbd> Close</span></div>' +
      '</div>';
    document.body.appendChild(modal);
    input = document.getElementById("lite-search-input");
    resultsEl = document.getElementById("lite-search-results");
    countEl = document.getElementById("lite-search-count");

    var catBtns = modal.querySelectorAll("[data-search-kind]");
    for (var c = 0; c < catBtns.length; c += 1) {
      catBtns[c].addEventListener("click", function () {
        activeKind = this.getAttribute("data-search-kind") || "all";
        for (var j = 0; j < catBtns.length; j += 1) {
          catBtns[j].setAttribute("aria-pressed", catBtns[j] === this ? "true" : "false");
        }
        selectedIdx = 0;
        renderMatches(input.value);
        if (input) input.focus();
      });
    }

    modal.addEventListener("click", function (event) {
      var target = event.target;
      if (target && target.getAttribute && target.getAttribute("data-close") === "true") {
        closeModal();
      }
    });

    input.addEventListener("input", function () {
      selectedIdx = 0;
      renderMatches(input.value);
    });

    input.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        if (visibleMatches.length > 0) {
          selectedIdx = (selectedIdx + 1) % visibleMatches.length;
          syncActiveItem();
        }
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        if (visibleMatches.length > 0) {
          selectedIdx = (selectedIdx - 1 + visibleMatches.length) % visibleMatches.length;
          syncActiveItem();
        }
      } else if (event.key === "Enter") {
        var active = visibleMatches[selectedIdx];
        if (active) {
          event.preventDefault();
          window.location.href = basePath + active.href;
        }
      }
    });
    return modal;
  }

  function scoreEntry(entry, tokens) {
    var titleLower = (entry.title || "").toLowerCase();
    var subLower = (entry.subtitle || "").toLowerCase();
    var keyLower = (entry.keywords || "").toLowerCase();
    var kindLower = (entry.kind || "").toLowerCase();
    var total = 0;
    for (var i = 0; i < tokens.length; i += 1) {
      var tok = tokens[i];
      if (titleLower === tok) total += 120;
      else if (titleLower.indexOf(tok) === 0) total += 75;
      else if (titleLower.indexOf(tok) >= 0) total += 45;
      else if (subLower.indexOf(tok) >= 0) total += 20;
      else if (keyLower.indexOf(tok) >= 0 || kindLower.indexOf(tok) >= 0) total += 10;
      else return 0;
    }
    if (entry.kind === "handbook" || entry.kind === "learn" || entry.kind === "module") total += 6;
    if (entry.kind === "gym" || entry.kind === "tool") total += 4;
    return total;
  }

  function syncActiveItem() {
    if (!resultsEl) return;
    var items = resultsEl.querySelectorAll(".search-item");
    for (var i = 0; i < items.length; i += 1) {
      var active = i === selectedIdx;
      items[i].classList.toggle("active", active);
      items[i].setAttribute("aria-selected", active ? "true" : "false");
      if (active && items[i].scrollIntoView) {
        items[i].scrollIntoView({ block: "nearest" });
      }
    }
  }

  function matchesKindFilter(entry) {
    if (activeKind === "all") return true;
    if (activeKind === "module") return entry.kind === "module" || entry.kind === "symbol";
    return entry.kind === activeKind;
  }

  function renderMatches(queryRaw) {
    if (!resultsEl || !countEl) return;
    var list = (indexCache || []).filter(matchesKindFilter);
    var q = (queryRaw || "").trim().toLowerCase();
    var matches = [];
    if (!q) {
      matches = list.slice(0, 18);
      countEl.textContent = list.length + " indexed entries — showing top destinations";
    } else {
      var tokens = q.split(/\\s+/).filter(Boolean);
      var scored = [];
      for (var i = 0; i < list.length; i += 1) {
        var entry = list[i];
        var s = scoreEntry(entry, tokens);
        if (s > 0) scored.push({ score: s, entry: entry });
      }
      scored.sort(function (a, b) {
        return b.score - a.score || a.entry.title.localeCompare(b.entry.title);
      });
      matches = scored.slice(0, 24).map(function (item) { return item.entry; });
      countEl.textContent = scored.length + " match" + (scored.length === 1 ? "" : "es") + (scored.length > 24 ? " (showing top 24)" : "");
    }
    visibleMatches = matches;
    if (selectedIdx >= visibleMatches.length) selectedIdx = 0;
    if (matches.length === 0) {
      resultsEl.innerHTML = '<div class="search-empty">No matching topics, symbols, or exercises found.</div>';
      return;
    }
    resultsEl.innerHTML = matches
      .map(function (item, idx) {
        var badgeText = item.badge || item.kind;
        var activeClass = idx === selectedIdx ? " active" : "";
        return (
          '<a class="search-item' + activeClass + '" role="option" aria-selected="' + (idx === selectedIdx ? "true" : "false") + '" href="' + escapeText(basePath + item.href) + '">' +
          '  <span class="search-item-main">' +
          '    <span class="search-item-title">' + escapeText(item.title) + "</span>" +
          '    <span class="search-item-sub">' + escapeText(item.subtitle) + "</span>" +
          "  </span>" +
          '  <span class="search-kind-badge">' + escapeText(badgeText) + "</span>" +
          "</a>"
        );
      })
      .join("");
  }

  function openModal() {
    ensureModal();
    modal.hidden = false;
    document.body.classList.add("search-open");
    loadIndex().then(function () {
      renderMatches(input.value);
    });
    window.setTimeout(function () {
      if (input) input.focus();
    }, 10);
  }

  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove("search-open");
    if (trigger) trigger.focus();
  }

  if (trigger) {
    trigger.addEventListener("click", openModal);
  }

  document.addEventListener("keydown", function (event) {
    var target = event.target;
    var tag = target && target.tagName ? target.tagName.toUpperCase() : "";
    var isInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (target && target.isContentEditable);
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      if (modal && !modal.hidden) closeModal();
      else openModal();
      return;
    }
    if (!isInput && !event.metaKey && !event.ctrlKey && !event.altKey && event.key === "/") {
      event.preventDefault();
      openModal();
    }
  });
})();
`;

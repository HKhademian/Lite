/** Shared localStorage sketch/snippet store (`runtime/snips.js`) using UUIDv7 IDs and cross-site "Open in Play" wiring. */

export const SNIPS_STORAGE_KEY = 'lite.snips.v1';

export const snipsClientJs = `(function () {
  var STORAGE_KEY = "lite.snips.v1";

  function hexByte(b) {
    return (b & 0xff).toString(16).padStart(2, "0");
  }

  function randomBytes(count) {
    var out = new Uint8Array(count);
    if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
      crypto.getRandomValues(out);
    } else {
      for (var i = 0; i < count; i += 1) {
        out[i] = Math.floor(Math.random() * 256);
      }
    }
    return out;
  }

  function generateUuidV7() {
    var now = Date.now();
    var hi = Math.floor(now / 4294967296);
    var lo = now >>> 0;
    var r = randomBytes(10);
    var b = [
      (hi >>> 8) & 0xff,
      hi & 0xff,
      (lo >>> 24) & 0xff,
      (lo >>> 16) & 0xff,
      (lo >>> 8) & 0xff,
      lo & 0xff,
      0x70 | (r[0] & 0x0f),
      r[1],
      0x80 | (r[2] & 0x3f),
      r[3],
      r[4],
      r[5],
      r[6],
      r[7],
      r[8],
      r[9]
    ];
    return (
      hexByte(b[0]) + hexByte(b[1]) + hexByte(b[2]) + hexByte(b[3]) + "-" +
      hexByte(b[4]) + hexByte(b[5]) + "-" +
      hexByte(b[6]) + hexByte(b[7]) + "-" +
      hexByte(b[8]) + hexByte(b[9]) + "-" +
      hexByte(b[10]) + hexByte(b[11]) + hexByte(b[12]) + hexByte(b[13]) + hexByte(b[14]) + hexByte(b[15])
    );
  }

  function getBasePath() {
    return (document.body && document.body.dataset && document.body.dataset.basePath) || "";
  }

  function normalizeExtraModules(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    var out = {};
    var count = 0;
    var keys = Object.keys(raw);
    for (var i = 0; i < keys.length; i += 1) {
      var spec = keys[i];
      var entry = raw[spec];
      if (!entry || typeof entry !== "object" || typeof entry.text !== "string") continue;
      out[spec] = {
        path: typeof entry.path === "string" ? entry.path : spec,
        display: typeof entry.display === "string" ? entry.display : spec,
        identity: typeof entry.identity === "string" ? entry.identity : "",
        text: entry.text
      };
      count += 1;
    }
    return count > 0 ? out : null;
  }

  function normalizeEnv(raw) {
    return raw === "play" || raw === "cli" ? raw : "universal";
  }

  function normalizeItem(raw) {
    if (!raw || typeof raw !== "object") return null;
    var id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : "";
    var code = typeof raw.code === "string" ? raw.code : "";
    if (!id) return null;
    var nowIso = new Date().toISOString();
    var item = {
      id: id,
      title: typeof raw.title === "string" && raw.title.trim() ? raw.title.trim() : "Untitled Sketch",
      code: code,
      stdin: typeof raw.stdin === "string" ? raw.stdin : "",
      args: typeof raw.args === "string" ? raw.args : "",
      origin: typeof raw.origin === "string" ? raw.origin : "custom",
      createdAt: typeof raw.createdAt === "string" ? raw.createdAt : nowIso,
      updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : nowIso
    };
    var extraModules = normalizeExtraModules(raw.extraModules);
    if (extraModules) item.extraModules = extraModules;
    var env = normalizeEnv(raw.environment);
    if (env !== "universal") item.environment = env;
    return item;
  }

  function readAll() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      var items = [];
      for (var i = 0; i < parsed.length; i += 1) {
        var norm = normalizeItem(parsed[i]);
        if (norm) items.push(norm);
      }
      items.sort(function (a, b) {
        return String(b.updatedAt).localeCompare(String(a.updatedAt));
      });
      return items;
    } catch (e) {
      return [];
    }
  }

  function writeAll(items) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {}
    try {
      window.dispatchEvent(new CustomEvent("lite:snips-changed", { detail: { count: items.length } }));
    } catch (e) {}
  }

  var api = {
    STORAGE_KEY: STORAGE_KEY,
    uuidv7: generateUuidV7,
    list: function () {
      return readAll();
    },
    get: function (id) {
      if (!id) return null;
      var items = readAll();
      for (var i = 0; i < items.length; i += 1) {
        if (items[i].id === id) return items[i];
      }
      return null;
    },
    saveNew: function (draft) {
      var nowIso = new Date().toISOString();
      var item = normalizeItem({
        id: generateUuidV7(),
        title: draft && draft.title ? String(draft.title).trim() : "Custom Sketch",
        code: draft && typeof draft.code === "string" ? draft.code : "",
        stdin: draft && typeof draft.stdin === "string" ? draft.stdin : "",
        args: draft && typeof draft.args === "string" ? draft.args : "",
        origin: draft && typeof draft.origin === "string" ? draft.origin : "custom",
        extraModules: draft ? draft.extraModules : null,
        environment: draft ? draft.environment : "universal",
        createdAt: nowIso,
        updatedAt: nowIso
      });
      var items = readAll();
      items.unshift(item);
      writeAll(items);
      return item;
    },
    update: function (id, patch) {
      var items = readAll();
      var updated = null;
      var nowIso = new Date().toISOString();
      for (var i = 0; i < items.length; i += 1) {
        if (items[i].id === id) {
          var next = normalizeItem({
            id: items[i].id,
            title: typeof patch.title === "string" && patch.title.trim() ? patch.title.trim() : items[i].title,
            code: typeof patch.code === "string" ? patch.code : items[i].code,
            stdin: typeof patch.stdin === "string" ? patch.stdin : items[i].stdin,
            args: typeof patch.args === "string" ? patch.args : items[i].args,
            origin: items[i].origin,
            extraModules: patch && Object.prototype.hasOwnProperty.call(patch, "extraModules") ? patch.extraModules : items[i].extraModules,
            environment: patch && Object.prototype.hasOwnProperty.call(patch, "environment") ? patch.environment : items[i].environment,
            createdAt: items[i].createdAt,
            updatedAt: nowIso
          });
          items[i] = next;
          updated = next;
          break;
        }
      }
      if (updated) writeAll(items);
      return updated;
    },
    remove: function (id) {
      var items = readAll();
      var next = [];
      var removed = false;
      for (var i = 0; i < items.length; i += 1) {
        if (items[i].id === id) {
          removed = true;
        } else {
          next.push(items[i]);
        }
      }
      if (removed) writeAll(next);
      return removed;
    },
    clear: function () {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch (e) {}
      try {
        window.dispatchEvent(new CustomEvent("lite:snips-changed", { detail: { count: 0 } }));
      } catch (e) {}
    },
    openInPlayground: function (idOrDraft) {
      var targetId = "";
      if (typeof idOrDraft === "string") {
        var existing = api.get(idOrDraft);
        if (existing) targetId = existing.id;
      }
      if (!targetId && idOrDraft && typeof idOrDraft === "object") {
        var created = api.saveNew(idOrDraft);
        targetId = created ? created.id : "";
      }
      var href = getBasePath() + "playground/" + (targetId ? "?snip=" + encodeURIComponent(targetId) : "");
      window.location.href = href;
    }
  };

  window.LiteSnips = api;

  function inferTitleForPre(pre) {
    var card = pre.closest(".sample-card, .gallery-card");
    if (card) {
      var cardHeading = card.querySelector("h2, h3, h4");
      if (cardHeading && cardHeading.textContent) return cardHeading.textContent.trim();
    }
    var cur = pre.previousElementSibling;
    while (cur) {
      if (/^H[1-6]$/.test(cur.tagName) && cur.textContent) {
        return cur.textContent.trim();
      }
      cur = cur.previousElementSibling;
    }
    var parent = pre.parentElement;
    while (parent && parent.tagName !== "MAIN") {
      var prev = parent.previousElementSibling;
      while (prev) {
        if (/^H[1-6]$/.test(prev.tagName) && prev.textContent) {
          return prev.textContent.trim();
        }
        prev = prev.previousElementSibling;
      }
      var innerHeading = parent.querySelector("h1, h2, h3");
      if (innerHeading && innerHeading.textContent && parent.tagName !== "BODY") {
        return innerHeading.textContent.trim();
      }
      parent = parent.parentElement;
    }
    var docHeading = document.querySelector("main h1");
    if (docHeading && docHeading.textContent) return docHeading.textContent.trim();
    return (document.title || "Lite Snippet").split("—")[0].trim() || "Lite Snippet";
  }

  function currentOriginLabel() {
    var path = (window.location && window.location.pathname) || "";
    var base = getBasePath();
    if (path) return path.replace(/^\\/+/, "");
    return base === "" ? "overview" : "docs";
  }

  function flashButton(btn, label) {
    var orig = btn.dataset.origLabel || btn.textContent;
    btn.dataset.origLabel = orig;
    btn.textContent = label;
    btn.classList.add("copied");
    window.setTimeout(function () {
      btn.textContent = orig;
      btn.classList.remove("copied");
    }, 1500);
  }

  function copyText(text, btn) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        flashButton(btn, "Copied");
      }, function () {});
      return;
    }
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      if (document.execCommand("copy")) flashButton(btn, "Copied");
    } catch (e) {}
    document.body.removeChild(ta);
  }

  function makeActionBtn(label, extraClass) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "lite-snip-btn" + (extraClass ? " " + extraClass : "");
    btn.textContent = label;
    return btn;
  }

  function enhanceCodeBlocks() {
    var blocks = document.querySelectorAll("pre.code-block");
    for (var i = 0; i < blocks.length; i += 1) {
      var pre = blocks[i];
      if (pre.dataset.snipBound === "1") continue;
      if (pre.closest(".pg-editor-wrap, .pg-panel, .pg-panels")) continue;

      var snippetCard = pre.closest(".md-snippet-card");
      if (snippetCard) {
        var foot = snippetCard.querySelector(".sample-foot");
        if (foot && !foot.querySelector(".lite-snip-btn")) {
          pre.dataset.snipBound = "1";
          var saveSnippetBtn = makeActionBtn("Save");
          saveSnippetBtn.addEventListener("click", (function (el, b) {
            return function () {
              api.saveNew({
                title: inferTitleForPre(el),
                code: el.textContent || "",
                origin: currentOriginLabel()
              });
              flashButton(b, "Saved");
            };
          })(pre, saveSnippetBtn));
          foot.insertBefore(saveSnippetBtn, foot.lastElementChild);
        }
        continue;
      }

      var sampleCard = pre.closest(".sample-card, .gallery-card");
      if (sampleCard) {
        var sampleFoot = sampleCard.querySelector(".sample-foot");
        if (sampleFoot && !sampleFoot.querySelector(".lite-snip-btn")) {
          pre.dataset.snipBound = "1";
          var saveCardBtn = makeActionBtn("Save");
          saveCardBtn.addEventListener("click", (function (el, b) {
            return function () {
              api.saveNew({
                title: inferTitleForPre(el),
                code: el.textContent || "",
                origin: currentOriginLabel()
              });
              flashButton(b, "Saved");
            };
          })(pre, saveCardBtn));
          sampleFoot.insertBefore(saveCardBtn, sampleFoot.lastElementChild);
        }
        continue;
      }

      var lang = (pre.getAttribute("data-lang") || "").toLowerCase();
      var inSolutionBox = pre.closest("#gym-solution-box") !== null;
      var inDocProse = pre.closest(".doc-prose") !== null;
      var isLiteBlock = lang === "lite" || lang === "lts" || inSolutionBox;
      if (!isLiteBlock || (!inDocProse && !inSolutionBox)) continue;

      pre.dataset.snipBound = "1";
      var bar = document.createElement("div");
      bar.className = "lite-snip-bar";

      var copyBtn = makeActionBtn("Copy");
      copyBtn.addEventListener("click", (function (el, b) {
        return function () {
          copyText((el.textContent || "").replace(/\\n$/, ""), b);
        };
      })(pre, copyBtn));

      var saveBtn = makeActionBtn("Save");
      saveBtn.addEventListener("click", (function (el, b) {
        return function () {
          api.saveNew({
            title: inferTitleForPre(el),
            code: (el.textContent || "").replace(/\\n$/, ""),
            origin: currentOriginLabel()
          });
          flashButton(b, "Saved");
        };
      })(pre, saveBtn));

      var playBtn = makeActionBtn("Open in Play →", "lite-snip-play");
      playBtn.addEventListener("click", (function (el) {
        return function () {
          api.openInPlayground({
            title: inferTitleForPre(el),
            code: (el.textContent || "").replace(/\\n$/, ""),
            origin: currentOriginLabel()
          });
        };
      })(pre));

      bar.appendChild(copyBtn);
      bar.appendChild(saveBtn);
      bar.appendChild(playBtn);
      pre.insertAdjacentElement("afterend", bar);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", enhanceCodeBlocks);
  } else {
    enhanceCodeBlocks();
  }
})();
`;

/** Shared localStorage sketch/snippet store (`runtime/snips.js`), inline Docs runner, and Play wiring. */

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

  /* Lazy shared worker for inline Docs/Handbook execution */
  var inlineWorker = null;
  var inlineReqId = 1;
  var inlinePending = new Map();

  function getInlineWorker() {
    if (inlineWorker) return inlineWorker;
    if (typeof Worker !== "function") return null;
    inlineWorker = new Worker(getBasePath() + "runtime/worker.js", { type: "module" });
    inlineWorker.addEventListener("message", function (event) {
      var msg = event.data || {};
      var entry = inlinePending.get(msg.id);
      if (entry) {
        inlinePending.delete(msg.id);
        entry.resolve(msg);
      }
    });
    inlineWorker.addEventListener("error", function (err) {
      inlinePending.forEach(function (entry) {
        entry.reject(new Error((err && err.message) || "Worker error"));
      });
      inlinePending.clear();
      inlineWorker = null;
    });
    return inlineWorker;
  }

  function runSnippetInWorker(code) {
    return new Promise(function (resolve, reject) {
      var w = getInlineWorker();
      if (!w) {
        reject(new Error("Web Workers are unavailable in this environment."));
        return;
      }
      var id = inlineReqId++;
      inlinePending.set(id, { resolve: resolve, reject: reject });
      w.postMessage({ id: id, action: "run", source: code, stdin: "", args: [] });
    });
  }

  function inferTitleForPre(pre) {
    var card = pre.closest(".code-card, .sample-card, .gallery-card");
    if (card) {
      var cardHeading = card.querySelector("h2, h3, h4, .code-card-title");
      if (cardHeading && cardHeading.textContent) return cardHeading.textContent.trim();
    }
    var cur = pre.previousElementSibling;
    while (cur) {
      if (/^H[1-6]$/.test(cur.tagName) && cur.textContent) {
        return cur.textContent.replace(/^#\\s*/, "").trim();
      }
      cur = cur.previousElementSibling;
    }
    var parent = pre.parentElement;
    while (parent && parent.tagName !== "MAIN") {
      var prev = parent.previousElementSibling;
      while (prev) {
        if (/^H[1-6]$/.test(prev.tagName) && prev.textContent) {
          return prev.textContent.replace(/^#\\s*/, "").trim();
        }
        prev = prev.previousElementSibling;
      }
      var innerHeading = parent.querySelector("h1, h2, h3");
      if (innerHeading && innerHeading.textContent && parent.tagName !== "BODY") {
        return innerHeading.textContent.replace(/^#\\s*/, "").trim();
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

  function attachInlineRunner(pre, runBtn, hostAnchor) {
    var outBox = null;
    runBtn.addEventListener("click", function () {
      var code = (pre.textContent || "").replace(/\\n$/, "");
      if (!outBox) {
        outBox = document.createElement("div");
        outBox.className = "lite-inline-out is-running";
        if (hostAnchor && typeof hostAnchor.insertAdjacentElement === "function") {
          hostAnchor.insertAdjacentElement("afterend", outBox);
        }
      }
      outBox.hidden = false;
      outBox.className = "lite-inline-out is-running";
      outBox.innerHTML = "";
      var head = document.createElement("div");
      head.className = "lite-inline-out-head";
      var statusSpan = document.createElement("span");
      statusSpan.textContent = "Running in browser...";
      var closeBtn = makeActionBtn("Hide");
      closeBtn.addEventListener("click", function () { outBox.hidden = true; });
      head.appendChild(statusSpan);
      head.appendChild(closeBtn);
      outBox.appendChild(head);

      var t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
      runBtn.disabled = true;
      runSnippetInWorker(code).then(function (res) {
        runBtn.disabled = false;
        var elapsed = Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - t0);
        var hasCanvas = Boolean(res.canvas || res.play);
        var needsCli = /import\\s+"core\\/(file|path|process|time)"/.test(code);
        var needsInput = /io\\.input(Int|Line|Args|Text)/.test(code);
        outBox.className = "lite-inline-out " + (res.ok ? "is-ok" : "is-err");
        statusSpan.textContent = res.ok
          ? ("Ran in " + elapsed + " ms")
          : (needsCli ? "Requires CLI / Host OS (./bin/lite run)" : "Compile / Runtime Error");

        var bodyPre = document.createElement("pre");
        bodyPre.className = "lite-inline-out-pre";
        var textOut = "";
        if (res.stdout) textOut += res.stdout;
        if (res.stderr) textOut += (textOut ? "\\n" : "") + res.stderr;
        if (!textOut && hasCanvas) {
          textOut = "(Canvas/Play output rendered — click Open in Play → to launch the interactive stage.)";
        } else if (!textOut && res.ok) {
          textOut = "(no stdout output)";
        }
        if (needsInput && !res.ok) {
          textOut += "\\n[tip] This snippet expects stdin/args — click Open in Play → to supply inputs.";
        }
        bodyPre.textContent = textOut;
        outBox.appendChild(bodyPre);
      }).catch(function (err) {
        runBtn.disabled = false;
        outBox.className = "lite-inline-out is-err";
        statusSpan.textContent = "Runner unavailable";
        var bodyPre = document.createElement("pre");
        bodyPre.className = "lite-inline-out-pre";
        bodyPre.textContent = (err && err.message) || "Could not run snippet in this browser.";
        outBox.appendChild(bodyPre);
      });
    });
  }

  function enhanceCodeBlocks() {
    var blocks = document.querySelectorAll("pre.code-block");
    for (var i = 0; i < blocks.length; i += 1) {
      var pre = blocks[i];
      if (pre.dataset.snipBound === "1") continue;
      if (pre.closest(".pg-editor-wrap, .pg-panel, .pg-panels")) continue;

      var lang = (pre.getAttribute("data-lang") || "").toLowerCase();
      var isLiteLang = lang === "lite" || lang === "lts";

      var snippetCard = pre.closest(".md-snippet-card");
      if (snippetCard) {
        var foot = snippetCard.querySelector(".sample-foot");
        if (foot && !foot.querySelector(".lite-snip-btn")) {
          pre.dataset.snipBound = "1";
          var actionsWrap = document.createElement("div");
          actionsWrap.className = "lite-snip-actions";
          if (isLiteLang) {
            var snipRunBtn = makeActionBtn("▶ Run", "lite-snip-run");
            actionsWrap.appendChild(snipRunBtn);
            attachInlineRunner(pre, snipRunBtn, snippetCard);
          }
          var copySnippetBtn = makeActionBtn("Copy");
          copySnippetBtn.addEventListener("click", (function (el, b) {
            return function () { copyText((el.textContent || "").replace(/\\n$/, ""), b); };
          })(pre, copySnippetBtn));
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
          actionsWrap.appendChild(copySnippetBtn);
          actionsWrap.appendChild(saveSnippetBtn);
          foot.insertBefore(actionsWrap, foot.lastElementChild);
        }
        continue;
      }

      var sampleCard = pre.closest(".code-card, .sample-card, .gallery-card");
      if (sampleCard) {
        var sampleFoot = sampleCard.querySelector(".sample-foot");
        if (sampleFoot && !sampleFoot.querySelector(".lite-snip-btn")) {
          pre.dataset.snipBound = "1";
          var cardActions = document.createElement("div");
          cardActions.className = "lite-snip-actions";
          var copyCardBtn = makeActionBtn("Copy");
          copyCardBtn.addEventListener("click", (function (el, b) {
            return function () { copyText((el.textContent || "").replace(/\\n$/, ""), b); };
          })(pre, copyCardBtn));
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
          cardActions.appendChild(copyCardBtn);
          cardActions.appendChild(saveCardBtn);
          sampleFoot.insertBefore(cardActions, sampleFoot.lastElementChild);
        }
        continue;
      }

      var inSolutionBox = pre.closest("#gym-solution-box") !== null;
      var inDocProse = pre.closest(".md-prose, .doc-prose") !== null;
      var explicitRunnable = pre.getAttribute("data-runnable");
      var builtinPlayHref = pre.getAttribute("data-play-href") || "";
      var isLiteBlock = explicitRunnable === "false" ? false : (isLiteLang || inSolutionBox);
      if (!inDocProse && !inSolutionBox) continue;
      if (!isLiteLang && !inSolutionBox && lang === "") continue;

      pre.dataset.snipBound = "1";
      var bar = document.createElement("div");
      bar.className = "lite-snip-bar";

      if (isLiteBlock && !inSolutionBox) {
        var runBtn = makeActionBtn("▶ Run", "lite-snip-run");
        bar.appendChild(runBtn);
        attachInlineRunner(pre, runBtn, bar);
      }

      var copyBtn = makeActionBtn("Copy");
      copyBtn.addEventListener("click", (function (el, b) {
        return function () {
          copyText((el.textContent || "").replace(/\\n$/, ""), b);
        };
      })(pre, copyBtn));
      bar.appendChild(copyBtn);

      if (isLiteBlock) {
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
        bar.appendChild(saveBtn);

        if (builtinPlayHref) {
          var playLink = document.createElement("a");
          playLink.className = "lite-snip-btn lite-snip-play";
          playLink.href = builtinPlayHref;
          playLink.textContent = "Open in Play →";
          bar.appendChild(playLink);
        } else {
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
          bar.appendChild(playBtn);
        }
      }

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

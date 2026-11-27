/** Shared client runtime (`runtime/academy.js`) for unified Academy progress, TOC scroll-spy, Spec filters, and drawers. */

export const ACADEMY_META_KEY = 'lite-academy-meta-v1';

export const academyClientJs = `(function () {
  var META_KEY = "lite-academy-meta-v1";
  var LEARN_KEY = "lite-learn-progress-v1";
  var GYM_KEY = "lite-gym-progress-v1";
  var SNIPS_KEY = "lite.snips.v1";

  function readJsonObj(key) {
    try {
      var raw = window.localStorage.getItem(key);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  function writeJson(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
  }

  function loadMeta() {
    var raw = readJsonObj(META_KEY);
    return {
      handbookRead: raw && raw.handbookRead && typeof raw.handbookRead === "object" ? raw.handbookRead : {},
      lastVisited: raw && raw.lastVisited && typeof raw.lastVisited === "object" ? raw.lastVisited : null
    };
  }

  function saveMeta(meta) {
    writeJson(META_KEY, meta);
  }

  function getBasePath() {
    return (document.body && document.body.dataset && document.body.dataset.basePath) || "";
  }

  function countTrueKeys(obj) {
    if (!obj || typeof obj !== "object") return 0;
    var n = 0;
    var keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i += 1) {
      if (obj[keys[i]]) n += 1;
    }
    return n;
  }

  function getSummary() {
    var meta = loadMeta();
    var learn = readJsonObj(LEARN_KEY) || {};
    var gym = readJsonObj(GYM_KEY) || {};
    var gymSolvedMap = gym.solved && typeof gym.solved === "object" ? gym.solved : {};
    var snips = [];
    try {
      var rawSnips = window.localStorage.getItem(SNIPS_KEY);
      if (rawSnips) {
        var parsedSnips = JSON.parse(rawSnips);
        if (Array.isArray(parsedSnips)) snips = parsedSnips;
      }
    } catch (e) {}

    return {
      lessonsDone: countTrueKeys(learn),
      gymSolved: countTrueKeys(gymSolvedMap),
      handbookReadCount: countTrueKeys(meta.handbookRead),
      snipsCount: snips.length,
      handbookRead: meta.handbookRead,
      learnCompleted: learn,
      gymSolvedMap: gymSolvedMap,
      lastVisited: meta.lastVisited
    };
  }

  function markHandbookRead(slug) {
    if (!slug) return;
    var meta = loadMeta();
    meta.handbookRead[slug] = true;
    saveMeta(meta);
    hydrateProgress();
  }

  function recordVisit(info) {
    if (!info || !info.relPath) return;
    var meta = loadMeta();
    meta.lastVisited = {
      relPath: String(info.relPath),
      title: String(info.title || info.relPath),
      section: String(info.section || "Academy"),
      at: new Date().toISOString()
    };
    saveMeta(meta);
  }

  function hydrateProgress() {
    var summary = getSummary();

    var navLinks = document.querySelectorAll("[data-handbook-nav-slug]");
    for (var i = 0; i < navLinks.length; i += 1) {
      var link = navLinks[i];
      var slug = link.getAttribute("data-handbook-nav-slug");
      if (slug && summary.handbookRead[slug]) link.classList.add("is-completed");
      else link.classList.remove("is-completed");
    }

    var gymBadges = document.querySelectorAll(".academy-gym-badge[data-gym-id]");
    for (var g = 0; g < gymBadges.length; g += 1) {
      var gb = gymBadges[g];
      var gid = gb.getAttribute("data-gym-id");
      var solved = Boolean(gid && summary.gymSolvedMap[gid]);
      gb.textContent = solved ? "Solved ✓" : (gb.dataset.defaultLabel || "Practice");
      gb.classList.toggle("is-done", solved);
    }

    var lessonBadges = document.querySelectorAll(".academy-lesson-badge[data-lesson-id]");
    for (var l = 0; l < lessonBadges.length; l += 1) {
      var lb = lessonBadges[l];
      var lid = lb.getAttribute("data-lesson-id");
      var done = Boolean(lid && summary.learnCompleted[lid]);
      lb.textContent = done ? "Completed ✓" : (lb.dataset.defaultLabel || "Lesson");
      lb.classList.toggle("is-done", done);
    }

    var resumeBar = document.getElementById("academy-resume-bar");
    if (resumeBar) {
      var hasActivity =
        summary.lessonsDone > 0 ||
        summary.gymSolved > 0 ||
        summary.handbookReadCount > 0 ||
        summary.snipsCount > 0 ||
        Boolean(summary.lastVisited);
      resumeBar.hidden = !hasActivity;
      if (hasActivity) {
        var lessonsStat = document.getElementById("academy-stat-lessons");
        var gymStat = document.getElementById("academy-stat-gym");
        var handbookStat = document.getElementById("academy-stat-handbook");
        var snipsStat = document.getElementById("academy-stat-snips");
        if (lessonsStat) lessonsStat.textContent = String(summary.lessonsDone);
        if (gymStat) gymStat.textContent = String(summary.gymSolved);
        if (handbookStat) handbookStat.textContent = String(summary.handbookReadCount);
        if (snipsStat) snipsStat.textContent = String(summary.snipsCount);

        var resumeBtn = document.getElementById("academy-resume-link");
        var resumeTitle = document.getElementById("academy-resume-title");
        if (resumeBtn && summary.lastVisited && summary.lastVisited.relPath) {
          resumeBtn.href = getBasePath() + summary.lastVisited.relPath.replace(/^\\/+/, "");
          resumeBtn.textContent = "Resume " + summary.lastVisited.section + " →";
          if (resumeTitle) resumeTitle.textContent = summary.lastVisited.title;
        }
      }
    }

    var hbProgLabel = document.getElementById("hb-progress-label");
    if (hbProgLabel) {
      var readCount = Math.min(15, summary.handbookReadCount);
      hbProgLabel.textContent = readCount + " / 15 chapters read";
    }
    var hbProgFill = document.getElementById("hb-progress-fill");
    if (hbProgFill) {
      hbProgFill.style.width = Math.round((Math.min(15, summary.handbookReadCount) / 15) * 100) + "%";
    }
  }

  function autoTrackVisit() {
    var hbArticle = document.querySelector("[data-handbook-slug]");
    if (hbArticle) {
      var hbSlug = hbArticle.getAttribute("data-handbook-slug");
      var hbTitleEl = hbArticle.querySelector("h1");
      if (hbSlug) {
        var meta = loadMeta();
        meta.handbookRead[hbSlug] = true;
        meta.lastVisited = {
          relPath: "docs/handbook/" + hbSlug + ".html",
          title: hbTitleEl && hbTitleEl.textContent ? hbTitleEl.textContent.trim() : hbSlug,
          section: "Handbook",
          at: new Date().toISOString()
        };
        saveMeta(meta);
        return;
      }
    }
    var visitMeta = document.querySelector("[data-academy-visit-path]");
    if (visitMeta) {
      recordVisit({
        relPath: visitMeta.getAttribute("data-academy-visit-path"),
        title: visitMeta.getAttribute("data-academy-visit-title") || document.title,
        section: visitMeta.getAttribute("data-academy-visit-section") || "Academy"
      });
    }
  }

  function wireHeadingAnchors() {
    var anchors = document.querySelectorAll(".md-heading-anchor");
    for (var i = 0; i < anchors.length; i += 1) {
      anchors[i].addEventListener("click", function () {
        var href = this.getAttribute("href") || "";
        if (!href.startsWith("#")) return;
        var fullUrl = window.location.href.split("#")[0] + href;
        var el = this;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(fullUrl).then(function () {
            el.classList.add("is-copied");
            window.setTimeout(function () { el.classList.remove("is-copied"); }, 1200);
          }, function () {});
        }
      });
    }
  }

  function wireTocScrollSpy() {
    var tocLinks = Array.from(document.querySelectorAll('.portal-toc a[href^="#"]'));
    var hbSubLinks = Array.from(document.querySelectorAll('.hb-chapter-item.is-active .hb-subtopics a[href^="#"]'));
    if (tocLinks.length === 0 && hbSubLinks.length === 0) return;
    var targets = [];
    for (var i = 0; i < tocLinks.length; i += 1) {
      var id = (tocLinks[i].getAttribute("href") || "").slice(1);
      var heading = id ? document.getElementById(id) : null;
      if (heading) targets.push({ link: tocLinks[i], heading: heading, href: "#" + id });
    }
    if (targets.length === 0) {
      for (var s = 0; s < hbSubLinks.length; s += 1) {
        var sid = (hbSubLinks[s].getAttribute("href") || "").slice(1);
        var sh = sid ? document.getElementById(sid) : null;
        if (sh) targets.push({ link: hbSubLinks[s], heading: sh, href: "#" + sid });
      }
    }
    if (targets.length === 0) return;

    function setActive(activeHref) {
      for (var k = 0; k < tocLinks.length; k += 1) {
        tocLinks[k].classList.toggle("is-active", tocLinks[k].getAttribute("href") === activeHref);
      }
      for (var j = 0; j < hbSubLinks.length; j += 1) {
        hbSubLinks[j].classList.toggle("is-active", hbSubLinks[j].getAttribute("href") === activeHref);
      }
    }

    if (typeof window.IntersectionObserver === "function") {
      var visible = new Set();
      var obs = new IntersectionObserver(function (entries) {
        for (var e = 0; e < entries.length; e += 1) {
          if (entries[e].isIntersecting) visible.add(entries[e].target);
          else visible.delete(entries[e].target);
        }
        for (var t = 0; t < targets.length; t += 1) {
          if (visible.has(targets[t].heading)) {
            setActive(targets[t].href);
            return;
          }
        }
      }, { rootMargin: "-76px 0px -65% 0px", threshold: 0 });
      for (var j = 0; j < targets.length; j += 1) obs.observe(targets[j].heading);
    }

    setActive(targets[0].href);
  }

  function wireHandbookSidebar() {
    var filterInput = document.getElementById("handbook-sidebar-filter");
    var tree = document.getElementById("hb-nav-tree");
    var compactBtn = document.getElementById("hb-toggle-topics");
    var emptyEl = document.getElementById("hb-filter-empty");
    var COMPACT_KEY = "lite.hb.compact";
    var compactPref = false;
    try {
      compactPref = window.localStorage.getItem(COMPACT_KEY) === "1";
    } catch (e) {}

    function syncCompactUi(isFiltering) {
      if (tree) tree.classList.toggle("is-compact", compactPref && !isFiltering);
      if (compactBtn) {
        compactBtn.setAttribute("aria-pressed", compactPref ? "true" : "false");
        compactBtn.textContent = compactPref ? "Expand all" : "Compact";
      }
    }

    function applyFilter() {
      if (!tree) return;
      var q = filterInput ? filterInput.value.trim().toLowerCase() : "";
      var chapters = tree.querySelectorAll(".hb-chapter-item");
      var parts = tree.querySelectorAll(".hb-part-label");
      var shownChapters = 0;
      for (var i = 0; i < chapters.length; i += 1) {
        var ch = chapters[i];
        var chBlob = ch.getAttribute("data-hb-search") || "";
        var chMatch = Boolean(q && chBlob.indexOf(q) >= 0);
        var topics = ch.querySelectorAll("li[data-hb-topic-search]");
        var anyTopicMatch = false;
        for (var j = 0; j < topics.length; j += 1) {
          var tBlob = topics[j].getAttribute("data-hb-topic-search") || "";
          var tMatch = !q || tBlob.indexOf(q) >= 0;
          if (tMatch && q) anyTopicMatch = true;
          topics[j].hidden = Boolean(q && !chMatch && !tMatch);
        }
        var visible = !q || chMatch || anyTopicMatch;
        ch.hidden = !visible;
        if (visible) shownChapters += 1;
      }
      for (var p = 0; p < parts.length; p += 1) {
        parts[p].hidden = Boolean(q);
      }
      if (emptyEl) emptyEl.hidden = shownChapters > 0;
      syncCompactUi(Boolean(q));
    }

    if (compactBtn) {
      compactBtn.addEventListener("click", function () {
        compactPref = !compactPref;
        try { window.localStorage.setItem(COMPACT_KEY, compactPref ? "1" : "0"); } catch (e) {}
        syncCompactUi(Boolean(filterInput && filterInput.value.trim()));
      });
    }
    if (filterInput) {
      filterInput.addEventListener("input", applyFilter);
    }
    syncCompactUi(false);

    try {
      var activeCh = document.querySelector(".hb-chapter-item.is-active");
      if (activeCh && typeof activeCh.scrollIntoView === "function") {
        activeCh.scrollIntoView({ block: "nearest" });
      }
    } catch (e) {}

    var searchBtns = document.querySelectorAll("[data-open-search]");
    for (var s = 0; s < searchBtns.length; s += 1) {
      searchBtns[s].addEventListener("click", function () {
        document.body.classList.remove("drawer-sidebar-open");
        document.body.classList.remove("drawer-toc-open");
        var trigger = document.getElementById("site-search-btn");
        if (trigger && typeof trigger.click === "function") trigger.click();
      });
    }

    var prevEl = document.querySelector("[data-pager-prev]");
    var nextEl = document.querySelector("[data-pager-next]");
    if (prevEl || nextEl) {
      document.addEventListener("keydown", function (ev) {
        var searchModal = document.getElementById("site-search-modal");
        if (searchModal && !searchModal.hidden) return;
        var tgt = ev.target;
        var tag = tgt && tgt.tagName ? tgt.tagName : "";
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (tgt && tgt.isContentEditable)) return;
        if (prevEl && prevEl.href && ((ev.altKey && !ev.ctrlKey && !ev.metaKey && ev.key === "ArrowLeft") || (!ev.ctrlKey && !ev.metaKey && !ev.altKey && ev.key === "["))) {
          ev.preventDefault();
          window.location.href = prevEl.href;
        } else if (nextEl && nextEl.href && ((ev.altKey && !ev.ctrlKey && !ev.metaKey && ev.key === "ArrowRight") || (!ev.ctrlKey && !ev.metaKey && !ev.altKey && ev.key === "]"))) {
          ev.preventDefault();
          window.location.href = nextEl.href;
        }
      });
    }
  }

  function wireSpecSidebarFilter() {
    var searchInput = document.getElementById("docs-sidebar-filter");
    var verifiedBox = document.getElementById("docs-verified-only");
    var countEl = document.getElementById("docs-sidebar-count");
    if (!searchInput && !verifiedBox) return;

    function applyFilter() {
      var q = searchInput ? searchInput.value.trim().toLowerCase() : "";
      var onlyVerified = Boolean(verifiedBox && verifiedBox.checked);
      var items = document.querySelectorAll(".portal-nav-list li[data-verified]");
      var shown = 0;
      for (var i = 0; i < items.length; i += 1) {
        var li = items[i];
        var verOk = !onlyVerified || li.getAttribute("data-verified") === "true";
        var txt = (li.textContent || "").toLowerCase();
        var qOk = !q || txt.indexOf(q) >= 0;
        var vis = verOk && qOk;
        li.hidden = !vis;
        if (vis) shown += 1;
      }
      var groups = document.querySelectorAll(".portal-sidebar .portal-nav-group");
      for (var g = 0; g < groups.length; g += 1) {
        var grp = groups[g];
        var anyVis = grp.querySelector("li[data-verified]:not([hidden])") !== null;
        grp.hidden = !anyVis;
        if (q && anyVis) grp.open = true;
      }
      if (countEl) countEl.textContent = shown + " / " + items.length;
    }

    if (searchInput) searchInput.addEventListener("input", applyFilter);
    if (verifiedBox) verifiedBox.addEventListener("change", applyFilter);
    applyFilter();
  }

  function wireMobileNavAndDrawers() {
    var navToggle = document.getElementById("mobile-nav-toggle");
    var siteNav = document.getElementById("site-nav");
    if (navToggle && siteNav) {
      navToggle.addEventListener("click", function () {
        var open = !siteNav.classList.contains("is-open");
        siteNav.classList.toggle("is-open", open);
        navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }

    var toggles = document.querySelectorAll("[data-drawer-toggle]");
    var backdrop = null;
    function closeDrawers() {
      document.body.classList.remove("drawer-sidebar-open");
      document.body.classList.remove("drawer-toc-open");
      if (backdrop) backdrop.hidden = true;
    }
    function ensureBackdrop() {
      if (backdrop) return backdrop;
      backdrop = document.createElement("div");
      backdrop.className = "portal-drawer-backdrop";
      backdrop.hidden = true;
      backdrop.addEventListener("click", closeDrawers);
      document.body.appendChild(backdrop);
      return backdrop;
    }

    for (var i = 0; i < toggles.length; i += 1) {
      toggles[i].addEventListener("click", function () {
        var kind = this.getAttribute("data-drawer-toggle");
        if (kind === "sidebar") {
          var next = !document.body.classList.contains("drawer-sidebar-open");
          closeDrawers();
          if (next) {
            ensureBackdrop().hidden = false;
            document.body.classList.add("drawer-sidebar-open");
          }
        } else if (kind === "toc") {
          var nextToc = !document.body.classList.contains("drawer-toc-open");
          closeDrawers();
          if (nextToc) {
            ensureBackdrop().hidden = false;
            document.body.classList.add("drawer-toc-open");
          }
        }
      });
    }

    var drawerLinks = document.querySelectorAll(".portal-sidebar a, .portal-toc a");
    for (var j = 0; j < drawerLinks.length; j += 1) {
      drawerLinks[j].addEventListener("click", closeDrawers);
    }

    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") {
        closeDrawers();
        if (siteNav && siteNav.classList.contains("is-open")) {
          siteNav.classList.remove("is-open");
          if (navToggle) navToggle.setAttribute("aria-expanded", "false");
        }
      }
    });
  }

  window.LiteAcademy = {
    META_KEY: META_KEY,
    getSummary: getSummary,
    markHandbookRead: markHandbookRead,
    recordVisit: recordVisit,
    hydrateProgress: hydrateProgress,
    refresh: hydrateProgress
  };

  function boot() {
    autoTrackVisit();
    hydrateProgress();
    wireHeadingAnchors();
    wireTocScrollSpy();
    wireHandbookSidebar();
    wireSpecSidebarFilter();
    wireMobileNavAndDrawers();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
`;

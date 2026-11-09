/* Nota's site: the theme toggle, the clip, the visitor's system, today's date.
   The page reads and works without any of this. */
(function () {
  "use strict";

  var root = document.documentElement;
  var THEME_KEY = "nota-site-theme";
  var darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
  var DARK_MEDIA = "(prefers-color-scheme: dark)";

  function activeTheme() {
    return root.getAttribute("data-theme") || (darkQuery.matches ? "dark" : "light");
  }

  /* --- Light and dark ---------------------------------------------------- */

  /* A <source> follows the system. A theme picked by hand has to overrule it. */
  function syncPictures() {
    var chosen = root.getAttribute("data-theme");
    var media = DARK_MEDIA;
    if (chosen === "dark") media = "all";
    if (chosen === "light") media = "not all";
    document.querySelectorAll("picture.shot-img source").forEach(function (source) {
      source.media = media;
    });
  }

  function syncThemeColor() {
    var dark = activeTheme() === "dark";
    document.querySelectorAll('meta[name="theme-color"]').forEach(function (meta) {
      if (root.getAttribute("data-theme")) meta.setAttribute("media", "all");
      meta.setAttribute("content", dark ? "#151b17" : "#fbfcf9");
    });
  }

  function chooseTheme(theme) {
    root.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* A private window may refuse: the choice lasts for this page. */
    }
    syncPictures();
    syncThemeColor();
    document.dispatchEvent(new CustomEvent("nota:theme"));
  }

  document.querySelectorAll("[data-theme-toggle]").forEach(function (button) {
    button.addEventListener("click", function () {
      chooseTheme(activeTheme() === "dark" ? "light" : "dark");
    });
  });

  if (root.getAttribute("data-theme")) {
    syncPictures();
    syncThemeColor();
  }

  /* --- The menu on a phone ------------------------------------------------ */

  document.querySelectorAll(".menu-sheet").forEach(function (sheet) {
    sheet.addEventListener("click", function (event) {
      if (event.target.closest("a")) sheet.removeAttribute("open");
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && sheet.hasAttribute("open")) {
        sheet.removeAttribute("open");
        sheet.querySelector("summary").focus();
      }
    });
  });

  /* --- The dictation clip ------------------------------------------------- */

  /* The final frame sits underneath as a picture, so with motion reduced, or
     with no script, nobody misses what the clip says. */
  document.querySelectorAll("[data-clip]").forEach(function (figure) {
    var video = figure.querySelector("video");
    var button = figure.querySelector("[data-clip-toggle]");
    if (!video || !button) return;

    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var pausedByVisitor = reduced;
    var inView = false;

    function showState(playing) {
      figure.classList.toggle("is-paused", !playing);
      button.setAttribute("aria-label", playing ? button.dataset.pauseLabel : button.dataset.playLabel);
    }

    function source() {
      return activeTheme() === "dark" ? video.dataset.dark : video.dataset.light;
    }

    function play() {
      var wanted = source();
      if (video.dataset.loaded !== wanted) {
        video.dataset.loaded = wanted;
        video.src = wanted;
        figure.classList.remove("is-playing");
      }
      var started = video.play();
      if (started && started.catch) {
        started.catch(function () {
          showState(false);
        });
      }
      showState(true);
    }

    function pause() {
      video.pause();
      showState(false);
    }

    video.addEventListener("playing", function () {
      figure.classList.add("is-playing");
    });

    button.addEventListener("click", function () {
      pausedByVisitor = !video.paused;
      if (pausedByVisitor) {
        pause();
      } else {
        play();
      }
    });

    document.addEventListener("nota:theme", function () {
      if (video.dataset.loaded && video.dataset.loaded !== source()) {
        if (video.paused) {
          video.removeAttribute("src");
          delete video.dataset.loaded;
          figure.classList.remove("is-playing");
        } else {
          play();
        }
      }
    });

    showState(false);

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(
        function (entries) {
          inView = entries[entries.length - 1].isIntersecting;
          if (inView && !pausedByVisitor) {
            play();
          } else if (!inView && !video.paused) {
            pause();
          }
        },
        { threshold: 0.35 }
      ).observe(figure);
    }
  });

  /* --- The visitor's system goes first ------------------------------------ */

  function detectSystem() {
    var ua = navigator.userAgent;
    var platform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || "";
    if (/android|iphone|ipad|ipod/i.test(ua) || (/mac/i.test(platform) && navigator.maxTouchPoints > 1)) return null;
    if (/mac/i.test(platform)) return "mac";
    if (/win/i.test(platform)) return "win";
    if (/linux|x11/i.test(platform)) return "linux";
    return null;
  }

  var groups = document.querySelector("[data-download-groups]");
  var system = detectSystem();
  if (groups && system) {
    var mine = groups.querySelector('[data-os="' + system + '"]');
    if (mine) {
      groups.insertBefore(mine, groups.firstElementChild);
      var tag = mine.querySelector(".dl-group__yours");
      if (tag) tag.hidden = false;
    }
  }

  /* --- Today, in the Ethiopian calendar ----------------------------------- */

  /* The same sums as the app (src/features/notes/lib/ethiopian-calendar.ts), so
     a cached page still shows the visitor's own today. */
  var EPOCH = 1724221;
  var MONTHS = ["መስከረም", "ጥቅምት", "ኅዳር", "ታኅሣሥ", "ጥር", "የካቲት", "መጋቢት", "ሚያዝያ", "ግንቦት", "ሰኔ", "ሐምሌ", "ነሐሴ", "ጳጉሜ"];

  function jdnFrom(year, month, day) {
    return EPOCH - 1 + 365 * (year - 1) + Math.floor(year / 4) + 30 * (month - 1) + day;
  }

  var now = new Date();
  var isAmharic = root.lang.indexOf("am") === 0;
  var ethiopian = document.querySelector("[data-ethiopian-today]");
  if (ethiopian) {
    var jdn = Math.round(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000) + 2440588;
    var year = Math.floor((4 * (jdn - EPOCH) + 1463) / 1461);
    var month = Math.floor((jdn - jdnFrom(year, 1, 1)) / 30) + 1;
    var day = jdn + 1 - jdnFrom(year, month, 1);
    ethiopian.textContent = MONTHS[month - 1] + " " + day + (isAmharic ? "፣ " : ", ") + year;
  }

  var gregorian = document.querySelector("[data-gregorian-today]");
  if (gregorian && window.Intl) {
    gregorian.textContent = new Intl.DateTimeFormat(isAmharic ? "am-ET" : "en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      calendar: "gregory"
    }).format(now);
  }
})();

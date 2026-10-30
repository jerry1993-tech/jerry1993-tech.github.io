(() => {
  const root = document.documentElement;
  const header = document.querySelector(".site-header");
  const themeToggle = document.getElementById("theme-toggle");
  const menuToggle = document.getElementById("menu-toggle");
  const navLinks = document.getElementById("nav-links");
  const themeColor = document.getElementById("theme-color");

  const getPreferredTheme = () => {
    try {
      const stored = localStorage.getItem("theme");
      if (stored === "light" || stored === "dark") return stored;
    } catch (_) {}
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };

  const applyTheme = (theme) => {
    root.dataset.theme = theme;
    if (themeToggle) {
      themeToggle.setAttribute(
        "aria-label",
        theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
      );
    }
    if (themeColor) {
      themeColor.setAttribute("content", theme === "dark" ? "#070B13" : "#FBF8F2");
    }
  };

  applyTheme(getPreferredTheme());

  themeToggle?.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(next);
    try {
      localStorage.setItem("theme", next);
    } catch (_) {}
  });

  const closeMenu = () => {
    header?.classList.remove("nav-open");
    menuToggle?.setAttribute("aria-expanded", "false");
    menuToggle?.setAttribute("aria-label", "Open navigation menu");
  };

  menuToggle?.addEventListener("click", () => {
    const open = !header?.classList.contains("nav-open");
    header?.classList.toggle("nav-open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
  });

  navLinks?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 860) closeMenu();
  });

  const updateHeader = () => {
    header?.classList.toggle("is-scrolled", window.scrollY > 8);
  };
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  const revealItems = document.querySelectorAll(".reveal");
  const revealInView = () => {
    revealItems.forEach((item) => {
      if (item.classList.contains("is-visible")) return;
      const rect = item.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.95 && rect.bottom > 0) {
        item.classList.add("is-visible");
      }
    });
  };
  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }
  requestAnimationFrame(revealInView);
  window.addEventListener("load", revealInView, { once: true });

  const sections = [...document.querySelectorAll("main section[id]")];
  const navMap = new Map(
    [...(navLinks?.querySelectorAll('a[href^="#"]') || [])].map((link) => [
      link.getAttribute("href").slice(1),
      link,
    ])
  );

  if ("IntersectionObserver" in window && sections.length) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navMap.forEach((link) => link.classList.remove("is-active"));
          const active = navMap.get(entry.target.id);
          if (active) active.classList.add("is-active");
        });
      },
      { rootMargin: "-42% 0px -52% 0px", threshold: 0 }
    );
    sections.forEach((section) => spy.observe(section));
  }

  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  const USER = "jerry1993-tech";
  const CACHE_KEY = "gh-profile-data-v1";
  const CACHE_TTL = 20 * 60 * 1000;
  const numberFormat = new Intl.NumberFormat("en-US");

  const setStat = (key, value) => {
    document.querySelectorAll(`[data-stat="${key}"]`).forEach((el) => {
      el.textContent = numberFormat.format(value);
    });
  };

  const readCache = () => {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const cached = JSON.parse(raw);
      if (!cached || Date.now() - cached.time > CACHE_TTL) return null;
      return cached.data;
    } catch (_) {
      return null;
    }
  };

  const writeCache = (data) => {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ time: Date.now(), data }));
    } catch (_) {}
  };

  const fetchProfileData = async () => {
    const cached = readCache();
    if (cached) return cached;

    const headers = { Accept: "application/vnd.github+json" };
    const [userResponse, reposResponse] = await Promise.all([
      fetch(`https://api.github.com/users/${USER}`, { headers }),
      fetch(`https://api.github.com/users/${USER}/repos?per_page=100&sort=updated`, { headers }),
    ]);

    if (!userResponse.ok || !reposResponse.ok) {
      throw new Error(`GitHub API ${userResponse.status}/${reposResponse.status}`);
    }

    const data = {
      user: await userResponse.json(),
      repos: await reposResponse.json(),
    };
    writeCache(data);
    return data;
  };

  const updateRepoMeta = (repos) => {
    const byName = new Map(repos.map((repo) => [repo.name.toLowerCase(), repo]));
    document.querySelectorAll("[data-repo-stars], [data-repo-forks]").forEach((el) => {
      const name = el.dataset.repoStars || el.dataset.repoForks;
      const repo = byName.get(name.toLowerCase());
      if (!repo) return;

      if (el.dataset.repoStars) {
        el.textContent = numberFormat.format(repo.stargazers_count);
      } else {
        el.textContent = numberFormat.format(repo.forks_count);
      }
    });
  };

  (async () => {
    try {
      const { user, repos } = await fetchProfileData();
      const totalStars = repos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
      setStat("stars", totalStars);
      setStat("repos", user.public_repos);
      setStat("followers", user.followers);
      updateRepoMeta(repos);
    } catch (error) {
      // Static fallbacks in the markup are intentionally kept.
      console.warn("GitHub stats could not be refreshed:", error.message);
    }
  })();
})();

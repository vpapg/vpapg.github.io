// Keep the current navigation state useful for both sighted users and screen readers.
(function () {
  const page = document.body.getAttribute('data-page');
  document.querySelectorAll('[data-nav]').forEach((link) => {
    const isCurrent = link.dataset.nav === page;
    link.classList.toggle('active', isCurrent);
    if (isCurrent) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
})();

// Colour theme: Light, warm Reading, or Dark.
(function () {
  const storageKey = 'colour-theme';
  const allowedThemes = ['light', 'reading', 'dark'];
  const buttons = document.querySelectorAll('[data-theme-choice]');
  const themeColour = document.querySelector('meta[name="theme-color"]');
  const colours = { light: '#ffffff', reading: '#fff8dc', dark: '#17191d' };

  function themeFromUrl() {
    try {
      const value = new URLSearchParams(window.location.search).get('theme');
      return allowedThemes.includes(value) ? value : null;
    } catch (error) { return null; }
  }

  function getInitialTheme() {
    const fromUrl = themeFromUrl();
    if (fromUrl) return fromUrl;

    const current = document.documentElement.dataset.theme;
    if (allowedThemes.includes(current)) return current;

    try {
      const saved = localStorage.getItem(storageKey);
      if (allowedThemes.includes(saved)) return saved;
    } catch (error) {}

    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark' : 'light';
  }

  function updateLocalPreviewLinks(theme) {
    if (window.location.protocol !== 'file:') return;
    document.querySelectorAll('a[href]').forEach((link) => {
      const rawHref = link.getAttribute('href');
      if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) return;
      try {
        const url = new URL(rawHref, window.location.href);
        if (url.protocol !== 'file:') return;
        url.searchParams.set('theme', theme);
        link.href = url.href;
      } catch (error) {}
    });
  }

  function applyTheme(theme, save) {
    if (!allowedThemes.includes(theme)) return;
    document.documentElement.dataset.theme = theme;
    buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.themeChoice === theme)));
    if (themeColour) themeColour.setAttribute('content', colours[theme]);
    if (save) {
      try { localStorage.setItem(storageKey, theme); } catch (error) {}
    }
    updateLocalPreviewLinks(theme);
  }

  applyTheme(getInitialTheme(), false);
  buttons.forEach((button) => button.addEventListener('click', () => applyTheme(button.dataset.themeChoice, true)));
})();

// Current year in the footer.
(function () {
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();

// Render posts on the Home page. Inline JSON works with file://; posts.json is a fallback online.
(function () {
  if (document.body.getAttribute('data-page') !== 'home') return;
  const list = document.getElementById('posts-list');
  if (!list) return;

  function localDate(isoDate) {
    const parts = String(isoDate).split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function render(posts) {
    if (!Array.isArray(posts) || posts.length === 0) return;
    posts.sort((a, b) => localDate(b.date) - localDate(a.date));
    list.replaceChildren();

    posts.slice(0, 10).forEach((post) => {
      const item = document.createElement('li');
      item.className = 'list__item';
      const article = document.createElement('article');
      article.className = 'h-entry';
      const time = document.createElement('time');
      time.className = 'list__date';
      time.dateTime = post.date;
      time.textContent = localDate(post.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      const heading = document.createElement('h3');
      heading.className = 'list__title';
      const link = document.createElement('a');
      link.className = 'u-url';
      link.href = post.url || `posts/${post.slug}.html`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = post.title;
      heading.appendChild(link);
      article.append(time, heading);
      if (post.excerpt) {
        const excerpt = document.createElement('p');
        excerpt.className = 'list__excerpt';
        excerpt.textContent = post.excerpt;
        article.appendChild(excerpt);
      }
      item.appendChild(article);
      list.appendChild(item);
    });
  }

  const inline = document.getElementById('posts-data');
  if (inline && inline.textContent.trim()) {
    try { render(JSON.parse(inline.textContent)); return; } catch (error) {}
  }

  if (location.protocol !== 'file:') {
    fetch('posts.json', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : []))
      .then(render)
      .catch(() => {});
  }
})();

(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const root = document.documentElement;

  const reveal = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('is-in');
        reveal.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.08 },
  );
  $$('[data-reveal], .bars, .shutter').forEach((el) => reveal.observe(el));
  $$('.bars .bar').forEach((b, i) => b.style.setProperty('--n', i));
  setTimeout(() => $$('[data-reveal]').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.top < innerHeight && r.bottom > 0) el.classList.add('is-in');
  }), 1500);

  const top = $('[data-top]');
  const fields = $$('[data-field]');
  const FIELDS = ['f-moss', 'f-inverse', 'f-black', 'f-surface'];
  if (top && fields.length) {
    const under = new Set();
    let io;
    const watch = () => {
      io?.disconnect();
      under.clear();
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) e.isIntersecting ? under.add(e.target) : under.delete(e.target);
          const field = under.size ? [...under].at(-1).dataset.field : '';
          for (const f of FIELDS) top.classList.toggle(f, f === field);
        },
        { rootMargin: `-60px 0px -${Math.max(innerHeight - 61, 0)}px 0px` },
      );
      fields.forEach((f) => io.observe(f));
    };
    watch();
    addEventListener('resize', watch, { passive: true });
  }

  const themeBtn = $('[data-theme-toggle]');
  if (themeBtn) {
    const current = () => root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const label = () => themeBtn.setAttribute('aria-label', `Switch to ${current() === 'dark' ? 'light' : 'dark'} mode`);
    label();
    themeBtn.addEventListener('click', () => {
      const next = current() === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try {
        localStorage.setItem('theme', next);
      } catch {}
      label();
    });
  }

  for (const btn of $$('[data-run]')) {
    btn.addEventListener('click', async () => {
      const stage = btn.closest('[data-stage]');
      const img = $('img', stage);
      const src = btn.dataset.run;
      btn.disabled = true;
      btn.textContent = 'Loading';
      try {
        await fetch(src, { mode: 'no-cors', cache: 'no-store' });
        const frame = document.createElement('iframe');
        frame.src = src;
        frame.title = `${btn.dataset.title}, running live`;
        frame.allow = 'fullscreen; gpu';
        frame.loading = 'eager';
        if (img) img.replaceWith(frame);
        else stage.prepend(frame);
        btn.remove();
        frame.focus();
      } catch {
        btn.textContent = 'It did not answer. Try the tab link';
      }
    });
  }

  const copy = async (text, btn) => {
    const was = btn.textContent;
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = 'Copied';
    } catch {
      btn.textContent = 'Copy failed';
    }
    setTimeout(() => (btn.textContent = was), 1600);
  };
  $$('[data-copy]').forEach((b) => b.addEventListener('click', () => copy(b.dataset.copy, b)));
  $$('[data-copy-from]').forEach((b) => b.addEventListener('click', () => copy(document.getElementById(b.dataset.copyFrom).textContent, b)));

  const dialog = $('[data-palette]');
  if (!dialog) return;
  const input = $('input', dialog);
  const list = $('ul', dialog);
  let index = null;
  let hits = [];
  let sel = 0;

  const draw = () => {
    const q = input.value.trim().toLowerCase();
    const words = q.split(/\s+/).filter(Boolean);
    hits = (index || [])
      .map((item) => {
        const hay = `${item.t} ${item.d || ''} ${item.k}`.toLowerCase();
        if (!words.every((w) => hay.includes(w))) return null;
        const score = (item.t.toLowerCase().startsWith(q) ? 0 : 1) + (item.k === 'Page' ? 0 : 0.5);
        return { item, score };
      })
      .filter(Boolean)
      .sort((a, b) => a.score - b.score)
      .slice(0, q ? 12 : 7)
      .map((h) => h.item);
    sel = Math.min(sel, Math.max(hits.length - 1, 0));
    list.innerHTML = '';
    hits.forEach((h, i) => {
      const li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(i === sel));
      const a = document.createElement('a');
      a.href = h.u;
      a.textContent = h.t;
      const k = document.createElement('span');
      k.textContent = h.k;
      a.append(k);
      li.append(a);
      list.append(li);
    });
    if (!hits.length) {
      const li = document.createElement('li');
      li.textContent = 'Nothing matches.';
      li.style.padding = '11px 20px';
      list.append(li);
    }
  };

  const open = async () => {
    if (!dialog.open) dialog.showModal();
    input.value = '';
    sel = 0;
    if (!index) {
      try {
        index = await (await fetch('/search.json')).json();
      } catch {
        index = [];
      }
    }
    draw();
    input.focus();
  };

  $$('[data-palette-open]').forEach((b) => b.addEventListener('click', open));
  addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');
    if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
      e.preventDefault();
      open();
    }
  });
  input.addEventListener('input', () => {
    sel = 0;
    draw();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + hits.length) % Math.max(hits.length, 1);
      draw();
      $('[aria-selected="true"]', list)?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (hits[sel]) {
        dialog.close();
        location.href = hits[sel].u;
      }
    }
  });
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
    if (e.target.closest('a')) dialog.close();
  });
})();

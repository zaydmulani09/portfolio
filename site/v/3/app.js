// Two jobs: turn absolute dates into relative ones, and start the demos.
// The page is complete and readable with this file blocked.
(() => {
  /* dates ---------------------------------------------------------------- */
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const steps = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];

  for (const el of document.querySelectorAll('time[data-rel]')) {
    const then = new Date(el.dateTime);
    if (Number.isNaN(+then)) continue;
    const secs = (then - Date.now()) / 1000;
    const abs = Math.abs(secs);
    let text = 'just now';
    for (const [unit, size] of steps) {
      if (abs >= size) { text = rtf.format(Math.round(secs / size), unit); break; }
    }
    el.title = then.toISOString();
    el.textContent = text;
  }

  /* demos ---------------------------------------------------------------- */
  // Each demo is the real deployment in an iframe. Nothing third-party loads
  // until a frame is actually mounted, so a visitor who never presses run
  // makes no request off this origin.
  // Whether a frame actually painted cannot be read from the page: a refused
  // load and a healthy cross-origin one both throw SecurityError. So ask the
  // network instead. A no-cors fetch resolves opaquely when the deployment
  // answers and rejects when it is gone, which is the failure that will
  // actually happen here over time.
  async function reachable(src) {
    try {
      await fetch(src, { mode: 'no-cors', cache: 'no-store', signal: AbortSignal.timeout(5000) });
      return true;
    } catch {
      return false;
    }
  }

  function down(host, src) {
    host.classList.add('stage-down');
    host.classList.remove('stage-idle');
    host.innerHTML = `<p class="stage-note">This one is not answering right now. <a href="${src}">Try it on its own page</a>, or read the source below.</p>`;
  }

  async function mount(host, src, title) {
    if (host.querySelector('iframe') || host.dataset.mounting === 'yes') return;
    host.dataset.mounting = 'yes';

    if (!(await reachable(src))) {
      down(host, src);
      return;
    }

    const frame = document.createElement('iframe');
    frame.src = src;
    frame.title = `${title}, running live`;
    frame.loading = 'lazy';
    frame.allow = 'fullscreen';
    frame.referrerPolicy = 'strict-origin-when-cross-origin';

    host.textContent = '';
    host.classList.remove('stage-idle');
    host.appendChild(frame);
    frame.addEventListener('load', () => host.classList.add('is-live'), { once: true });
  }

  for (const btn of document.querySelectorAll('button.run')) {
    btn.addEventListener('click', () => {
      const host = document.createElement('div');
      host.className = 'stage stage-inline';
      btn.closest('.work').appendChild(host);
      btn.remove();
      mount(host, btn.dataset.src, btn.dataset.title);
    });
  }

  /* pulse tooltip -------------------------------------------------------- */
  // Enhances the contribution bars with a small panel naming the day and its
  // mix, each line dotted in its colour. Every bar already carries the same
  // text in a title attribute, so this is pure polish and the page is complete
  // without it. Falls back to nothing if there are no graph bars.
  const graphBars = document.querySelector('.bars-graph');
  if (graphBars) {
    const KIND = {
      commit: ['Commits', 'var(--c-commit)', 'commit'],
      pr: ['Pull requests', 'var(--c-pr)', 'pull request'],
      issue: ['Issues', 'var(--c-issue)', 'issue'],
      review: ['Reviews', 'var(--c-review)', 'review'],
      other: ['Other', 'var(--c-other)', 'other'],
    };
    const tip = document.createElement('div');
    tip.className = 'pulse-tip';
    tip.setAttribute('role', 'presentation');
    document.body.appendChild(tip);

    const fill = (tick) => {
      const day = tick.dataset.day || '';
      const parts = (tick.dataset.parts || '')
        .split(',')
        .map((s) => s.split(':'))
        .filter(([k, v]) => KIND[k] && +v > 0);
      let rows = `<p class="tip-day">${day}</p>`;
      if (!parts.length) {
        rows += '<p class="tip-none">nothing this day</p>';
      } else {
        for (const [k, v] of parts) {
          const [, colour, one] = KIND[k];
          const n = +v;
          rows += `<p class="tip-row"><span class="tip-dot" style="background:${colour}"></span>${n.toLocaleString('en-US')} ${n === 1 ? one : one + 's'}</p>`;
        }
      }
      tip.innerHTML = rows;
    };

    const place = (tick) => {
      const r = tick.getBoundingClientRect();
      const t = tip.getBoundingClientRect();
      let left = r.left + r.width / 2 - t.width / 2;
      left = Math.max(10, Math.min(left, window.innerWidth - t.width - 10));
      let top = r.top - t.height - 10;
      if (top < 10) top = r.bottom + 10; // flip below if there is no room above
      tip.style.left = `${left}px`;
      tip.style.top = `${top}px`;
    };

    const show = (e) => {
      const tick = e.currentTarget;
      fill(tick);
      place(tick);
      tip.classList.add('show');
    };
    const hide = () => tip.classList.remove('show');

    for (const tick of graphBars.querySelectorAll('.tick')) {
      tick.addEventListener('mouseenter', show);
      tick.addEventListener('focus', show);
      tick.addEventListener('mouseleave', hide);
      tick.addEventListener('blur', hide);
    }
    window.addEventListener('scroll', hide, { passive: true });
  }
})();

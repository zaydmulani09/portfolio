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

  const heroStage = document.querySelector('.hero .stage[data-src]');
  if (heroStage) {
    const small = window.matchMedia('(max-width: 720px)').matches;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const thrifty = navigator.connection?.saveData === true;

    if (small || still || thrifty) {
      // Do not spin up a GPU simulation on a phone, a metered connection, or
      // for someone who has asked for less motion. Offer it instead.
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'run run-big';
      btn.textContent = `Run ${heroStage.dataset.title}`;
      btn.addEventListener('click', () =>
        mount(heroStage, heroStage.dataset.src, heroStage.dataset.title),
      );
      heroStage.classList.add('stage-idle');
      heroStage.appendChild(btn);
    } else {
      mount(heroStage, heroStage.dataset.src, heroStage.dataset.title);
    }
  }

  for (const btn of document.querySelectorAll('button.run:not(.run-big)')) {
    btn.addEventListener('click', () => {
      const host = document.createElement('div');
      host.className = 'stage stage-inline';
      btn.closest('.work').appendChild(host);
      btn.remove();
      mount(host, btn.dataset.src, btn.dataset.title);
    });
  }
})();

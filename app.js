/* KATZE Work Hub — checklist, install prompt and service worker registration.
   Vanilla JS, no dependencies. Safe to run even if parts of the DOM are missing. */
(function () {
  'use strict';

  // Guard against the script being evaluated twice (prevents duplicate listeners).
  if (window.__katzeHubReady) return;
  window.__katzeHubReady = true;

  const STORAGE_KEY = 'katzeWorkHub.checklist.v1';

  const $ = (selector) => document.querySelector(selector);
  const setText = (el, text) => { if (el) el.textContent = text; };

  /* ------------------------------------------------------------------ */
  /* Storage (localStorage can be blocked, full or disabled)             */
  /* ------------------------------------------------------------------ */

  const storage = (function () {
    let ls = null;
    try {
      ls = window.localStorage;
      const probe = '__katze_probe__';
      ls.setItem(probe, '1');
      ls.removeItem(probe);
    } catch (err) {
      ls = null;
    }
    return {
      available: ls !== null,
      read(key) {
        if (!ls) return null;
        try { return ls.getItem(key); } catch (err) { return null; }
      },
      write(key, value) {
        if (!ls) return false;
        try { ls.setItem(key, value); return true; } catch (err) { return false; }
      }
    };
  })();

  /* ------------------------------------------------------------------ */
  /* Daily checklist                                                     */
  /* ------------------------------------------------------------------ */

  function localDateKey(date) {
    const d = date || new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function initChecklist() {
    const list = $('#checklist');
    if (!list) return;
    const boxes = Array.prototype.slice.call(list.querySelectorAll('input[type="checkbox"][data-task]'));
    if (!boxes.length) return;

    const el = {
      done: $('#cl-done'),
      total: $('#cl-total'),
      percent: $('#cl-percent'),
      bar: $('#cl-bar'),
      fill: $('#cl-fill'),
      date: $('#cl-date'),
      live: $('#cl-live'),
      notice: $('#cl-notice'),
      reset: $('#cl-reset'),
      dialog: $('#reset-dialog'),
      confirm: $('#reset-confirm'),
      cancel: $('#reset-cancel')
    };

    const taskIds = boxes.map((b) => b.dataset.task);
    const labelFor = (box) => {
      const t = box.closest('label');
      return t ? t.textContent.trim() : box.dataset.task;
    };

    const freshState = () => ({ date: localDateKey(), done: {} });

    function loadState() {
      const raw = storage.read(STORAGE_KEY);
      if (!raw) return freshState();
      try {
        const parsed = JSON.parse(raw);
        const valid = parsed && typeof parsed === 'object' &&
          typeof parsed.date === 'string' && parsed.date === localDateKey() &&
          parsed.done && typeof parsed.done === 'object';
        if (!valid) return freshState();           // missing, corrupt, or from a previous day
        const done = {};
        taskIds.forEach((id) => { if (parsed.done[id] === true) done[id] = true; });
        return { date: parsed.date, done: done };
      } catch (err) {
        return freshState();
      }
    }

    let state = loadState();

    function showStorageNotice(show) {
      if (el.notice) el.notice.hidden = !show;
    }

    function persist() {
      const ok = storage.write(STORAGE_KEY, JSON.stringify(state));
      showStorageNotice(!ok);
    }

    function announce(message) {
      setText(el.live, message);
    }

    function counts() {
      const total = taskIds.length;
      const done = taskIds.filter((id) => state.done[id]).length;
      const percent = total ? Math.round((done / total) * 100) : 0;
      return { done: done, total: total, percent: percent };
    }

    function render() {
      boxes.forEach((box) => { box.checked = !!state.done[box.dataset.task]; });
      const c = counts();
      setText(el.done, String(c.done));
      setText(el.total, String(c.total));
      setText(el.percent, c.percent + '%');
      if (el.fill) el.fill.style.width = c.percent + '%';
      if (el.bar) {
        el.bar.setAttribute('aria-valuenow', String(c.percent));
        el.bar.setAttribute('aria-valuetext', c.done + ' of ' + c.total + ' completed');
        el.bar.classList.toggle('is-complete', c.total > 0 && c.done === c.total);
      }
      if (el.date) {
        try {
          el.date.textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
        } catch (err) {
          el.date.textContent = state.date;
        }
      }
    }

    // Start a new checklist if the local calendar date has changed.
    function syncDate() {
      if (state.date === localDateKey()) return;
      state = freshState();
      persist();
      render();
      announce('A new day has started. Your checklist has been reset.');
    }

    function scheduleMidnightCheck() {
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
      setTimeout(() => { syncDate(); scheduleMidnightCheck(); }, Math.max(1000, next - now));
    }

    // One delegated listener for all checkboxes.
    list.addEventListener('change', (event) => {
      const box = event.target;
      if (!(box instanceof HTMLInputElement) || !box.dataset.task) return;
      if (state.date !== localDateKey()) state = freshState();   // date rolled over while the page was open
      if (box.checked) state.done[box.dataset.task] = true;
      else delete state.done[box.dataset.task];
      persist();
      render();
      const c = counts();
      announce(labelFor(box) + (box.checked ? ' checked. ' : ' unchecked. ') + c.done + ' of ' + c.total + ' completed.');
    });

    function doReset() {
      state = freshState();
      persist();
      render();
      announce('Checklist reset. 0 of ' + taskIds.length + ' completed.');
    }

    const hasDialog = el.dialog && typeof el.dialog.showModal === 'function';

    if (el.reset) {
      el.reset.addEventListener('click', () => {
        if (hasDialog) {
          if (!el.dialog.open) el.dialog.showModal();
        } else if (window.confirm("Reset today's checklist? All items will be unchecked.")) {
          doReset();
        }
      });
    }
    if (hasDialog) {
      if (el.confirm) el.confirm.addEventListener('click', () => { el.dialog.close(); doReset(); });
      if (el.cancel) el.cancel.addEventListener('click', () => el.dialog.close());
    }

    // Keep multiple tabs / the installed app in sync.
    window.addEventListener('storage', (event) => {
      if (event.key === STORAGE_KEY || event.key === null) {
        state = loadState();
        render();
      }
    });

    // Re-check the date whenever the app comes back to the foreground.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') syncDate();
    });
    window.addEventListener('pageshow', syncDate);
    window.addEventListener('focus', syncDate);

    showStorageNotice(!storage.available);
    render();
    scheduleMidnightCheck();
  }

  /* ------------------------------------------------------------------ */
  /* Install button (Android Chrome and other beforeinstallprompt browsers) */
  /* ------------------------------------------------------------------ */

  function isStandalone() {
    const mq = (q) => window.matchMedia && window.matchMedia(q).matches;
    return mq('(display-mode: standalone)') || mq('(display-mode: fullscreen)') ||
      mq('(display-mode: minimal-ui)') || window.navigator.standalone === true;
  }

  function initInstall() {
    const btn = $('#install-btn');
    const status = $('#install-status');
    const help = $('#install-help');
    if (!btn && !status) return;

    let deferredPrompt = null;

    function say(message, ok) {
      if (!status) return;
      status.textContent = message;
      status.classList.toggle('is-ok', !!ok);
    }

    function showInstalled() {
      deferredPrompt = null;
      if (btn) btn.hidden = true;
      if (help) help.hidden = true;
      say('Katze Work Hub is installed on this device and running as an app.', true);
    }

    function openHelp() {
      if (help) help.open = true;
    }

    if (isStandalone()) {
      showInstalled();
      return;
    }

    if (!window.isSecureContext) {
      say('Installation needs a secure (HTTPS) connection. Open the GitHub Pages address of this app to install it.');
    }

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();            // keep the event so the button can trigger it
      deferredPrompt = event;
      say('Your browser can install this app. Tap the button to continue.');
    });

    window.addEventListener('appinstalled', showInstalled);   // only claim success when the browser confirms it

    if (window.matchMedia) {
      const mql = window.matchMedia('(display-mode: standalone)');
      const onChange = (e) => { if (e.matches) showInstalled(); };
      if (mql.addEventListener) mql.addEventListener('change', onChange);
    }

    if (btn) {
      btn.addEventListener('click', async () => {
        if (!deferredPrompt) {
          openHelp();
          say("Your browser isn't offering a one-tap install right now. Follow the steps below, or open this page in Chrome on Android.");
          return;
        }
        const promptEvent = deferredPrompt;
        deferredPrompt = null;           // a prompt event can only be used once
        try {
          await promptEvent.prompt();
          const choice = await promptEvent.userChoice;
          if (choice && choice.outcome === 'accepted') {
            say('Install accepted. Your browser is adding the app. Look for it on your home screen or in your app list.');
          } else {
            say('Install cancelled. You can install later from the browser menu (see the steps below).');
            openHelp();
          }
        } catch (err) {
          say("The install prompt couldn't be shown. Follow the steps below instead.");
          openHelp();
        }
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Service worker + update handling                                    */
  /* ------------------------------------------------------------------ */

  function initServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (!window.isSecureContext) return;   // service workers need HTTPS (or localhost)

    const banner = $('#update-banner');
    const updateBtn = $('#update-btn');
    const hadController = !!navigator.serviceWorker.controller;
    let pendingWorker = null;
    let reloading = false;

    function offerUpdate(worker) {
      pendingWorker = worker;
      if (banner) banner.hidden = false;
    }

    if (updateBtn) {
      updateBtn.addEventListener('click', () => {
        if (pendingWorker) pendingWorker.postMessage({ type: 'SKIP_WAITING' });
        else window.location.reload();
      });
    }

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloading) return;   // first install should not trigger a reload
      reloading = true;
      window.location.reload();
    });

    function register() {
      // Relative URL: resolves to /katze-work-hub/sw.js on GitHub Pages, scope /katze-work-hub/
      navigator.serviceWorker.register('sw.js', { scope: './' }).then((reg) => {
        if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);

        reg.addEventListener('updatefound', () => {
          const worker = reg.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(worker);
          });
        });

        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') reg.update().catch(() => {});
        });
      }).catch((err) => {
        console.warn('Service worker registration failed:', err);
      });
    }

    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }

  /* ------------------------------------------------------------------ */

  initChecklist();
  initInstall();
  initServiceWorker();
})();

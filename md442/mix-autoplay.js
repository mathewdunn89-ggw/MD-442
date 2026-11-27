/* Full Moon Radio on page load, quiet, with the strobes flashing in time.
   Starts the Full Moon Radio mix (the Mixcloud player in the Sound section) when the site opens,
   and shows a small Pause/Play pill until the visitor scrolls to the player itself.
   Browsers only allow sound after the visitor's first click, tap or key press, so the mix starts on that if it could not start at once. */
(() => {
  'use strict';
  const me = document.currentScript, wantGate = !!(me && me.dataset.enter);   // data-enter on the script tag: this page gets the Enter screen and the docked player
  const VOLUME = 0.2;   // 20% — the mix plays quietly in the background
  const MIX_BPM = 136;  // the strobes flash at this tempo while the mix plays (the page cannot hear Mixcloud's audio, so it cannot find the real beat)
  let beatT = 0, beat0 = 0, beatN = 0;
  function beats(on) {
    const S = window.MDStrobe = window.MDStrobe || {};
    clearTimeout(beatT);
    if (!on) { if (S.music === 'mix') S.music = null; return; }
    S.music = 'mix'; beat0 = performance.now(); beatN = 0;
    const step = () => {
      if (S.music !== 'mix') return;
      if (S.flash && !document.hidden) S.flash(true);
      beatN++; beatT = setTimeout(step, Math.max(0, beat0 + beatN * 60000 / MIX_BPM - performance.now()));
    };
    step();
  }
  let frame = null, widget = null, playing = false, stopped = false, wanted = true, inView = false, pill = null, label = null;
  // Stopping the music is remembered (in this browser, across pages and visits) until the visitor starts it again.
  try { if (localStorage.getItem('mix-off') === '1' || sessionStorage.getItem('mix-off') === '1') wanted = false; } catch (_) {}
  const remember = off => { try { sessionStorage.setItem('mix-off', off ? '1' : '0'); } catch (_) {} try { localStorage.setItem('mix-off', off ? '1' : '0'); } catch (_) {} };

  function draw() {
    if (!pill) return;
    pill.hidden = !widget || inView || !!dockEl;    // with the docked player on screen, the player itself is the button
    if (hintEl) hintEl.hidden = !(dockEl && wanted && !playing && hintOn);
    pill.setAttribute('aria-pressed', playing ? 'true' : 'false');
    pill.setAttribute('aria-label', playing ? 'Pause Full Moon Radio' : 'Play Full Moon Radio');
    lit(pill.firstChild, playing);
    label.textContent = playing ? 'Full Moon Radio · Pause' : 'Play Full Moon Radio';
    pill.style.borderColor = playing ? '#3a3a3a' : '#3dff7a'; pill.style.boxShadow = playing || !wanted ? 'none' : '0 0 0 2px rgba(61,255,122,.35), 0 0 18px rgba(61,255,122,.55)';   // when the browser held the sound back, the button glows so one tap starts it
  }
  const PILL = "display:flex;align-items:center;gap:10px;padding:12px 16px;border-radius:999px;border:1px solid #3a3a3a;background:rgba(10,10,10,.9);color:#f2f2f2;font-family:'Martian Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)";
  const DOT = 'width:8px;height:8px;border-radius:50%;border:1px solid #3dff7a;flex:none';
  const lit = (dot, on) => { dot.style.background = on ? '#3dff7a' : '#0a0a0a'; dot.style.boxShadow = on ? '0 0 6px #3dff7a, 0 0 12px rgba(61,255,122,.7)' : 'none'; };
  let dock = null;
  // bottom-left dock for the mix pill. The strobe has no switch: it is always on.
  function mkDock() {
    if (dock) return dock;
    const S = window.MDStrobe = window.MDStrobe || {};
    S.off = false;   // the strobe is always on: the only control on the page is the music
    dock = document.createElement('div'); dock.style.cssText = 'position:fixed;left:16px;bottom:16px;z-index:60;display:flex;flex-direction:column;align-items:flex-start;gap:8px';
    const st = document.createElement('style'); st.textContent = '[hidden]{display:none!important}'; document.head.append(st);
    document.body.append(dock); return dock;
  }
  function mkPill() {
    pill = document.createElement('button'); pill.type = 'button'; pill.hidden = true;
    pill.style.cssText = PILL;
    const dot = document.createElement('span'); dot.style.cssText = DOT;
    label = document.createElement('span'); pill.append(dot, label);
    pill.addEventListener('click', e => {
      e.stopPropagation(); if (!widget) return;
      if (playing) { wanted = false; remember(true); widget.pause(); } else { wanted = true; remember(false); widget.play(); }
    });
    mkDock().prepend(pill);
  }
  const tryPlay = () => { if (widget && wanted && !playing && !stopped && !gateOpen) { try { widget.play(); } catch (_) {} } };

  // first click, tap or key press anywhere starts the mix, unless it is on the drum machine or the Beatmatch game
  let gateOpen = false;
  function gesture(e) {
    if (gateOpen) return;                           // the Enter screen decides first
    const own = e.target && e.target.closest && e.target.closest('#machine, #beatmatch');
    if (own) { stopped = true; if (widget && playing) widget.pause(); return; }   // their own sound takes over
    if (dock && dock.contains(e.target)) return;
    tryPlay();
  }
  ['pointerdown', 'pointerup', 'click', 'touchend', 'keydown'].forEach(t => document.addEventListener(t, gesture, true));
  // scrolling is not enough for a browser to allow sound, but it costs nothing to try (it works for returning visitors)
  let lastTry = 0; ['wheel', 'scroll'].forEach(t => addEventListener(t, () => { const n = Date.now(); if (n - lastTry > 1500) { lastTry = n; tryPlay(); } }, { passive: true, capture: true }));

  // The page builds itself after loading and can swap the player element for a new one, so bind to whichever one is on the page now.
  let io = null, apiState = 0, binds = 0;
  function bind(el) {
    frame = el; widget = null; playing = false; binds++; beats(false);
    if (!pill) mkPill();
    if (window.IntersectionObserver) { if (io) io.disconnect(); inView = false; io = new IntersectionObserver(es => { inView = es[es.length - 1].isIntersecting; draw(); }, { threshold: .5 }); io.observe(el); }
    const go = () => {
      if (frame !== el) return;
      const w = window.Mixcloud.PlayerWidget(el);
      w.ready.then(() => {
        if (frame !== el) return;
        widget = w;
        // Play and pause pressed inside the Mixcloud player itself count as the visitor's choice too:
        // a pause there stops the page from starting the mix again on the next click, scroll or page.
        w.events.play.on(() => { if (frame !== el) return; playing = true; stopped = false; if (!wanted) { wanted = true; remember(false); } draw(); beats(true); });
        w.events.pause.on(() => { if (frame !== el) return; const mine = playing && !stopped; playing = false; if (mine && wanted) { wanted = false; remember(true); } draw(); beats(false); });
        w.events.ended.on(() => { if (frame !== el) return; playing = false; draw(); beats(false); });
        try { w.setVolume(VOLUME); } catch (_) {}
        draw(); tryPlay();
      });
    };
    if (apiState === 2) go();
    else { apiWait.push(go); if (!apiState) { apiState = 1; const s = document.createElement('script'); s.src = 'https://widget.mixcloud.com/media/js/widgetApi.js'; s.onload = () => { apiState = 2; apiWait.splice(0).forEach(f => f()); }; document.head.append(s); } }
    draw();
  }
  const apiWait = [];
  // Docked player (pages with data-enter): a slim Mixcloud player fixed to the bottom of the screen, made at the moment the
  // visitor presses Enter. Where the browser allows sound after that press (desktop, Android) it starts by itself.
  // Where it does not (iPhone: only a tap inside the player counts) its play button is right there, with a hint above it.
  let dockEl = null, hintEl = null, hintOn = false;
  const FEED = '/dunnyggw/full-moon-radio-techno/';
  function mkPlayer(autoplay) {
    if (dockEl) return;
    const inPage = document.querySelector('iframe[title="Mixcloud"]'); let feed = FEED; try { feed = new URL(inPage.src).searchParams.get('feed') || FEED; } catch (_) {}
    dockEl = document.createElement('div'); dockEl.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:55;height:calc(60px + env(safe-area-inset-bottom));padding-bottom:env(safe-area-inset-bottom);display:flex;align-items:center;background:#111;border-top:1px solid #2a2a2a';
    const f = document.createElement('iframe'); f.id = 'mc-dock'; f.title = 'Full Moon Radio player'; f.setAttribute('allow', 'autoplay; encrypted-media; fullscreen; idle-detection; speaker-selection; web-share'); f.setAttribute('frameborder', '0');
    f.style.cssText = 'display:block;flex:1 1 0;min-width:0;height:60px;border:0'; f.src = 'https://player-widget.mixcloud.com/widget/iframe/?mini=1&hide_cover=1&light=0' + (autoplay ? '&autoplay=1' : '') + '&feed=' + encodeURIComponent(feed);
    hintEl = document.createElement('div'); hintEl.hidden = true; hintEl.textContent = 'Tap ▶ below to start Full Moon Radio'; hintEl.setAttribute('role', 'status');
    hintEl.style.cssText = "position:absolute;left:12px;bottom:calc(100% + 8px);padding:9px 14px;border-radius:999px;background:#3dff7a;color:#0a0a0a;font-family:'Martian Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;pointer-events:none;box-shadow:0 0 18px rgba(61,255,122,.5)";
    dockEl.append(hintEl, f); document.body.append(dockEl);
    document.documentElement.style.scrollPaddingBottom = '72px'; document.body.style.paddingBottom = 'calc(60px + env(safe-area-inset-bottom))';
    setTimeout(() => { hintOn = true; draw(); }, 3500);      // only shown if the mix has not started by then
    scan();
  }
  const find = () => document.querySelector('#mc-dock') || (wantGate ? null : document.querySelector('iframe[title="Mixcloud"]'));
  let scanT = 0;
  const scan = () => { scanT = 0; const f = find(); if (f && f !== frame) bind(f); };
  new MutationObserver(() => { if (!scanT) scanT = setTimeout(scan, 150); }).observe(document.documentElement, { childList: true, subtree: true });
  window.MDMix = { get binds() { return binds; }, get frame() { return frame; } };
  scan();
  // ENTER screen (only on pages whose script tag has data-enter): browsers do not let a page start sound until the visitor
  // clicks, so the first thing they see is one button. That click is what lets Full Moon Radio start.
  function mkGate() {
    let seen = false; try { seen = sessionStorage.getItem('entered') === '1'; } catch (_) {}
    if (seen) return;
    const mono = "font-family:'Martian Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase";
    const gate = document.createElement('div'); gate.setAttribute('role', 'dialog'); gate.setAttribute('aria-modal', 'true'); gate.setAttribute('aria-label', 'Enter the site');
    gate.style.cssText = 'position:fixed;inset:0;z-index:200;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px;padding:24px;text-align:center;background:#0a0a0a;color:#f2f2f2;transition:opacity .45s ease';
    const name = document.createElement('div'); name.textContent = 'MATHEW'; name.style.cssText = "font-family:'Anybody',sans-serif;font-weight:900;font-variation-settings:'wdth' 150;font-size:clamp(56px,14vw,200px);line-height:.82;letter-spacing:-.04em";
    const go = document.createElement('button'); go.type = 'button'; go.textContent = 'Enter'; go.style.cssText = mono + ';padding:20px 44px;border-radius:999px;border:1px solid #3dff7a;background:#3dff7a;color:#0a0a0a;cursor:pointer;box-shadow:0 0 0 0 rgba(61,255,122,.5),0 0 24px rgba(61,255,122,.45)';
    const quiet = document.createElement('button'); quiet.type = 'button'; quiet.textContent = 'Enter without music'; quiet.style.cssText = mono + ';font-size:10px;padding:12px 16px;border:0;background:none;color:#a3a3a3;cursor:pointer;text-decoration:underline;text-underline-offset:4px';
    gate.append(name, go, quiet);
    const scroll = document.documentElement.style.overflow; document.documentElement.style.overflow = 'hidden';
    const close = sound => {
      try { sessionStorage.setItem('entered', '1'); } catch (_) {}
      gateOpen = false; wanted = sound; remember(!sound); stopped = false; document.documentElement.style.overflow = scroll; document.removeEventListener('keydown', keys, true);
      gate.style.opacity = '0'; gate.style.pointerEvents = 'none'; setTimeout(() => gate.remove(), 500);
      mkPlayer(sound);                           // made inside the click, so browsers that allow sound after a press start it straight away
      draw();
    };
    const keys = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(false); } else if (e.key === 'Tab') { e.preventDefault(); (document.activeElement === go ? quiet : go).focus(); } else if (e.key !== 'Enter' && e.key !== ' ') e.stopPropagation(); };
    go.addEventListener('click', e => { e.stopPropagation(); close(true); }); quiet.addEventListener('click', e => { e.stopPropagation(); close(false); });
    ['pointerdown', 'pointerup', 'touchend'].forEach(t => gate.addEventListener(t, e => e.stopPropagation()));   // taps on the screen itself decide nothing; only the two buttons do
    document.addEventListener('keydown', keys, true);
    gateOpen = true; document.body.append(gate); go.focus({ preventScroll: true });
  }
  const start = () => { mkDock(); if (wantGate) { mkGate(); if (!gateOpen) mkPlayer(wanted); } };   // same visit, already entered: bring the player straight back
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();

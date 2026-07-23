/* ============================================================================
   TouchPad — a clean, modular touch overlay for keyboard-driven web games.

   Drop into any game that reads key events from window/document —
   load this file with a script tag, then configure:

       TouchPad.init({
         keys:    { up:'ArrowUp', down:'ArrowDown', left:'ArrowLeft', right:'ArrowRight' },
         buttons: [ { label:'A', key:' ', accent:true },   // held while touched
                    { label:'B', key:'Escape' } ],
         chips:   [ { label:'SOUND', on:'s', off:'q', initial:true } ],  // toggles
       });

   (NOTE: keep the literal string "</scr" + "ipt>" out of this file — it is
   inlined into HTML by build scripts, and the tag would end the host block.)

   It works by dispatching synthetic KeyboardEvents, so the host game needs no
   changes — anything listening for real keyboard input just works.

   Options:
     target     where events go (default: window)
     show       'auto' | 'always' | 'never'   (default 'auto': touch devices only;
                URL override ?touchpad=1 / ?touchpad=0 forces on/off)
     diagonals  true -> 8-way pad (presses two keys on diagonals)
     haptics    navigator.vibrate on press (default true)
     keys/buttons/chips as above. Buttons also accept { on, off } to behave as
     toggles, chips accept { key } to behave as momentary taps.

   API: TouchPad.init(cfg) | TouchPad.destroy() | TouchPad.show() | TouchPad.hide()
   ========================================================================== */
window.TouchPad = (() => {
  "use strict";

  const DIR4 = ["up", "right", "down", "left"];   // angle order: 0° = up, clockwise
  let S = null;                                    // live session state

  /* ------------------------------------------------------------- events */

  function fire(type, key) {
    S.target.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true, cancelable: true }));
  }
  function press(key)   { if (!S.held.has(key)) { S.held.add(key); fire("keydown", key); } }
  function release(key) { if (S.held.delete(key)) fire("keyup", key); }
  function tap(key) {
    press(key);
    setTimeout(() => release(key), 70);
  }
  function releaseAll() { for (const k of [...S.held]) release(k); }
  function buzz() { if (S.haptics && navigator.vibrate) navigator.vibrate(6); }

  /* ------------------------------------------------------------ d-pad */

  // direction set (subset of DIR4) for a point on the pad, or null in dead zone
  function padDirs(x, y) {
    const r = S.pad.getBoundingClientRect();
    const dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height / 2);
    const dist = Math.hypot(dx, dy);
    if (dist < r.width * 0.16) return null;                       // dead zone
    const ang = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360; // 0=up, cw
    if (!S.diagonals) return [DIR4[Math.round(ang / 90) % 4]];
    const i = Math.round(ang / 45) % 8;                            // 8-way
    return i % 2 === 0 ? [DIR4[i / 2]] : [DIR4[(i - 1) / 2], DIR4[(i + 1) / 2 % 4]];
  }

  function padSet(dirs) {
    const want = new Set((dirs || []).map(d => S.keys[d]));
    for (const k of S.padKeys) if (!want.has(k)) release(k);
    for (const k of want)      if (!S.padKeys.has(k)) press(k);
    S.padKeys = want;
    for (const d of DIR4)
      S.wedges[d].classList.toggle("tp-active", !!(dirs && dirs.includes(d)));
  }

  function bindPad() {
    let pid = null;
    S.pad.addEventListener("pointerdown", e => {
      if (pid !== null) return;
      pid = e.pointerId;
      S.pad.setPointerCapture(pid);
      buzz();
      padSet(padDirs(e.clientX, e.clientY));
    });
    S.pad.addEventListener("pointermove", e => {
      if (e.pointerId === pid) padSet(padDirs(e.clientX, e.clientY));
    });
    const end = e => { if (e.pointerId === pid) { pid = null; padSet(null); } };
    S.pad.addEventListener("pointerup", end);
    S.pad.addEventListener("pointercancel", end);
  }

  /* ------------------------------------------------- buttons and chips */

  function bindHold(el, key) {
    let pid = null;
    const on = e => {
      if (pid !== null) return;
      pid = e.pointerId;
      el.setPointerCapture(pid);
      el.classList.add("tp-active");
      buzz(); press(key);
    };
    const off = e => {
      if (e.pointerId !== pid) return;
      pid = null;
      el.classList.remove("tp-active");
      release(key);
    };
    el.addEventListener("pointerdown", on);
    el.addEventListener("pointerup", off);
    el.addEventListener("pointercancel", off);
    el.addEventListener("lostpointercapture", off);
  }

  function bindTap(el, key) {
    el.addEventListener("pointerdown", () => {
      el.classList.add("tp-active");
      buzz(); tap(key);
      setTimeout(() => el.classList.remove("tp-active"), 110);
    });
  }

  function bindToggle(el, onKey, offKey, initial) {
    let state = !!initial;
    el.classList.toggle("tp-off", !state);
    el.addEventListener("pointerdown", () => {
      state = !state;
      el.classList.toggle("tp-off", !state);
      buzz(); tap(state ? onKey : offKey);
    });
  }

  /* ---------------------------------------------------------------- DOM */

  const CHEVRON = '<svg viewBox="0 0 100 100" aria-hidden="true">' +
    '<path d="M50 6  l10 10 -10 -6 -10 6 z" transform="rotate(0 50 50)"/>' +
    '<path d="M50 6  l10 10 -10 -6 -10 6 z" transform="rotate(90 50 50)"/>' +
    '<path d="M50 6  l10 10 -10 -6 -10 6 z" transform="rotate(180 50 50)"/>' +
    '<path d="M50 6  l10 10 -10 -6 -10 6 z" transform="rotate(270 50 50)"/></svg>';

  function buildDOM(cfg) {
    const root = document.createElement("div");
    root.className = "tp-root";

    // d-pad: one hit element + four purely decorative conic wedges
    const pad = document.createElement("div");
    pad.className = "tp-pad";
    pad.setAttribute("role", "group");
    pad.setAttribute("aria-label", "direction pad");
    const wedges = {};
    for (const d of DIR4) {
      const w = document.createElement("div");
      w.className = "tp-wedge tp-w-" + d;
      pad.appendChild(w);
      wedges[d] = w;
    }
    const hub = document.createElement("div");
    hub.className = "tp-hub";
    hub.innerHTML = CHEVRON;
    pad.appendChild(hub);
    root.appendChild(pad);

    // action buttons
    const actions = document.createElement("div");
    actions.className = "tp-actions";
    for (const b of cfg.buttons) {
      const el = document.createElement("div");
      el.className = "tp-btn" + (b.accent ? " tp-accent" : "");
      el.setAttribute("role", "button");
      el.textContent = b.label;
      if (b.on !== undefined) bindToggle(el, b.on, b.off ?? b.on, b.initial);
      else bindHold(el, b.key);
      actions.appendChild(el);
    }
    root.appendChild(actions);

    // chips (small pills, top-right)
    if (cfg.chips.length) {
      const chips = document.createElement("div");
      chips.className = "tp-chips";
      for (const c of cfg.chips) {
        const el = document.createElement("div");
        el.className = "tp-chip";
        el.setAttribute("role", "button");
        el.textContent = c.label;
        if (c.on !== undefined) bindToggle(el, c.on, c.off ?? c.on, c.initial);
        else bindTap(el, c.key);
        chips.appendChild(el);
      }
      root.appendChild(chips);
    }

    // kill iOS double-tap zoom / callout / scroll on the controls
    root.addEventListener("touchstart", e => e.preventDefault(), { passive: false });
    root.addEventListener("contextmenu", e => e.preventDefault());

    document.body.appendChild(root);
    return { root, pad, wedges };
  }

  /* ---------------------------------------------------------------- CSS */

  const CSS = `
  .tp-root{position:fixed;inset:0;z-index:9999;pointer-events:none;
    font-family:system-ui,-apple-system,"Segoe UI",sans-serif;
    -webkit-user-select:none;user-select:none;-webkit-touch-callout:none;
    --tp-glass:rgba(18,18,34,.52);--tp-edge:rgba(255,255,255,.14);
    --tp-lit:rgba(255,255,255,.26);--tp-ink:rgba(235,235,250,.82);
    --tp-accent:#ffcf4d;}
  .tp-root *{box-sizing:border-box;touch-action:none;}
  .tp-pad,.tp-btn,.tp-chip{pointer-events:auto;cursor:pointer;
    background:var(--tp-glass);border:1px solid var(--tp-edge);
    -webkit-backdrop-filter:blur(14px) saturate(1.3);backdrop-filter:blur(14px) saturate(1.3);
    box-shadow:0 6px 24px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.09);}
  .tp-pad{position:fixed;border-radius:50%;overflow:hidden;
    left:max(16px,env(safe-area-inset-left));
    bottom:max(16px,env(safe-area-inset-bottom));
    width:clamp(132px,38vmin,168px);height:clamp(132px,38vmin,168px);}
  .tp-wedge{position:absolute;inset:0;border-radius:50%;opacity:0;
    transition:opacity .08s;pointer-events:none;}
  .tp-wedge.tp-active{opacity:1;}
  .tp-w-up   {background:conic-gradient(from -45deg,var(--tp-lit) 0 90deg,transparent 90deg);}
  .tp-w-right{background:conic-gradient(from  45deg,var(--tp-lit) 0 90deg,transparent 90deg);}
  .tp-w-down {background:conic-gradient(from 135deg,var(--tp-lit) 0 90deg,transparent 90deg);}
  .tp-w-left {background:conic-gradient(from 225deg,var(--tp-lit) 0 90deg,transparent 90deg);}
  .tp-hub{position:absolute;inset:30%;border-radius:50%;pointer-events:none;
    background:rgba(10,10,22,.55);border:1px solid var(--tp-edge);}
  .tp-hub svg{position:absolute;inset:-42%;width:184%;height:184%;fill:var(--tp-ink);opacity:.55;}
  .tp-actions{position:fixed;display:flex;gap:16px;align-items:flex-end;
    right:max(16px,env(safe-area-inset-right));
    bottom:max(16px,env(safe-area-inset-bottom));}
  .tp-btn{width:clamp(58px,17vmin,72px);height:clamp(58px,17vmin,72px);border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    font-size:clamp(17px,5vmin,22px);font-weight:600;color:var(--tp-ink);
    letter-spacing:.04em;transition:transform .06s,background .06s;}
  .tp-btn:first-child{margin-bottom:clamp(20px,6vmin,30px);}  /* stagger B below-left of A */
  .tp-btn.tp-accent{background:var(--tp-accent);color:#201a05;border-color:rgba(255,255,255,.35);
    text-shadow:none;}
  .tp-btn.tp-active{transform:scale(.9);background:var(--tp-lit);}
  .tp-btn.tp-accent.tp-active{background:#ffe08a;}
  .tp-btn.tp-off{opacity:.45;}
  .tp-chips{position:fixed;display:flex;flex-direction:column;gap:8px;
    top:max(12px,env(safe-area-inset-top));right:max(12px,env(safe-area-inset-right));}
  .tp-chip{padding:6px 12px;border-radius:999px;font-size:10px;font-weight:600;
    letter-spacing:.14em;color:var(--tp-ink);}
  .tp-chip.tp-off{opacity:.45;}
  @media (orientation:landscape) and (max-height:480px){
    .tp-pad{width:118px;height:118px;}
    .tp-btn{width:56px;height:56px;font-size:16px;}
  }`;

  /* -------------------------------------------------------------- lifecycle */

  function resolveShow(mode) {
    const q = new URLSearchParams(location.search).get("touchpad");
    if (q === "1") return true;
    if (q === "0") return false;
    if (mode === "always") return true;
    if (mode === "never") return false;
    return matchMedia("(pointer: coarse)").matches ||
           "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }

  function init(cfg = {}) {
    destroy();
    if (!resolveShow(cfg.show || "auto")) return null;

    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    const full = Object.assign({
      target: window, haptics: true, diagonals: false,
      keys: { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" },
      buttons: [], chips: [],
    }, cfg);

    S = Object.assign(full, buildDOM(full), {
      held: new Set(), padKeys: new Set(), styleEl: style,
    });
    bindPad();
    window.addEventListener("blur", releaseAll);
    document.body.classList.add("tp-on");
    return api;
  }

  function destroy() {
    if (!S) return;
    releaseAll();
    window.removeEventListener("blur", releaseAll);
    S.root.remove();
    S.styleEl.remove();
    document.body.classList.remove("tp-on");
    S = null;
  }

  const api = {
    init, destroy,
    show() { if (S) S.root.style.display = ""; },
    hide() { if (S) { releaseAll(); S.root.style.display = "none"; } },
  };
  return api;
})();

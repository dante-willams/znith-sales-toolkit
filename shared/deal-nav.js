// shared/deal-nav.js
// Injects a persistent deal nav bar when ?deal=uuid is present.
// Shows all five tools as chips with run-status dots — no forced ordering.
// Must load after dealStore.js.

const dealNav = (() => {
  const NAV_H = 40;

  const TOOLS = [
    {
      id:   'account-brief-v2',
      label: 'Account Brief',
      path:  '../account-brief-v2/',
      done:  d => !!d.research,
    },
    {
      id:   'qualify-iq',
      label: 'Qualify IQ',
      path:  '../qualify-iq/',
      done:  d => !!(d.qualification?.meddpicc),
    },
    {
      id:   'demo-brief',
      label: 'Demo Brief',
      path:  '../demo-brief/',
      done:  d => (d.meeting_preps?.length > 0),
    },
    {
      id:   'value-map',
      label: 'Value Map',
      path:  '../value-map/',
      done:  d => !!d.value_map,
    },
    {
      id:   'win-room',
      label: 'Win Room',
      path:  '../win-room/',
      done:  d => !!d.research,
    },
  ];

  function escHtml(s) {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function currentToolId() {
    const path = window.location.pathname;
    for (const t of TOOLS) {
      if (path.includes('/' + t.id + '/')) return t.id;
    }
    return null;
  }

  function inject() {
    const deal = dealStore.getFromUrl();
    if (!deal) return;

    const dashUrl    = dealStore.urlFor('../dashboard.html', deal.id);
    const stageId    = deal.context.stage || 'discovery';
    const stageLbl   = dealStore.stageLabel(stageId);
    const activeId   = currentToolId();

    const css = document.createElement('style');
    css.textContent = `
      #deal-nav {
        position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
        height: ${NAV_H}px;
        background: rgba(5,7,15,0.97);
        backdrop-filter: blur(16px);
        border-bottom: 1px solid rgba(255,255,255,0.07);
        display: flex; align-items: center; gap: 8px;
        padding: 0 16px;
        font-family: 'Barlow', 'IBM Plex Sans', sans-serif;
      }
      #deal-nav a { text-decoration: none; }
      .dn-logo { display: flex; align-items: center; flex-shrink: 0; opacity: 0.7; transition: opacity 0.15s; }
      .dn-logo:hover { opacity: 1; }
      .dn-logo svg { width: 16px; height: 16px; }
      .dn-divider { width: 1px; height: 14px; background: rgba(255,255,255,0.1); flex-shrink: 0; margin: 0 2px; }
      .dn-company {
        font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.8);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        max-width: 160px; flex-shrink: 0;
      }
      .dn-stage {
        flex-shrink: 0; padding: 1px 6px;
        font-size: 9px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
        border-radius: 2px;
      }
      .dn-stage.stage-discovery    { background: rgba(99,179,237,0.15);  color: #63B3ED; }
      .dn-stage.stage-demo         { background: rgba(184,134,11,0.15);   color: #E6B84A; }
      .dn-stage.stage-proposal     { background: rgba(167,139,250,0.15); color: #A78BFA; }
      .dn-stage.stage-negotiation  { background: rgba(251,146,60,0.15);  color: #FB923C; }
      .dn-stage.stage-closed_won   { background: rgba(52,211,153,0.15);  color: #34D399; }
      .dn-stage.stage-closed_lost  { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.3); }
      .dn-tools {
        display: flex; align-items: center; gap: 2px;
        margin: 0 auto;
      }
      .dn-chip {
        display: flex; align-items: center; gap: 5px;
        padding: 3px 9px; border-radius: 2px;
        font-size: 10px; font-weight: 600; letter-spacing: 0.05em;
        color: rgba(255,255,255,0.35); border: 1px solid transparent;
        transition: all 0.15s ease; white-space: nowrap;
        text-decoration: none;
      }
      .dn-chip:hover {
        color: rgba(255,255,255,0.75);
        border-color: rgba(255,255,255,0.1);
        background: rgba(255,255,255,0.04);
      }
      .dn-chip.dn-active {
        color: #E6B84A;
        background: rgba(184,134,11,0.12);
        border-color: rgba(184,134,11,0.25);
        cursor: default;
        pointer-events: none;
      }
      .dn-dot {
        width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0;
        background: rgba(255,255,255,0.12);
        transition: background 0.15s;
      }
      .dn-dot.done   { background: #16A34A; box-shadow: 0 0 4px rgba(22,163,74,0.5); }
      .dn-dot.active { background: #E6B84A; box-shadow: 0 0 4px rgba(230,184,74,0.5); }
      .dn-sep { width: 1px; height: 10px; background: rgba(255,255,255,0.06); margin: 0 1px; }
      .dn-dash-btn {
        display: flex; align-items: center; gap: 4px; flex-shrink: 0;
        font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.3);
        border: 1px solid rgba(255,255,255,0.08); padding: 3px 9px; border-radius: 2px;
        transition: all 0.15s; text-decoration: none;
        font-family: 'Barlow', 'IBM Plex Sans', sans-serif;
      }
      .dn-dash-btn:hover { color: rgba(255,255,255,0.7); border-color: rgba(255,255,255,0.2); }
    `;
    document.head.appendChild(css);

    const chips = TOOLS.map((t, i) => {
      const isDone   = t.done(deal);
      const isActive = t.id === activeId;
      const url      = dealStore.urlFor(t.path, deal.id);
      const dotCls   = isActive ? 'active' : isDone ? 'done' : '';
      const chipCls  = isActive ? 'dn-active' : '';
      const sep      = i < TOOLS.length - 1 ? '<div class="dn-sep"></div>' : '';

      return `<a href="${url}" class="dn-chip ${chipCls}" title="${escHtml(t.label)}">
        <div class="dn-dot ${dotCls}"></div>
        ${escHtml(t.label)}
      </a>${sep}`;
    }).join('');

    const nav = document.createElement('div');
    nav.id = 'deal-nav';
    nav.innerHTML = `
      <a href="${dashUrl}" class="dn-logo" title="Back to Dashboard">
        <svg viewBox="0 0 1039 1080" xmlns="http://www.w3.org/2000/svg" fill="#4ade80">
          <path d="M760.081,809.993c-54.616,21.347-116.877,31.991-186.827,31.991-92.119,0-165.068-25.169-218.802-75.507-53.749-50.308-80.623-119.846-80.623-208.584v-51.161c0-95.53,20.038-169.332,60.144-221.375,40.061-52.043,95.971-78.065,167.626-78.065,68.23,0,118.567,17.083,150.999,51.191,32.387,34.137,48.618,86.18,48.618,156.1v51.191h273.844v-51.191c0-134.754-40.106-237.576-120.287-308.378C774.562,35.431,659.391,0,509.274,0,169.743,0,0,180.005,0,539.985,0,715.727,49.015,849.657,147.147,941.777c98.088,92.149,235.856,138.223,413.317,138.223,97.25,0,187.664-13.702,271.286-40.958,83.563-27.286,152.675-62.276,207.291-104.939l-94.692-217.523c-68.259,40.958-129.682,72.096-184.268,93.413Z"/>
        </svg>
      </a>
      <div class="dn-divider"></div>
      <div class="dn-company">${escHtml(deal.context.account_name)}</div>
      <div class="dn-stage stage-${stageId}">${stageLbl}</div>
      <div class="dn-tools">${chips}</div>
      <a href="${dashUrl}" class="dn-dash-btn">
        <svg width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Dashboard
      </a>
    `;
    document.body.prepend(nav);

    // Push sticky/fixed headers down so they clear the nav bar
    document.querySelectorAll('header, .app-header, .topbar').forEach(el => {
      const pos = getComputedStyle(el).position;
      if (pos === 'sticky' || pos === 'fixed') {
        const curTop = parseInt(getComputedStyle(el).top, 10) || 0;
        el.style.top = (curTop + NAV_H) + 'px';
      }
    });
    document.body.style.paddingTop =
      (parseInt(document.body.style.paddingTop, 10) || 0) + NAV_H + 'px';
  }

  // No-op — kept so existing tool calls don't throw errors.
  // The tool switcher replaces the showNext pattern; per-tool calls are no longer needed.
  function showNext(_label, _url) {}

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }

  return { showNext };
})();

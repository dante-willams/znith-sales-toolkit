// shared/deal-nav.js
// Injects a persistent deal nav bar when ?deal=uuid is present.
// Must load after dealStore.js.
//
// Each tool can call dealNav.showNext(label, url) after generation
// to surface a stage-aware "Next step" button in the nav bar.

const dealNav = (() => {
  const NAV_H = 40; // px
  let nextBtn = null;

  function escHtml(s) {
    return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function inject() {
    const deal = dealStore.getFromUrl();
    if (!deal) return;

    const dashUrl = dealStore.urlFor('../dashboard.html', deal.id);
    const stageId  = deal.context.stage || 'discovery';
    const stageLabel = dealStore.stageLabel(stageId);

    const css = document.createElement('style');
    css.textContent = `
      #deal-nav {
        position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
        height: ${NAV_H}px;
        background: rgba(5,7,15,0.97);
        backdrop-filter: blur(16px);
        border-bottom: 1px solid rgba(255,255,255,0.07);
        display: flex; align-items: center; gap: 10px;
        padding: 0 18px;
        font-family: 'Barlow', 'IBM Plex Sans', sans-serif;
      }
      #deal-nav a { text-decoration: none; }
      .dn-logo { display: flex; align-items: center; flex-shrink: 0; opacity: 0.8; transition: opacity 0.15s; }
      .dn-logo:hover { opacity: 1; }
      .dn-logo svg { width: 18px; height: 18px; }
      .dn-divider { width: 1px; height: 14px; background: rgba(255,255,255,0.1); flex-shrink: 0; }
      .dn-company {
        font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.85);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;
      }
      .dn-stage {
        flex-shrink: 0; padding: 1px 7px;
        font-size: 9px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
        border-radius: 2px;
      }
      .dn-stage.stage-discovery    { background: rgba(99,179,237,0.15); color: #63B3ED; }
      .dn-stage.stage-demo         { background: rgba(184,134,11,0.15);  color: #E6B84A; }
      .dn-stage.stage-proposal     { background: rgba(167,139,250,0.15); color: #A78BFA; }
      .dn-stage.stage-negotiation  { background: rgba(251,146,60,0.15);  color: #FB923C; }
      .dn-stage.stage-closed_won   { background: rgba(52,211,153,0.15);  color: #34D399; }
      .dn-stage.stage-closed_lost  { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.3); }
      .dn-spacer { flex: 1; }
      .dn-tool {
        font-size: 9px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
        color: rgba(255,255,255,0.2);
      }
      .dn-btn {
        display: flex; align-items: center; gap: 5px;
        font-size: 11px; font-weight: 600;
        background: transparent; border: 1px solid rgba(255,255,255,0.1);
        padding: 4px 10px; border-radius: 2px; cursor: pointer;
        transition: all 0.15s ease; text-decoration: none; flex-shrink: 0;
        color: rgba(255,255,255,0.4);
        font-family: 'Barlow', 'IBM Plex Sans', sans-serif;
      }
      .dn-btn:hover { border-color: rgba(255,255,255,0.25); color: rgba(255,255,255,0.85); }
      .dn-btn.dn-next {
        background: rgba(184,134,11,0.15); border-color: rgba(184,134,11,0.3);
        color: #E6B84A; display: none;
      }
      .dn-btn.dn-next:hover { background: rgba(184,134,11,0.25); }
      .dn-btn.dn-next.visible { display: flex; }
    `;
    document.head.appendChild(css);

    const toolName = (document.querySelector('title')?.textContent || '').replace('Conga','').replace('Znith','').trim();

    const nav = document.createElement('div');
    nav.id = 'deal-nav';
    nav.innerHTML = `
      <a href="${dashUrl}" class="dn-logo" title="Dashboard">
        <svg viewBox="0 0 1039 1080" xmlns="http://www.w3.org/2000/svg" fill="#4ade80">
          <path d="M760.081,809.993c-54.616,21.347-116.877,31.991-186.827,31.991-92.119,0-165.068-25.169-218.802-75.507-53.749-50.308-80.623-119.846-80.623-208.584v-51.161c0-95.53,20.038-169.332,60.144-221.375,40.061-52.043,95.971-78.065,167.626-78.065,68.23,0,118.567,17.083,150.999,51.191,32.387,34.137,48.618,86.18,48.618,156.1v51.191h273.844v-51.191c0-134.754-40.106-237.576-120.287-308.378C774.562,35.431,659.391,0,509.274,0,169.743,0,0,180.005,0,539.985,0,715.727,49.015,849.657,147.147,941.777c98.088,92.149,235.856,138.223,413.317,138.223,97.25,0,187.664-13.702,271.286-40.958,83.563-27.286,152.675-62.276,207.291-104.939l-94.692-217.523c-68.259,40.958-129.682,72.096-184.268,93.413Z"/>
        </svg>
      </a>
      <div class="dn-divider"></div>
      <div class="dn-company">${escHtml(deal.context.account_name)}</div>
      <div class="dn-stage stage-${stageId}">${stageLabel}</div>
      <div class="dn-spacer"></div>
      ${toolName ? `<div class="dn-tool">${escHtml(toolName)}</div>` : ''}
      <a href="${dashUrl}" class="dn-btn">
        <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Dashboard
      </a>
      <a href="#" class="dn-btn dn-next" id="dealNavNext">
        <span id="dealNavNextLabel">Next</span>
        <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </a>
    `;
    document.body.prepend(nav);
    nextBtn = nav.querySelector('#dealNavNext');

    // Push sticky headers down so they clear the nav bar
    document.querySelectorAll('header, .app-header, .topbar').forEach(el => {
      const pos = getComputedStyle(el).position;
      if (pos === 'sticky' || pos === 'fixed') {
        const curTop = parseInt(getComputedStyle(el).top, 10) || 0;
        el.style.top = (curTop + NAV_H) + 'px';
      }
    });
    document.body.style.paddingTop = NAV_H + 'px';
  }

  // Call after generation to show a "Next: X →" button in the nav bar.
  function showNext(label, url) {
    if (!nextBtn) return;
    nextBtn.href = url;
    nextBtn.querySelector('#dealNavNextLabel').textContent = label;
    nextBtn.classList.add('visible');
  }

  // Auto-inject on DOMContentLoaded (or immediately if DOM is ready)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }

  return { showNext };
})();

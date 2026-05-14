// value-map/ppt-export.js
// Browser-side Conga Value Map PPT generator
// Requires PptxGenJS loaded as global (CDN script tag)

(function () {
  'use strict';

  // ─── Conga Logo SVGs (inline, encoded to base64 data URIs at load time) ──────
  // Both SVGs are pure ASCII — btoa() is safe without escape wrappers.

  var _WORDMARK_SVG = '<?xml version="1.0" encoding="UTF-8"?>' +
    '<svg id="a" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" width="4069.194" height="1080" viewBox="0 0 4069.194 1080">' +
    '<path d="M568.721,606.067c-40.866,15.972-87.452,23.937-139.791,23.937-68.927,0-123.51-18.832-163.716-56.497-40.217-37.643-60.325-89.674-60.325-156.071v-38.281c0-71.479,14.993-126.7,45.002-165.641,29.975-38.941,71.809-58.411,125.424-58.411,51.052,0,88.717,12.782,112.983,38.303,24.234,25.542,36.378,64.483,36.378,116.8v38.303h204.901v-38.303c0-100.828-30.009-177.763-90.004-230.74C579.557,26.511,493.381,0,381.058,0,127.008,0,0,134.687,0,404.037c0,131.497,36.675,231.708,110.101,300.636,73.393,68.949,176.476,103.424,309.26,103.424,72.766,0,140.418-10.252,202.987-30.646,62.525-20.417,114.237-46.597,155.103-78.519l-70.852-162.759c-51.074,30.646-97.033,53.945-137.876,69.895Z" fill="#fff"/>' +
    '<path d="M1200.65,0c-135.336,0-233.952,33.837-295.862,101.488-61.931,67.673-92.875,168.501-92.875,302.549,0,269.373,129.56,404.059,388.736,404.059,268.086,0,402.134-134.686,402.134-404.059,0-136.578-32.89-238.066-98.628-304.464C1438.397,33.199,1337.24,0,1200.65,0ZM1388.314,423.2c0,74.053-13.113,130.858-39.26,170.415-26.181,39.579-75.637,59.357-148.404,59.357-63.856,0-109.815-19.14-137.877-57.443-28.095-38.303-42.131-95.746-42.131-172.329v-40.217c0-151.913,59.995-227.88,180.007-227.88,66.364,0,114.237,18.524,143.619,55.529,29.348,37.049,44.045,94.492,44.045,172.351v40.217Z" fill="#fff"/>' +
    '<path d="M4021.321,652.972c-15.323,0-27.467-4.444-36.389-13.398-8.943-8.91-13.409-21.692-13.409-38.303V248.935c0-85.516-28.722-148.415-86.165-188.632-57.454-40.195-135.336-60.303-233.622-60.303-93.205,0-172.34,18.525-237.451,55.529-65.11,37.049-97.66,93.832-97.66,170.415v24.905h199.147v-15.312c0-31.901,11.793-54.253,35.432-67.035,23.606-12.738,57.113-19.141,100.531-19.141s74.977,8.932,94.789,26.797c19.779,17.908,29.679,46.619,29.679,86.176v57.658c-88.412,1.11-165.669,6.789-231.697,17.033-74.053,11.484-136.293,36.389-186.706,74.669-50.447,38.303-75.638,95.13-75.638,170.437,0,72.755,22.65,128.636,67.981,167.555,45.299,38.963,104.986,58.411,179.039,58.411,104.667,0,190.205-34.475,256.602-103.424h9.57c12.749,33.221,32.549,58.741,59.368,76.605,26.808,17.865,58.07,26.818,93.832,26.818,25.52,0,45.948-1.628,61.271-4.796,15.323-3.212,35.101-10.538,59.368-22.022v-128.307h-47.873ZM3722.589,608.927c-35.751,30.646-79.168,45.959-130.209,45.959-70.225,0-105.327-27.434-105.327-82.325,0-38.303,16.577-66.705,49.787-85.23,33.188-18.48,71.479-29.678,114.897-33.506,35.178-3.104,76.673-4.949,124.467-5.536v40.011c0,49.787-17.887,90.004-53.615,120.628Z" fill="#fff"/>' +
    '<path d="M2125.547,0c-51.074,0-97.032,10.516-137.865,31.593-40.877,21.054-74.053,52.031-99.585,92.864h-9.57l-13.409-99.574h-170.426v765.966h202.987v-417.436c0-62.547,14.663-112.664,44.045-150.329,29.348-37.643,67.651-56.497,114.886-56.497,43.384,0,76.275,11.814,98.627,35.42,22.319,23.651,33.507,58.411,33.507,104.37v484.471h199.148V271.903c0-91.918-22.672-160.185-67.981-204.89-45.321-44.661-110.101-67.013-194.363-67.013Z" fill="#fff"/>' +
    '<path d="M3204.6,688.415c-40.206-38.941-92.236-58.411-156.06-58.411h-289.151c-19.152,0-35.124-3.828-47.873-11.484-12.782-7.679-19.151-19.779-19.151-36.389s7.007-29.349,21.065-38.303c14.036-8.91,30.635-13.398,49.787-13.398h114.897c90.631,0,161.153-20.108,211.6-60.325,50.414-40.217,86.461-97.33,108.187-171.383,34.475-118.736,65.11-209.994,91.918-273.839h-191.492l-18.295,63.207h-9.434c-17.968-23.837-44.139-43.95-78.543-60.325-38.963-18.502-87.133-27.765-144.576-27.765-95.746,0-176.509,21.715-242.246,65.099-65.759,43.407-98.617,109.804-98.617,199.148,0,45.959,10.538,86.836,31.604,122.564,21.055,35.751,50.744,64.483,89.036,86.175-43.407,12.76-78.508,32.253-105.316,58.389-26.808,26.18-40.217,58.411-40.217,96.714,0,108.528,75.307,162.759,225.966,162.759h270c28.062,0,49.787,6.71,65.11,20.108,15.312,13.398,22.979,30.317,22.979,50.755s-7.997,37.005-23.937,49.787c-15.983,12.738-39.92,19.14-71.81,19.14h-141.705v149.361h149.361c82.974,0,151.572-21.715,205.858-65.1,54.242-43.406,81.379-101.488,81.379-174.265,0-62.525-20.108-113.28-60.325-152.221ZM2750.765,165.641c24.904-23.606,60.325-35.442,106.284-35.442s81.688,12.166,107.23,36.389c25.532,24.266,38.303,56.827,38.303,97.66,0,90.664-48.533,135.962-145.533,135.962-47.246,0-82.996-10.538-107.241-31.592-24.255-21.077-36.377-55.837-36.377-104.37,0-42.131,12.441-74.977,37.334-98.606Z" fill="#fff"/>' +
    '</svg>';

  var _SYMBOL_SVG = '<?xml version="1.0" encoding="UTF-8"?>' +
    '<svg id="a" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" width="1039.041" height="1080" viewBox="0 0 1039.041 1080">' +
    '<path d="M760.081,809.993c-54.616,21.347-116.877,31.991-186.827,31.991-92.119,0-165.068-25.169-218.802-75.507-53.749-50.308-80.623-119.846-80.623-208.584v-51.161c0-95.53,20.038-169.332,60.144-221.375,40.061-52.043,95.971-78.065,167.626-78.065,68.23,0,118.567,17.083,150.999,51.191,32.387,34.137,48.618,86.18,48.618,156.1v51.191h273.844v-51.191c0-134.754-40.106-237.576-120.287-308.378C774.562,35.431,659.391,0,509.274,0,169.743,0,0,180.005,0,539.985,0,715.727,49.015,849.657,147.147,941.777c98.088,92.149,235.856,138.223,413.317,138.223,97.25,0,187.664-13.702,271.286-40.958,83.563-27.286,152.675-62.276,207.291-104.939l-94.692-217.523c-68.259,40.958-129.682,72.096-184.268,93.413Z" fill="#afa3f5"/>' +
    '</svg>';

  // Encode to base64 data URIs (ASCII-safe SVGs — btoa works without escape)
  var CONGA_WORDMARK_WHITE = 'image/svg+xml;base64,' + btoa(_WORDMARK_SVG);
  var CONGA_C_SYMBOL = 'image/svg+xml;base64,' + btoa(_SYMBOL_SVG);

  // ─── Brand color tokens ────────────────────────────────────────────────────
  // NEVER use "#" prefix in pptxgenjs color strings.
  var C = {
    navy:         '0D004D',
    navyDark:     '1A0A6B',
    purple:       '846BF8',
    lavender:     'ADA3F0',
    teal:         '21CCA1',
    gold:         'FFBF3D',
    white:        'FFFFFF',
    bgLight:      'F4F6FB',
    cardWhite:    'FFFFFF',
    textDark:     '0D004D',
    textBody:     '1A1040',
    textMuted:    'ADA3F0',
    border:       'E2E8F0',
    cardBorder:   'D8DDF0',
    currentState: '1A0A6B',
    targetState:  '0D5C47',
    sepLine:      'C8C8E0',
    darkTeal:     '0D5C47',
    purple200:    '2A1A6A',
    tealLight:    '7AF0CE',
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function makeShadow() {
    return { type: 'outer', blur: 4, offset: 2, angle: 135, color: '000000', opacity: 0.06 };
  }

  /**
   * Split text into up to `max` bullet strings.
   * Splits on sentence boundaries (. ! ?) or semicolons.
   */
  function toBullets(text, max) {
    max = max || 3;
    if (!text) return ['No information available'];
    var sentences = text.split(/(?<=[.!?])\s+|;\s*/).filter(function (s) {
      return s.trim().length > 10;
    });
    if (sentences.length === 0) {
      // Fallback: return the raw text as a single bullet
      return [text.trim()];
    }
    return sentences.slice(0, max).map(function (s) {
      return s.trim().replace(/\.$/, '');
    });
  }

  /**
   * Section badge — filled rectangle with centered text label.
   */
  function addBadge(slide, pres, label, x, y, w, h, fillColor, textColor) {
    slide.addShape(pres.ShapeType.rect, {
      x: x, y: y, w: w, h: h,
      fill: { color: fillColor },
      line: { color: fillColor },
    });
    slide.addText(label, {
      x: x, y: y, w: w, h: h,
      fontSize: 8, bold: true, color: textColor,
      align: 'center', valign: 'middle',
      fontFace: 'Calibri', margin: 0,
    });
  }

  /**
   * Footer bar shared by all slides — dark navy strip + "conga.com" centered.
   */
  function addFooterBase(slide, pres) {
    slide.addShape(pres.ShapeType.rect, {
      x: 0, y: 5.35, w: 10, h: 0.275,
      fill: { color: C.navyDark },
      line: { color: C.navyDark },
    });
    slide.addText('conga.com', {
      x: 0, y: 5.35, w: 10, h: 0.275,
      fontSize: 8, color: C.lavender, align: 'center', valign: 'middle',
      fontFace: 'Calibri', margin: 0,
    });
  }

  /**
   * Slide 1 footer — bar + wordmark at left (no "conga.com" text).
   */
  function addFooterSlide1(slide, pres) {
    slide.addShape(pres.ShapeType.rect, {
      x: 0, y: 5.35, w: 10, h: 0.275,
      fill: { color: C.navyDark },
      line: { color: C.navyDark },
    });
    slide.addImage({
      data: CONGA_WORDMARK_WHITE,
      x: 0.4, y: 5.4075, w: 1.1, h: 0.16,
    });
  }

  /**
   * Slide 2 footer — bar + "conga.com" + wordmark at bottom-right.
   */
  function addFooterSlide2(slide, pres) {
    addFooterBase(slide, pres);
    slide.addImage({
      data: CONGA_WORDMARK_WHITE,
      x: 8.4, y: 5.4075, w: 1.1, h: 0.16,
    });
  }

  /**
   * Deep-dive slides (3-5) footer — bar + "conga.com" + wordmark at bottom-right.
   */
  function addFooterDeepDive(slide, pres) {
    addFooterBase(slide, pres);
    slide.addImage({
      data: CONGA_WORDMARK_WHITE,
      x: 8.5, y: 5.3625, w: 1.2, h: 0.32,
    });
  }

  // ─── Slide 1 — Cover ────────────────────────────────────────────────────────
  function addSlide1(pres, opts) {
    var companyName = opts.companyName;
    var products    = opts.products;
    var repName     = opts.repName;
    var dateStr     = opts.dateStr;

    var slide = pres.addSlide();
    slide.background = { color: C.navy };

    // "C" symbol watermark — bottom-right, large, semi-transparent
    slide.addImage({
      data: CONGA_C_SYMBOL,
      x: 6.2, y: 1.8, w: 3.8, h: 3.8,
      transparency: 70,
    });

    // Customer logo placeholder
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.4, y: 0.5, w: 2.0, h: 0.7,
      fill: { color: C.purple200 },
      line: { color: C.lavender, width: 1 },
      rectRadius: 0.05,
    });
    slide.addText('Customer Logo', {
      x: 0.4, y: 0.5, w: 2.0, h: 0.7,
      fontSize: 10, color: C.lavender,
      align: 'center', valign: 'middle',
      fontFace: 'Calibri', margin: 0,
    });

    // Company name
    slide.addText(companyName, {
      x: 0.4, y: 1.5, w: 9.2, h: 1.0,
      fontSize: 40, bold: true, color: C.white,
      fontFace: 'Calibri', valign: 'middle',
    });

    // Subtitle
    slide.addText('Strategic Value Map', {
      x: 0.4, y: 2.55, w: 7, h: 0.45,
      fontSize: 20, color: C.lavender,
      fontFace: 'Calibri',
    });

    // Products line
    slide.addText(products, {
      x: 0.4, y: 3.05, w: 7, h: 0.35,
      fontSize: 13, color: C.teal,
      fontFace: 'Calibri',
    });

    // Rep name + date — bottom right
    slide.addText([
      { text: repName, options: { breakLine: true } },
      { text: dateStr, options: {} },
    ], {
      x: 6.5, y: 4.55, w: 3.1, h: 0.6,
      fontSize: 10, color: C.lavender,
      align: 'right', valign: 'top',
      fontFace: 'Calibri',
    });

    addFooterSlide1(slide, pres);
  }

  // ─── Slide 2 — Their World ──────────────────────────────────────────────────
  function addSlide2(pres, opts) {
    var initiatives = opts.initiatives;
    var getStatus   = opts.getStatus;

    var slide = pres.addSlide();
    slide.background = { color: C.bgLight };

    // Section badge
    addBadge(slide, pres, 'THEIR WORLD', 0.4, 0.25, 1.5, 0.3, C.navy, C.white);

    // Slide title
    slide.addText('Strategic Initiatives & Objectives', {
      x: 0.4, y: 0.65, w: 9.2, h: 0.5,
      fontSize: 22, bold: true, color: C.textDark,
      fontFace: 'Calibri',
    });

    var cardXPositions = [0.4, 3.57, 6.73];
    var cardY = 1.25;
    var cardW = 2.88;
    var cardH = 3.9;

    initiatives.forEach(function (initiative, idx) {
      var cx = cardXPositions[idx];
      if (cx === undefined) return; // only 3 cards max

      var statusLabel = getStatus(idx);
      var statusFill  = statusLabel === 'ACTIVE' ? C.teal : C.purple;
      var statusTextColor = statusLabel === 'ACTIVE' ? C.navy : C.white;

      var numStr = ('0' + (idx + 1)).slice(-2); // '01', '02', '03'
      var challengeBullets = toBullets(initiative.challenge, 3);
      // Pull quote from PBO (italic, in purple at card bottom)
      var pullQuote = initiative.pbo ? '“' + initiative.pbo + '”' : '';

      // Card background
      slide.addShape(pres.ShapeType.rect, {
        x: cx, y: cardY, w: cardW, h: cardH,
        fill: { color: C.cardWhite },
        line: { color: C.cardBorder, width: 0.75 },
      });

      // 1. Number chip
      slide.addShape(pres.ShapeType.rect, {
        x: cx, y: cardY, w: 0.52, h: 0.35,
        fill: { color: C.navy },
        line: { color: C.navy },
      });
      slide.addText(numStr, {
        x: cx, y: cardY, w: 0.52, h: 0.35,
        fontSize: 14, bold: true, color: C.white,
        align: 'center', valign: 'middle',
        fontFace: 'Calibri', margin: 0,
      });

      // 2. Initiative title
      slide.addText(initiative.title, {
        x: cx + 0.08, y: cardY + 0.37, w: cardW - 0.16, h: 0.55,
        fontSize: 13, bold: true, color: C.navy,
        fontFace: 'Calibri', valign: 'top',
      });

      // 3. Stakeholder
      slide.addText([
        { text: 'Stakeholder:  ', options: { bold: true, color: C.purple } },
        { text: initiative.stakeholder || 'Key Stakeholder', options: { color: C.textBody } },
      ], {
        x: cx + 0.1, y: cardY + 0.94, w: cardW - 0.2, h: 0.28,
        fontSize: 9, fontFace: 'Calibri', valign: 'middle',
      });

      // 4. Status badge
      slide.addShape(pres.ShapeType.rect, {
        x: cx + 0.1, y: cardY + 1.24, w: 1.2, h: 0.27,
        fill: { color: statusFill },
        line: { color: statusFill },
      });
      slide.addText(statusLabel, {
        x: cx + 0.1, y: cardY + 1.24, w: 1.2, h: 0.27,
        fontSize: 8, bold: true,
        color: statusTextColor,
        align: 'center', valign: 'middle',
        fontFace: 'Calibri', margin: 0,
      });

      // 5. Thin divider line
      slide.addShape(pres.ShapeType.line, {
        x: cx + 0.1, y: cardY + 1.57, w: cardW - 0.2, h: 0,
        line: { color: C.border, width: 1 },
      });

      // 6. Bulleted challenge facts
      slide.addText(
        challengeBullets.map(function (t) {
          return { text: t, options: { bullet: true, paraSpaceBefore: 2, fontSize: 9.5, color: C.textBody } };
        }),
        {
          x: cx + 0.1, y: cardY + 1.63, w: cardW - 0.2, h: 1.55,
          fontFace: 'Calibri', valign: 'top',
        }
      );

      // 7. Pull quote (PBO) at bottom of card
      var quoteY = cardY + 3.14;
      if (pullQuote) {
        slide.addText(pullQuote, {
          x: cx + 0.1, y: quoteY, w: cardW - 0.2, h: 0.52,
          fontSize: 9, italic: true, color: C.purple,
          fontFace: 'Calibri', valign: 'top',
        });
      }
    });

    addFooterSlide2(slide, pres);
  }

  // ─── Slides 3-5 — Initiative Deep-Dives ────────────────────────────────────
  function addInitiativeSlide(pres, initiative, index) {
    var numStr = ('0' + (index + 1)).slice(-2); // '01', '02', '03'

    var challengeBullets  = toBullets(initiative.challenge, 3);
    var capabilityBullets = toBullets(initiative.capability, 3);

    var slide = pres.addSlide();
    slide.background = { color: C.bgLight };

    // Section badge
    addBadge(slide, pres, 'INITIATIVE ' + numStr, 0.4, 0.15, 1.6, 0.3, C.navy, C.white);

    // Initiative title
    slide.addText(initiative.title, {
      x: 2.15, y: 0.12, w: 7.45, h: 0.38,
      fontSize: 18, bold: true, color: C.textDark,
      fontFace: 'Calibri', valign: 'middle',
    });

    // ── LEFT COLUMN — CHALLENGES ───────────────────────────────────────────
    var lx = 0.4, ly = 0.65, lw = 4.4, lh = 3.7;

    slide.addShape(pres.ShapeType.rect, {
      x: lx, y: ly, w: lw, h: lh,
      fill: { color: C.cardWhite },
      line: { color: C.cardBorder, width: 0.75 },
    });

    slide.addText('CHALLENGES', {
      x: lx + 0.15, y: ly + 0.12, w: lw - 0.3, h: 0.25,
      fontSize: 8, bold: true, color: C.navy,
      fontFace: 'Calibri', charSpacing: 2,
    });

    slide.addShape(pres.ShapeType.line, {
      x: lx + 0.15, y: ly + 0.38, w: lw - 0.3, h: 0,
      line: { color: C.purple, width: 1.5 },
    });

    slide.addText(
      challengeBullets.map(function (t) {
        return { text: t, options: { bullet: true, paraSpaceBefore: 4, fontSize: 10.5, color: C.textBody } };
      }),
      { x: lx + 0.15, y: ly + 0.48, w: lw - 0.3, h: 1.75, fontFace: 'Calibri', valign: 'top' }
    );

    // Metrics row — current state | arrow | target state
    var metricsY = ly + 2.35;
    var metricW  = 1.7;
    var metricH  = 0.82;
    var mxLeft   = lx + 0.15;
    var mxRight  = lx + 0.15 + metricW + 0.45;

    // Current State card
    slide.addShape(pres.ShapeType.rect, {
      x: mxLeft, y: metricsY, w: metricW, h: metricH,
      fill: { color: C.navyDark },
      line: { color: '2A1A8A' },
    });
    slide.addText([
      { text: 'CURRENT STATE', options: { breakLine: true, bold: true, fontSize: 7, color: C.lavender, charSpacing: 1 } },
      { text: initiative.currentState || 'Current baseline', options: { bold: true, fontSize: 11, color: C.white } },
    ], {
      x: mxLeft, y: metricsY, w: metricW, h: metricH,
      fontFace: 'Calibri', align: 'center', valign: 'middle',
    });

    // Arrow
    slide.addText('→', {
      x: mxLeft + metricW + 0.05, y: metricsY, w: 0.38, h: metricH,
      fontSize: 18, bold: true, color: C.purple,
      align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0,
    });

    // Target State card
    slide.addShape(pres.ShapeType.rect, {
      x: mxRight, y: metricsY, w: metricW, h: metricH,
      fill: { color: C.darkTeal },
      line: { color: '0F7A5A' },
    });
    slide.addText([
      { text: 'TARGET STATE', options: { breakLine: true, bold: true, fontSize: 7, color: C.tealLight, charSpacing: 1 } },
      { text: initiative.targetState || 'Improved outcome', options: { bold: true, fontSize: 11, color: C.white } },
    ], {
      x: mxRight, y: metricsY, w: metricW, h: metricH,
      fontFace: 'Calibri', align: 'center', valign: 'middle',
    });

    // ── RIGHT COLUMN — Capability ──────────────────────────────────────────
    var rx = 5.1, ry = 0.65, rw = 4.5, rh = 3.7;

    slide.addShape(pres.ShapeType.rect, {
      x: rx, y: ry, w: rw, h: rh,
      fill: { color: C.cardWhite },
      line: { color: C.cardBorder, width: 0.75 },
    });

    slide.addText(initiative.capabilityLabel.toUpperCase(), {
      x: rx + 0.15, y: ry + 0.12, w: rw - 0.3, h: 0.25,
      fontSize: 8, bold: true, color: C.navy,
      fontFace: 'Calibri', charSpacing: 2,
    });

    slide.addShape(pres.ShapeType.line, {
      x: rx + 0.15, y: ry + 0.38, w: rw - 0.3, h: 0,
      line: { color: C.purple, width: 1.5 },
    });

    slide.addText(
      capabilityBullets.map(function (t) {
        return { text: t, options: { bullet: true, paraSpaceBefore: 4, fontSize: 10.5, color: C.textBody } };
      }),
      { x: rx + 0.15, y: ry + 0.5, w: rw - 0.3, h: 2.85, fontFace: 'Calibri', valign: 'top' }
    );

    // ── Bottom section — Value + Proof Point ──────────────────────────────
    var bannerY          = 4.55;
    var bannerH          = 0.75;
    var sectionContentY  = 4.62;

    // Horizontal separator line
    slide.addShape(pres.ShapeType.line, {
      x: 0, y: bannerY, w: 10, h: 0,
      line: { color: C.sepLine, width: 1 },
    });

    // Vertical divider
    slide.addShape(pres.ShapeType.line, {
      x: 5.0, y: sectionContentY, w: 0, h: bannerH - 0.15,
      line: { color: C.sepLine, width: 1 },
    });

    // Left side — Value
    slide.addText([
      { text: 'VALUE  ', options: { bold: true, color: C.teal, fontSize: 10, charSpacing: 1 } },
      { text: initiative.value || '', options: { color: C.textDark, fontSize: 12 } },
    ], {
      x: 0.25, y: sectionContentY, w: 4.5, h: bannerH - 0.15,
      fontFace: 'Calibri', valign: 'middle',
    });

    // Right side — Proof Point
    slide.addText([
      { text: 'PROOF POINT  ', options: { bold: true, color: C.purple, fontSize: 10, charSpacing: 1 } },
      { text: initiative.proof || '', options: { color: C.textBody, fontSize: 12 } },
    ], {
      x: 5.2, y: sectionContentY, w: 4.55, h: bannerH - 0.15,
      fontFace: 'Calibri', valign: 'middle',
    });

    addFooterDeepDive(slide, pres);
  }

  // ─── Main exported function ────────────────────────────────────────────────

  /**
   * generateValueMapPPT(deal)
   *
   * Builds and triggers a browser download of a Conga-branded Value Map PPTX.
   * Requires PptxGenJS to be loaded as a global (via CDN <script> tag).
   *
   * @param {object} deal - Deal object from the value-map data model.
   */
  function generateValueMapPPT(deal) {
    if (typeof PptxGenJS === 'undefined') {
      alert('PowerPoint library not loaded. Please refresh and try again.');
      return;
    }

    // ── Extract deal data ──────────────────────────────────────────────────
    var vm          = deal && deal.value_map;
    var ctx         = (deal && deal.context) || {};
    var companyName = ctx.account_name || 'Account';
    var products    = (ctx.products && ctx.products.join(' · ')) || 'Revenue Lifecycle Management';
    var stage       = ctx.stage || '';
    var repName     = 'Account Executive';
    var dateStr     = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Normalize initiatives — support both old and new schemas
    var rawInitiatives = (vm && vm.initiatives) ? vm.initiatives.slice(0, 3) : [];
    var initiatives = rawInitiatives.map(function (i) {
      return {
        title:           i.initiative || (i.pbo ? i.pbo.split(' ').slice(0, 5).join(' ') : 'Initiative'),
        pbo:             i.pbo || [i.objective, i.strategy].filter(Boolean).join(' — ') || '',
        challenge:       i.challenge || '',
        currentState:    i.challengeMetric || i.challenge_metric || '',
        targetState:     i.targetMetric || i.target_metric || '',
        stakeholder:     i.stakeholder || '',
        capabilityLabel: i.capabilityLabel || i.capability_label || 'Required Capability',
        capability:      i.differentiatedValue || i.howCongaHelps || i.how_conga_helps || '',
        value:           i.value || '',
        proof:           i.proof || '',
      };
    });

    // Status helper — index 0 and 1 are ACTIVE, 2 is STRATEGIC by default
    function getStatus(idx) {
      return idx < 2 ? 'ACTIVE' : 'STRATEGIC';
    }

    // ── Build presentation ─────────────────────────────────────────────────
    var pres = new PptxGenJS();
    pres.layout = 'LAYOUT_16x9';
    pres.title  = companyName + ' — Conga Value Map';
    pres.author = repName;

    addSlide1(pres, { companyName: companyName, products: products, repName: repName, dateStr: dateStr });
    addSlide2(pres, { initiatives: initiatives, getStatus: getStatus });

    initiatives.forEach(function (initiative, idx) {
      addInitiativeSlide(pres, initiative, idx);
    });

    // ── Trigger download ───────────────────────────────────────────────────
    var safeCompany = companyName.replace(/[^a-z0-9]/gi, '_');
    var fileName = 'Conga_Value_Map_' + safeCompany + '_' + new Date().getFullYear() + '.pptx';
    pres.writeFile({ fileName: fileName });
  }

  // ── Expose to global scope for value-map/index.html ─────────────────────
  window.generateValueMapPPT = generateValueMapPPT;

})();

// lib/tfk/tfk-page-css.ts — TFK brand CSS as a string constant for preview iframe
export const TFK_CSS = `
  :root {
    /* TFK Photo-Extracted Palette */
    --cararra: #e9eae4;
    --bottle-green: #093621;
    --makara: #877a6d;
    --california: #fd9f0e;
    --chambray: #2c4e85;
    --straw: #d5bb79;
    --cafe-royale: #78420e;
    --cornflower: #4d90f1;

    /* Semantic mapping */
    --brand-dark: #093621;
    --brand-mid: #0d4a2e;
    --brand-light: #12603c;
    --accent-gold: #fd9f0e;
    --accent-gold-soft: #fef0d0;
    --accent-blue: #2c4e85;
    --accent-blue-light: #4d90f1;
    --warm-neutral: #877a6d;
    --warm-light: #e9eae4;
    --warm-sand: #d5bb79;
    --warm-brown: #78420e;
    --bg-cream: #f7f5f0;
    --bg-warm: #faf8f4;
    --white: #ffffff;
    --gray-50: #f9fafb;
    --gray-100: #f3f4f6;
    --gray-200: #e5e7eb;
    --gray-300: #d1d5db;
    --gray-400: #9ca3af;
    --gray-500: #6b7280;
    --gray-600: #4b5563;
    --gray-700: #374151;
    --gray-800: #1f2937;
    --gray-900: #111827;

    --serif: 'Playfair Display', Georgia, serif;
    --sans: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    --radius: 6px;
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.06);
    --shadow-md: 0 4px 14px rgba(0,0,0,0.08);
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: var(--sans); color: var(--gray-800); background: var(--bg-cream); line-height: 1.6; -webkit-font-smoothing: antialiased; }

  /* ── STICKY MOBILE BAR ── */
  .sticky-bar {
    position: sticky; top: 0; z-index: 100;
    background: var(--brand-dark);
    display: flex; justify-content: center; gap: 1px;
  }
  .sticky-bar a {
    flex: 1; max-width: 160px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 10px 6px;
    color: var(--cararra); text-decoration: none;
    font-size: 10px; font-weight: 600; letter-spacing: 0.6px; text-transform: uppercase;
    transition: background 0.2s;
  }
  .sticky-bar a:hover { background: var(--brand-mid); }
  .sticky-bar a svg { width: 17px; height: 17px; margin-bottom: 3px; fill: currentColor; }
  .sticky-bar .primary-action { background: var(--accent-gold); color: var(--brand-dark); }
  .sticky-bar .primary-action:hover { background: #e8920d; }

  /* ── HERO ── */
  .hero { position: relative; height: 440px; overflow: hidden; }
  .hero img { width: 100%; height: 100%; object-fit: cover; object-position: center 35%; display: block; }
  .hero-overlay {
    position: absolute; bottom: 0; left: 0; right: 0;
    background: linear-gradient(to top, rgba(9,54,33,0.96) 0%, rgba(9,54,33,0.65) 55%, transparent 100%);
    padding: 70px 0 30px;
  }
  .hero-content { max-width: 880px; margin: 0 auto; padding: 0 28px; }
  .hero h1 {
    font-family: var(--serif); font-size: 40px; font-weight: 600;
    color: var(--white); line-height: 1.12; margin-bottom: 6px;
  }
  .hero .subhead { font-size: 15px; color: var(--straw); font-weight: 400; margin-bottom: 14px; }
  .trust-strip { display: flex; flex-wrap: wrap; gap: 7px; }
  .trust-badge {
    display: inline-flex; align-items: center; gap: 5px;
    background: rgba(255,255,255,0.1); backdrop-filter: blur(6px);
    border: 1px solid rgba(213,187,121,0.3);
    border-radius: 100px; padding: 5px 14px;
    font-size: 11.5px; color: var(--cararra); font-weight: 500;
  }
  .trust-badge .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent-gold); }

  /* ── CONTAINER ── */
  .container { max-width: 880px; margin: 0 auto; padding: 0 28px; }

  /* ── PRIMARY FACTS ── */
  .facts-section { background: var(--white); border-bottom: 1px solid #e0ddd6; padding: 28px 0; }
  .facts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
  .fact-item { display: flex; align-items: flex-start; gap: 12px; }
  .fact-icon {
    width: 38px; height: 38px; border-radius: 8px;
    background: var(--accent-gold-soft); color: var(--cafe-royale);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .fact-icon svg { width: 16px; height: 16px; fill: currentColor; }
  .fact-label { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.9px; color: var(--warm-neutral); font-weight: 700; }
  .fact-value { font-size: 15px; font-weight: 500; color: var(--gray-800); }
  .fact-value a { color: var(--brand-dark); text-decoration: none; border-bottom: 1px dotted var(--warm-neutral); }
  .fact-value a:hover { border-bottom-style: solid; }

  .open-badge {
    display: inline-flex; align-items: center; gap: 5px;
    background: #ecfdf5; color: #059669; border-radius: 100px;
    padding: 2px 10px 2px 8px; font-size: 12px; font-weight: 600;
  }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

  .hours-toggle {
    font-size: 12.5px; color: var(--accent-blue); cursor: pointer;
    border: none; background: none; font-weight: 600; padding: 2px 0 0;
  }
  .hours-toggle:hover { text-decoration: underline; }
  .hours-full { display: none; margin-top: 8px; font-size: 13px; color: var(--gray-600); line-height: 1.9; }
  .hours-full.show { display: block; }

  /* ── CONVERSION MODULE ── */
  .conversion-section { background: var(--warm-light); border-bottom: 1px solid #d8d5cd; padding: 24px 0; }
  .cta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .cta-btn {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    padding: 13px 14px; border-radius: var(--radius);
    font-size: 12.5px; font-weight: 700; text-decoration: none;
    text-transform: uppercase; letter-spacing: 0.4px;
    transition: all 0.2s; cursor: pointer; border: none;
  }
  .cta-btn svg { width: 15px; height: 15px; fill: currentColor; }
  .cta-primary { background: var(--accent-gold); color: var(--brand-dark); box-shadow: 0 2px 8px rgba(253,159,14,0.35); }
  .cta-primary:hover { background: #e8920d; transform: translateY(-1px); }
  .cta-secondary { background: var(--brand-dark); color: var(--cararra); }
  .cta-secondary:hover { background: var(--brand-mid); }
  .cta-tertiary { background: var(--white); color: var(--gray-700); border: 1.5px solid var(--gray-300); }
  .cta-tertiary:hover { background: var(--gray-50); border-color: var(--warm-neutral); }

  /* ── SECTIONS ── */
  .section { padding: 38px 0; border-bottom: 1px solid #e0ddd6; }
  .section:last-child { border-bottom: none; }
  .section-label {
    font-size: 10.5px; text-transform: uppercase; letter-spacing: 1.6px;
    color: var(--accent-gold); font-weight: 800; margin-bottom: 8px;
  }
  .section h2 {
    font-family: var(--serif); font-size: 26px; font-weight: 600;
    color: var(--brand-dark); margin-bottom: 14px; line-height: 1.25;
  }
  .section p { font-size: 15px; color: var(--gray-600); margin-bottom: 14px; line-height: 1.75; }

  /* ── NEIGHBORHOOD ── */
  .neighborhood-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
  .hood-tag {
    background: var(--white); border: 1px solid #d8d5cd;
    border-radius: 100px; padding: 6px 15px;
    font-size: 13px; color: var(--warm-neutral); font-weight: 500;
  }

  /* ── FAQ ── */
  .faq-list { margin-top: 14px; }
  .faq-item { border: 1px solid #e0ddd6; border-radius: var(--radius); margin-bottom: 8px; overflow: hidden; }
  .faq-q {
    display: flex; justify-content: space-between; align-items: center;
    padding: 14px 18px; cursor: pointer;
    font-size: 14px; font-weight: 600; color: var(--gray-800);
    background: var(--white); transition: background 0.2s;
  }
  .faq-q:hover { background: var(--warm-light); }
  .faq-q .chevron { font-size: 18px; color: var(--warm-neutral); transition: transform 0.25s; }
  .faq-a {
    max-height: 0; overflow: hidden; transition: max-height 0.3s ease;
    padding: 0 18px; font-size: 14px; color: var(--gray-600); line-height: 1.7;
  }
  .faq-a a { color: var(--accent-blue); }
  .faq-item.open .faq-a { max-height: 200px; padding: 0 18px 16px; }
  .faq-item.open .chevron { transform: rotate(180deg); }

  /* ── FOOTER ── */
  .section-footer { background: var(--brand-dark); color: var(--cararra); padding: 32px 0; }
  .footer-links { display: flex; gap: 24px; flex-wrap: wrap; }
  .footer-links a { color: var(--straw); text-decoration: none; font-size: 13px; font-weight: 500; }
  .footer-links a:hover { color: var(--white); }
  .footer-copy { font-size: 12px; color: var(--warm-neutral); margin-top: 16px; }
  .footer-copy a { color: var(--warm-neutral); }

  /* ── GOOGLE RATING ── */
  .google-rating { margin-top: 12px; font-size: 14px; color: var(--gray-700); }
  .google-rating .stars { color: #f59e0b; font-size: 16px; letter-spacing: 1px; }
`

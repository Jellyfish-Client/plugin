import { RAIL_ATTR } from './jf-constants.js';

export const CSS_BLOCK = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Fira+Code:wght@500&display=swap');

  [${RAIL_ATTR}] {
    --jf-text: #FAFAFA;
    --jf-text-muted: #A3A3A3;
    --jf-text-subtle: #525252;
    --jf-surface-high: #171717;
    --jf-outline: #262626;
    --jf-radius-md: 12px;
    --jf-card-w: 128px;
    margin: 24px 0;
  }
  @media (min-width: 600px)  { [${RAIL_ATTR}] { --jf-card-w: 152px; } }
  @media (min-width: 1200px) { [${RAIL_ATTR}] { --jf-card-w: 176px; } }

  [${RAIL_ATTR}] .sectionTitleContainer {
    padding-left: 16px; padding-right: 16px;
    margin-bottom: 12px;
  }
  [${RAIL_ATTR}] .jf-bridge-eyebrow {
    display:block;
    font-family: 'Fira Code', ui-monospace, SFMono-Regular, monospace;
    font-size: 11px; font-weight: 500;
    letter-spacing: 1.6px; text-transform: uppercase;
    color: var(--jf-text-muted);
    margin-bottom: 4px;
  }
  [${RAIL_ATTR}] .sectionTitle {
    font-family: 'Fraunces', Georgia, serif;
    font-weight: 600; font-size: 30px; line-height: 1.1;
    letter-spacing: -0.6px;
    color: var(--jf-text);
    margin: 0;
  }

  [${RAIL_ATTR}] .itemsContainer {
    display:flex; flex-wrap:nowrap; overflow-x:auto; overflow-y:hidden;
    scroll-behavior:smooth; -webkit-overflow-scrolling:touch;
    scrollbar-width: none; -ms-overflow-style: none;
    gap: 12px;
    padding: 4px 16px 8px;
    cursor: grab;
    user-select: none;
  }
  [${RAIL_ATTR}] .itemsContainer.jf-bridge-grabbing {
    cursor: grabbing; scroll-behavior: auto;
  }
  [${RAIL_ATTR}] .itemsContainer::-webkit-scrollbar { display: none; }
  [${RAIL_ATTR}] .itemsContainer > .card {
    flex: 0 0 auto; width: var(--jf-card-w);
    background: transparent; border: 0; padding: 0; cursor: pointer;
    text-align: left;
    outline: none;
    box-shadow: none;
  }
  [${RAIL_ATTR}] .itemsContainer > .card:focus,
  [${RAIL_ATTR}] .itemsContainer > .card:focus-visible {
    outline: none;
    box-shadow: none;
  }
  [${RAIL_ATTR}] .itemsContainer > .card .cardScalable {
    border: 0 !important;
    outline: none !important;
  }
  [${RAIL_ATTR}] .cardBox { padding: 0; }
  [${RAIL_ATTR}] .cardScalable {
    border-radius: var(--jf-radius-md); overflow: hidden;
    aspect-ratio: 2 / 3;
    background: var(--jf-surface-high);
    transition: transform .18s ease;
  }
  [${RAIL_ATTR}] .card:hover .cardScalable,
  [${RAIL_ATTR}] .card:focus-visible .cardScalable {
    transform: translateY(-2px);
  }
  [${RAIL_ATTR}] .cardPadder { display: none; }
  [${RAIL_ATTR}] .cardImageContainer {
    position: relative;
    width: 100%; height: 100%;
    background-size: cover; background-position: center;
  }
  [${RAIL_ATTR}] .cardImageContainer::after {
    content: '';
    position: absolute; left: 0; right: 0; bottom: 0; height: 36px;
    background: linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.28));
    pointer-events: none;
  }
  [${RAIL_ATTR}] .cardText {
    font-family: 'Inter', system-ui, sans-serif;
    text-align: left; padding: 0;
  }
  [${RAIL_ATTR}] .cardText-first {
    color: var(--jf-text); font-size: 14px; font-weight: 500;
    line-height: 1.3;
    margin-top: 8px; letter-spacing: -0.1px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  [${RAIL_ATTR}] .cardText-secondary {
    color: var(--jf-text-muted); font-size: 12px; font-weight: 400;
    margin-top: 2px; letter-spacing: 0.2px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  .jf-bridge-chip {
    position:absolute; top:8px; left:8px;
    padding: 4px 10px;
    border-radius: 999px;
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 11px; font-weight: 600; letter-spacing: 0.2px;
    z-index:1;
    background: #171717; color: #A3A3A3;
  }
  .jf-bridge-chip--success    { background: #0A1F14; color: #16A34A; }
  .jf-bridge-chip--info       { background: #1A1A1A; color: #A3A3A3; }
  .jf-bridge-chip--warning    { background: #2C1F0E; color: #FFB559; }

  /* P0/P1 — Hero */
  @keyframes jf-bridge-pulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }
  .jf-bridge-hero {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    max-height: 60vh;
    min-height: 320px;
    overflow: hidden;
    background: #000;
    margin-bottom: 24px;
  }
  .jf-bridge-hero-slides { position: absolute; inset: 0; }
  .jf-bridge-hero-slide {
    position: absolute; inset: 0;
    background-size: cover; background-position: center;
    opacity: 0; transition: opacity .6s ease;
    display: flex; align-items: flex-end;
  }
  .jf-bridge-hero-slide--active { opacity: 1; }
  .jf-bridge-hero-slide::before {
    content: ''; position: absolute; inset: 0;
    background:
      linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 55%),
      linear-gradient(to right, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 50%);
  }
  .jf-bridge-hero-content {
    position: relative; z-index: 1;
    padding: 32px;
    max-width: 720px;
  }
  .jf-bridge-hero-logo {
    max-height: 120px; max-width: 60%;
    object-fit: contain;
    margin-bottom: 16px;
  }
  .jf-bridge-hero-title-fallback {
    font-family: 'Fraunces', Georgia, serif;
    font-weight: 600; font-size: 48px; line-height: 1.05;
    letter-spacing: -0.96px;
    color: var(--jf-text);
    margin: 0 0 16px;
  }
  .jf-bridge-hero-meta {
    display: flex; gap: 12px; align-items: center;
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 12px; color: var(--jf-text-muted);
    margin-bottom: 12px;
  }
  .jf-bridge-hero-meta-dot { width: 3px; height: 3px; border-radius: 50%; background: currentColor; opacity: 0.5; }
  .jf-bridge-hero-overview {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 14px; line-height: 1.5;
    color: var(--jf-text);
    opacity: 0.9;
    margin-bottom: 20px;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .jf-bridge-hero-actions { display: flex; gap: 12px; }
  .jf-bridge-hero-btn {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 14px; font-weight: 600;
    padding: 10px 20px; border-radius: 999px;
    border: 0; cursor: pointer;
    display: inline-flex; align-items: center; gap: 8px;
  }
  .jf-bridge-hero-btn--primary { background: #FAFAFA; color: #0A0A0A; }
  .jf-bridge-hero-btn--primary:hover { background: #fff; }
  .jf-bridge-hero-btn--secondary {
    background: rgba(255,255,255,0.1);
    color: #FAFAFA;
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255,255,255,0.2);
  }
  .jf-bridge-hero-btn--secondary:hover { background: rgba(255,255,255,0.18); }
  .jf-bridge-hero-dots {
    position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%);
    display: flex; gap: 8px; z-index: 2;
  }
  .jf-bridge-hero-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: rgba(255,255,255,0.3); border: 0; cursor: pointer;
    padding: 0; transition: background .2s ease, transform .2s ease;
  }
  .jf-bridge-hero-dot--active { background: #FAFAFA; transform: scale(1.2); }
  .jf-bridge-hero-skeleton {
    position: absolute; inset: 0;
    background: var(--jf-surface-high);
    animation: jf-bridge-pulse 1.6s ease-in-out infinite;
  }

  /* P2 — ProviderTile (watch providers) */
  [${RAIL_ATTR}^="seer_watch_providers"] .itemsContainer {
    padding: 4px 16px 8px;
    gap: 8px;
  }
  [${RAIL_ATTR}^="seer_watch_providers"] .itemsContainer > * {
    width: 72px;
    flex: 0 0 auto;
  }
  [${RAIL_ATTR}] .jf-bridge-provider-tile {
    width: 72px; height: 72px; flex: 0 0 auto;
    border: 0; padding: 0; cursor: pointer;
    background: var(--jf-surface-high);
    border-radius: 12px;
    overflow: hidden;
    display: flex; align-items: center; justify-content: center;
    transition: transform .15s ease;
  }
  [${RAIL_ATTR}] .jf-bridge-provider-tile:hover { transform: translateY(-2px); }
  [${RAIL_ATTR}] .jf-bridge-provider-tile img {
    max-width: 80%; max-height: 80%; object-fit: contain;
  }
  [${RAIL_ATTR}] .jf-bridge-provider-tile-initials {
    font-family: 'Inter', system-ui, sans-serif;
    color: var(--jf-text); font-weight: 600; font-size: 18px;
  }

  /* P2 — GenreTile (genre sliders) */
  [${RAIL_ATTR}^="seer_genre_slider"] {
    --jf-genre-w: 240px;
  }
  @media (min-width: 600px)  { [${RAIL_ATTR}^="seer_genre_slider"] { --jf-genre-w: 300px; } }
  @media (min-width: 1200px) { [${RAIL_ATTR}^="seer_genre_slider"] { --jf-genre-w: 360px; } }
  [${RAIL_ATTR}^="seer_genre_slider"] .itemsContainer > * {
    width: var(--jf-genre-w);
    flex: 0 0 auto;
  }
  [${RAIL_ATTR}] .jf-bridge-genre-tile {
    width: var(--jf-genre-w);
    aspect-ratio: 16 / 9;
    flex: 0 0 auto;
    border: 0; padding: 0; cursor: pointer;
    border-radius: 12px;
    overflow: hidden;
    position: relative;
    background-color: var(--jf-surface-high);
    background-position: center;
    background-size: cover;
    background-repeat: no-repeat;
    transition: transform .18s ease;
  }
  [${RAIL_ATTR}] .jf-bridge-genre-tile:hover { transform: translateY(-2px); }
  [${RAIL_ATTR}] .jf-bridge-genre-tile::after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(to bottom, rgba(0,0,0,0.05), rgba(0,0,0,0.6));
    pointer-events: none;
  }
  [${RAIL_ATTR}] .jf-bridge-genre-name {
    position: absolute; bottom: 12px; left: 12px; right: 12px;
    z-index: 1;
    font-family: 'Fraunces', Georgia, serif;
    font-size: 22px; font-weight: 500;
    color: #fff;
    line-height: 1.15;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-align: left;
  }

  /* P5 — Jellyfin landscape cards (continue watching + next up) */
  [${RAIL_ATTR}^="jf_continue"] .itemsContainer > .card,
  [${RAIL_ATTR}^="jf_next_up"] .itemsContainer > .card {
    width: 240px;
  }
  @media (min-width: 600px)  {
    [${RAIL_ATTR}^="jf_continue"] .itemsContainer > .card,
    [${RAIL_ATTR}^="jf_next_up"] .itemsContainer > .card { width: 300px; }
  }
  @media (min-width: 1200px) {
    [${RAIL_ATTR}^="jf_continue"] .itemsContainer > .card,
    [${RAIL_ATTR}^="jf_next_up"] .itemsContainer > .card { width: 360px; }
  }
  [${RAIL_ATTR}] .card.jf-bridge-landscape .cardScalable {
    aspect-ratio: 16 / 9 !important;
  }
  [${RAIL_ATTR}] .jf-bridge-progress {
    position: absolute; left: 0; right: 0; bottom: 0;
    height: 3px;
    background: rgba(255,255,255,0.2);
    z-index: 1;
  }
  [${RAIL_ATTR}] .jf-bridge-progress-bar {
    height: 100%;
    background: #FAFAFA;
  }

  /* P6 — Native Jellyfin takeover: hide native sections except library shortcuts. */
  .homePage #homeTab .sections > .verticalSection:not([${RAIL_ATTR}]):not([data-jf-bridge-native-keep]),
  .homePage #homeTab .sections > .section:not([${RAIL_ATTR}]):not([data-jf-bridge-native-keep]),
  .homePage #homeTab .sections > .homeSectionsContainer > .verticalSection:not([${RAIL_ATTR}]):not([data-jf-bridge-native-keep]) {
    display: none !important;
  }

  /* Request modal */
  .jf-bridge-modal-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.75);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    z-index: 10000;
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
    font-family: 'Inter', system-ui, sans-serif;
    animation: jf-bridge-fade-in 0.2s ease;
  }
  @keyframes jf-bridge-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .jf-bridge-modal {
    background: #0A0A0A;
    border: 1px solid #262626;
    border-radius: 16px;
    max-width: 640px;
    width: 100%;
    max-height: 90vh;
    overflow: hidden;
    position: relative;
    display: flex; flex-direction: column;
  }
  .jf-bridge-modal-close {
    position: absolute; top: 12px; right: 12px;
    width: 32px; height: 32px;
    border-radius: 50%;
    background: rgba(255,255,255,0.1);
    color: #FAFAFA;
    border: 0; cursor: pointer;
    font-size: 20px; line-height: 1;
    display: flex; align-items: center; justify-content: center;
    z-index: 2;
  }
  .jf-bridge-modal-close:hover { background: rgba(255,255,255,0.18); }
  .jf-bridge-modal-body {
    display: flex; gap: 20px;
    padding: 24px;
    overflow-y: auto;
    align-items: flex-start;
  }
  @media (max-width: 600px) {
    .jf-bridge-modal-body { flex-direction: column; gap: 16px; padding: 16px; padding-top: 56px; align-items: stretch; }
  }
  .jf-bridge-modal-poster {
    flex: 0 0 auto;
    width: 160px;
    height: 240px;
    background-color: #171717;
    background-position: center;
    background-size: cover;
    background-repeat: no-repeat;
    border-radius: 12px;
  }
  @media (max-width: 600px) {
    .jf-bridge-modal-poster { width: 120px; height: 180px; align-self: center; }
  }
  .jf-bridge-modal-content {
    flex: 1; min-width: 0;
    display: flex; flex-direction: column; gap: 12px;
  }
  .jf-bridge-modal-title {
    font-family: 'Fraunces', Georgia, serif;
    font-size: 28px; font-weight: 600;
    letter-spacing: -0.5px;
    color: #FAFAFA;
    margin: 0;
  }
  .jf-bridge-modal-meta {
    font-size: 12px;
    color: #A3A3A3;
    letter-spacing: 0.2px;
  }
  .jf-bridge-modal-overview {
    font-size: 14px;
    color: #FAFAFA;
    opacity: 0.85;
    line-height: 1.5;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .jf-bridge-modal-seasons h3 {
    font-family: 'Fira Code', monospace;
    font-size: 11px; font-weight: 500;
    letter-spacing: 1.6px; text-transform: uppercase;
    color: #A3A3A3;
    margin: 8px 0 4px;
  }
  .jf-bridge-modal-seasons-header {
    display: flex; align-items: center; justify-content: space-between;
    margin: 8px 0 4px;
  }
  .jf-bridge-modal-seasons-header h3 { margin: 0; }
  .jf-bridge-modal-seasons-toggle {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 12px; font-weight: 500;
    color: #A3A3A3;
    background: transparent;
    border: 1px solid #262626;
    border-radius: 999px;
    padding: 4px 12px;
    cursor: pointer;
    transition: color .15s ease, border-color .15s ease;
  }
  .jf-bridge-modal-seasons-toggle:hover { color: #FAFAFA; border-color: #525252; }
  .jf-bridge-modal-seasons-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 6px;
    max-height: 280px;
    overflow-y: auto;
    padding-right: 4px;
  }
  .jf-bridge-modal-seasons-grid::-webkit-scrollbar { width: 6px; }
  .jf-bridge-modal-seasons-grid::-webkit-scrollbar-thumb {
    background: #262626; border-radius: 3px;
  }
  .jf-bridge-modal-seasons-grid label {
    display: flex; align-items: center; gap: 8px;
    font-size: 13px; color: #FAFAFA;
    padding: 6px 10px;
    background: #171717;
    border-radius: 8px;
    cursor: pointer;
  }
  .jf-bridge-modal-seasons-grid input[type="checkbox"] { accent-color: #FAFAFA; }
  .jf-bridge-modal-error {
    font-size: 13px;
    color: #FF6B6B;
    padding: 8px 12px;
    background: rgba(255, 107, 107, 0.1);
    border-radius: 8px;
  }
  .jf-bridge-modal-actions {
    display: flex; gap: 8px; justify-content: flex-end;
    margin-top: 12px;
  }
  .jf-bridge-btn {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 14px; font-weight: 600;
    padding: 10px 20px;
    border-radius: 999px;
    border: 0; cursor: pointer;
    transition: background .15s ease;
  }
  .jf-bridge-btn--primary { background: #FAFAFA; color: #0A0A0A; }
  .jf-bridge-btn--primary:hover:not(:disabled) { background: #fff; }
  .jf-bridge-btn--primary:disabled { background: #525252; color: #A3A3A3; cursor: not-allowed; }
  .jf-bridge-btn--primary.jf-bridge-btn--success { background: #16A34A; color: #fff; }
  .jf-bridge-btn--secondary { background: rgba(255,255,255,0.1); color: #FAFAFA; }
  .jf-bridge-btn--secondary:hover:not(:disabled) { background: rgba(255,255,255,0.18); }
  .jf-bridge-btn--secondary:disabled { opacity: 0.5; cursor: not-allowed; }

  /* Toast */
  .jf-bridge-toast {
    position: fixed; bottom: 24px; right: 24px;
    z-index: 10001;
    background: #171717;
    border: 1px solid #262626;
    border-radius: 12px;
    padding: 12px 20px;
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 14px;
    color: #FAFAFA;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    animation: jf-bridge-toast-in 0.2s ease;
  }
  .jf-bridge-toast--success { border-color: #16A34A; }
  .jf-bridge-toast--error { border-color: #FF6B6B; }
  @keyframes jf-bridge-toast-in {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

export function ensureStyle() {
  if (document.getElementById('jf-bridge-style')) return;
  const s = document.createElement('style');
  s.id = 'jf-bridge-style';
  s.textContent = CSS_BLOCK;
  document.head.appendChild(s);
}

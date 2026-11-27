import { PRESETS, codeFor } from './code.js';

const el = (tag, props, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
// Secondary action: quiet blue text button, like Gmail's own.
const btn = (text, onClick) => el('button', { textContent: text, onclick: onClick, type: 'button', className: 'fb-text' });

// Gmail-like Material look; every selector is under .fb so nothing leaks into Gmail.
const CSS = `
.fb{box-sizing:border-box;width:300px;padding:16px;background:#fff;color:#202124;font:14px/20px "Google Sans",Roboto,Arial,sans-serif}
.fb *{box-sizing:border-box;font-family:inherit}
.fb h3{margin:0 0 12px;font:500 16px/24px "Google Sans",Roboto,Arial,sans-serif}
.fb label.fb-check{display:flex;align-items:center;gap:8px;margin-bottom:12px;cursor:pointer}
.fb input[type=checkbox]{width:16px;height:16px;margin:0;accent-color:#1a73e8}
.fb textarea,.fb input[type=datetime-local]{width:100%;padding:8px 12px;border:1px solid #dadce0;border-radius:8px;font-size:14px;color:#202124;background:#fff;outline:none}
.fb textarea{resize:vertical;margin-bottom:12px}
.fb textarea:focus,.fb input[type=datetime-local]:focus{border-color:#1a73e8;box-shadow:0 0 0 1px #1a73e8}
.fb textarea:disabled{background:#f1f3f4;color:#80868b}
.fb .fb-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}
.fb .fb-chip{padding:6px 8px;border:1px solid #dadce0;border-radius:16px;background:#fff;color:#3c4043;font-size:13px;cursor:pointer}
.fb .fb-chip:hover{background:#f1f3f4}
.fb .fb-chip:active{background:#e8eaed}
.fb .fb-chip.wide{grid-column:1 / -1}
.fb .fb-when{display:flex;flex-direction:column;gap:8px;padding-top:12px;border-top:1px solid #e8eaed}
.fb .fb-primary{padding:8px 16px;border:0;border-radius:18px;background:#1a73e8;color:#fff;font:500 14px "Google Sans",Roboto,Arial,sans-serif;cursor:pointer}
.fb .fb-primary:hover{background:#1b66c9;box-shadow:0 1px 2px rgba(60,64,67,.3)}
.fb .fb-extra{display:flex;flex-direction:column;align-items:flex-start;gap:4px;margin-top:12px;padding-top:12px;border-top:1px solid #e8eaed;width:100%}
.fb .fb-text{padding:6px 8px;border:0;border-radius:4px;background:none;color:#1a73e8;font:500 14px "Google Sans",Roboto,Arial,sans-serif;cursor:pointer}
.fb .fb-text:hover{background:#f6fafe}
.fb .fb-status{font-size:12px;color:#5f6368;min-height:16px}
`;

// The shared "when?" menu. onPick(code, { noreply, followUp }) runs when a time is chosen; returns the element.
// extra: elements shown below a divider (secondary actions, a status line).
export function buildMenu(heading, onPick, extra) {
  const noreply = el('input', { type: 'checkbox', checked: true });
  const followUp = el('textarea', { rows: 3, placeholder: 'Follow-up text, sent automatically if nobody replies (optional)' });
  noreply.onchange = () => { followUp.disabled = !noreply.checked; };
  const opts = () => ({ noreply: noreply.checked, followUp: noreply.checked ? followUp.value.trim() : '' });

  const when = el('input', { type: 'datetime-local' });
  when.min = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const chips = PRESETS.map(([code, label]) => el('button', { textContent: label, type: 'button', className: 'fb-chip', onclick: () => onPick(code, opts()) }));
  const set = el('button', { textContent: 'Set reminder', type: 'button', className: 'fb-primary',
    onclick: () => { when.required = true; if (when.reportValidity()) onPick(codeFor(new Date(when.value)), opts()); } });

  return el('div', { className: 'fb' }, el('style', { textContent: CSS }), el('h3', { textContent: heading }),
    el('label', { className: 'fb-check' }, noreply, 'Only if nobody replies'), followUp,
    el('div', { className: 'fb-grid' }, ...chips),
    el('div', { className: 'fb-when' }, el('span', { textContent: 'Or pick a date and time' }), when, set),
    ...(extra && extra.length ? [el('div', { className: 'fb-extra' }, ...extra)] : []));
}

// Coloured FlyBy band (thread notice bar, compose notice). kind: wait | done | warn | info.
const BAND_CSS = `
.fb-band{margin:4px 0;padding:8px 12px;border-left:6px solid;border-radius:8px;font:500 14px/20px "Google Sans",Roboto,Arial,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fb-band.wait{background:#fef7e0;border-color:#f9ab00;color:#5c3c00}
.fb-band.done{background:#e6f4ea;border-color:#1e8e3e;color:#0d652d}
.fb-band.warn{background:#fce8e6;border-color:#d93025;color:#a50e0e}
.fb-band.info{background:#e8f0fe;border-color:#1a73e8;color:#174ea6}
.fb-band::before{content:"\\2708";font-size:16px;margin-right:8px}
`;
function band(kind, text) {
  return el('div', {}, el('style', { textContent: BAND_CSS }), el('div', { className: 'fb-band ' + kind, textContent: text, title: text }));
}

export { el, btn, band };

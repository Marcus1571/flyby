import '@inboxsdk/core/background.js'; // InboxSDK's own page-world injector

// Content script -> {flyby: {...}} -> POST to the Apps Script web app. The token never reaches the Gmail page.
// URL and token are the user's own, entered once on the extension's settings page (options.html), kept in chrome.storage.local.
chrome.runtime.onMessage.addListener((msg, _sender, send) => {
  if (!msg || !msg.flyby) return;
  chrome.storage.local.get(['apiUrl', 'apiToken']).then(({ apiUrl, apiToken }) => {
    if (!apiUrl || !apiToken) { send({ ok: false, error: 'FlyBy is not set up: open the extension\'s Options and paste your web app URL and token (KB §2)' }); return; }
    return fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ ...msg.flyby, token: apiToken }) })
      .then(r => r.json()).then(send);
  }).catch(e => send({ ok: false, error: String(e) }));
  return true; // answer asynchronously
});

// install, and every update or reload while unset: reloading an unpacked build is an "update", so 0.5.1 users never saw the page (2026-11-27)
chrome.runtime.onInstalled.addListener(() => chrome.storage.local.get(['apiUrl', 'apiToken']).then(({ apiUrl, apiToken }) => { if (!apiUrl || !apiToken) chrome.runtime.openOptionsPage(); }));

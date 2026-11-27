// Settings page: stores the user's web app URL + token in chrome.storage.local, then pings the API through the worker.
const $ = id => document.getElementById(id), msg = t => { $('msg').textContent = t; };
chrome.storage.local.get(['apiUrl', 'apiToken']).then(v => { $('url').value = v.apiUrl || ''; $('token').value = v.apiToken || ''; });
$('save').onclick = async () => {
  const apiUrl = $('url').value.trim(), apiToken = $('token').value.trim();
  if (!/^https:\/\/script\.google\.com\/(a\/macros\/[^/]+|macros)\/s\/[\w-]+\/exec$/.test(apiUrl)) return msg('The URL must look like https://script.google.com/macros/s/…/exec');
  if (!/^[0-9a-f]{64}$/.test(apiToken)) return msg('The token must be 64 characters (0-9, a-f).');
  await chrome.storage.local.set({ apiUrl, apiToken });
  msg('Saved, testing…');
  const res = await chrome.runtime.sendMessage({ flyby: { action: 'ping' } }).catch(e => ({ ok: false, error: String(e) }));
  msg(res && res.ok ? 'Saved. FlyBy is connected; reload Gmail.' : 'Saved, but the test failed: ' + (res && res.error || 'no answer'));
};

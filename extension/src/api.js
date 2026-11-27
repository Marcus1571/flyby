// Talks to the engine's web API through the background worker (it has the host permission and the token).
export function api(payload) {
  return new Promise(resolve => chrome.runtime.sendMessage({ flyby: payload }, res => {
    resolve(res || { ok: false, error: chrome.runtime.lastError ? chrome.runtime.lastError.message : 'no answer' });
  }));
}

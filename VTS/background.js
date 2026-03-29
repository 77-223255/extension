/**
 * background.js - Service Worker v1.0.0
 */

const cache = {
  data: new Map(),
  capturing: new Map(),
  timers: new Map(),
  size: 0,
  LIMIT: 200,
  MAX_MEM: 20 << 20,
  _saveTimer: null,

  sizeOf: d => d ? Math.floor(d.length * 0.75) : 0,
  
  async load() {
    const { vts_thumbnails: s = {} } = await chrome.storage.session.get('vts_thumbnails').catch(() => ({}));
    this.data.clear(), this.size = 0;
    for (const [id, d] of Object.entries(s)) {
      if (!id.startsWith('_')) this.data.set(+id, d), this.size += this.sizeOf(d);
    }
  },

  save() {
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      chrome.storage.session.set({ vts_thumbnails: Object.fromEntries(this.data) }).catch(() => {});
      this._saveTimer = null;
    }, 1000);
  },

  evict() {
    while (this.data.size > this.LIMIT || this.size > this.MAX_MEM) {
      const [k, d] = this.data.entries().next().value || [];
      this.size -= this.sizeOf(d), this.data.delete(k);
    }
  },

  set(id, d) {
    if (!d) return;
    this.size -= this.sizeOf(this.data.get(id));
    this.data.set(id, d), this.size += this.sizeOf(d);
    this.evict(), this.save();
  },

  del(id) {
    this.size -= this.sizeOf(this.data.get(id));
    this.data.delete(id);
  }
};

const isAllowed = url => url && !['chrome://', 'edge://', 'about:', 'chrome-extension://'].some(p => url.startsWith(p));

async function capture(tabId, windowId) {
  const now = Date.now(), c = cache.capturing.get(tabId);
  if (c && now - c.t < 5000) return c.p;
  const p = chrome.tabs.captureVisibleTab(windowId, { format: 'jpeg', quality: 45 })
    .then(d => (cache.set(tabId, d), d))
    .catch(() => null)
    .finally(() => cache.capturing.delete(tabId));
  cache.capturing.set(tabId, { p, t: now });
  return p;
}

const router = {
  async getTabsAndCapture({ tab }) {
    const wid = tab?.windowId;
    if (!wid) return { tabs: [] };
    const [tabs] = await Promise.all([
      chrome.tabs.query({ windowId: wid }),
      tab?.id ? capture(tab.id, wid) : null
    ]);
    return {
      tabs: tabs.map(t => ({
        id: t.id, title: t.title || '加载中...', favIconUrl: t.favIconUrl || '',
        active: t.active, thumbnail: cache.data.get(t.id)
      })),
      currentTabId: tab?.id
    };
  },

  async switchTab({ tabId }) {
    try { await chrome.tabs.update(tabId, { active: true }); return { ok: true }; }
    catch (e) { return { ok: false, error: e.message }; }
  },

  async closeTab({ tabId }) {
    try {
      await chrome.tabs.remove(tabId);
      cache.del(tabId), cache.capturing.delete(tabId);
      chrome.alarms.clear(`c_${tabId}`).catch(() => {});
      cache.timers.delete(tabId);
      await cache.save();
      return { ok: true };
    } catch (e) { return { ok: false, error: e.message }; }
  }
};

chrome.alarms.onAlarm.addListener(async ({ name }) => {
  if (!name.startsWith('c_')) return;
  const id = +name.slice(2), wid = cache.timers.get(id);
  if (!wid) return;
  const t = await chrome.tabs.get(id).catch(() => null);
  t?.active && isAllowed(t.url) ? await capture(id, wid) : (chrome.alarms.clear(name), cache.timers.delete(id));
});

chrome.tabs.onActivated.addListener(async ({ tabId, windowId }) => {
  const t = await chrome.tabs.get(tabId).catch(() => null);
  if (t && isAllowed(t.url)) {
    await capture(tabId, windowId);
    chrome.alarms.create(`c_${tabId}`, { periodInMinutes: 10 });
    cache.timers.set(tabId, windowId);
  }
});

chrome.tabs.onUpdated.addListener(async (id, { status }, t) => {
  if (status === 'complete' && t?.active && isAllowed(t.url)) {
    await capture(id, t.windowId);
    chrome.alarms.create(`c_${id}`, { periodInMinutes: 10 });
    cache.timers.set(id, t.windowId);
  }
});

chrome.tabs.onRemoved.addListener(id => {
  cache.del(id), cache.capturing.delete(id), cache.timers.delete(id);
  chrome.alarms.clear(`c_${id}`).catch(() => {});
  cache.save();
});

chrome.commands.onCommand.addListener(cmd => {
  if (cmd !== 'open-overlay') return;
  chrome.tabs.query({ active: true, currentWindow: true }, ([t]) => {
    if (!t?.id) return;
    chrome.tabs.sendMessage(t.id, { action: 'trigger' }, r => {
      if (chrome.runtime.lastError) {
        chrome.scripting.executeScript({ target: { tabId: t.id }, files: ['content-script.js'] })
          .then(() => setTimeout(() => chrome.tabs.sendMessage(t.id, { action: 'trigger' }), 100));
      }
    });
  });
});

chrome.runtime.onMessage.addListener((msg, sender, send) => {
  const h = router[msg.action];
  if (h) h({ ...msg, tab: sender.tab }).then(send).catch(() => send({}));
  return true;
});

cache.load();
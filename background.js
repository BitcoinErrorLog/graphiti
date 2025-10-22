import {
  getConfig,
  setConfig,
  startRingAuth,
  searchPostsByUrl,
  createUrlPost,
  getBookmark,
  createBookmark,
  deleteBookmark,
  normalizeUrl
} from "./sdk.js";

const RECENT_TABS = new Map();

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "graphiti-save",
      title: "Save link post to Pubky",
      contexts: ["page", "link"]
    });
  });
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "toggle_sidebar") {
    const tab = await getActiveTab();
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_SIDEBAR" }).catch(() => {});
    }
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "graphiti-save") return;
  const targetUrl = info.linkUrl || info.pageUrl;
  if (!targetUrl || !tab?.id) return;
  RECENT_TABS.set(tab.id, targetUrl);
  chrome.action.openPopup();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.scope !== "graphiti:bg") return;
  (async () => {
    try {
      switch (message.type) {
        case "config:get": {
          sendResponse({ ok: true, value: await getConfig() });
          return;
        }
        case "config:set": {
          await setConfig(message.value || {});
          sendResponse({ ok: true });
          return;
        }
        case "auth:start": {
          await startRingAuth({ awaitApproval: false });
          sendResponse({ ok: true });
          return;
        }
        case "posts:search": {
          const { items } = await searchPostsByUrl(message.url);
          sendResponse({ ok: true, value: items });
          return;
        }
        case "posts:create": {
          await createUrlPost(message.payload);
          sendResponse({ ok: true });
          return;
        }
        case "bookmark:get": {
          const value = await getBookmark(message.url);
          sendResponse({ ok: true, value });
          return;
        }
        case "bookmark:create": {
          await createBookmark(message.payload);
          sendResponse({ ok: true });
          return;
        }
        case "bookmark:delete": {
          await deleteBookmark(message.payload);
          sendResponse({ ok: true });
          return;
        }
        case "recent:get": {
          const tabId = message.payload?.tabId ?? sender?.tab?.id;
          let value = null;
          if (typeof tabId === "number") {
            value = getRecentUrlForTab(tabId);
            RECENT_TABS.delete(tabId);
          }
          sendResponse({ ok: true, value });
          return;
        }
        case "url:normalize": {
          sendResponse({ ok: true, value: normalizeUrl(message.href) });
          return;
        }
        default:
          sendResponse({ ok: false, error: "Unknown message" });
      }
    } catch (err) {
      sendResponse({ ok: false, error: err?.message || String(err) });
    }
  })();
  return true;
});

chrome.omnibox.onInputEntered.addListener(async (text, disposition) => {
  const cfg = await getConfig();
  const url = `${cfg.nexusUrl || "https://nexus.pubky.app"}/v0/search?kind=link&text=${encodeURIComponent(text)}`;
  const tab = await getActiveTab();
  if (tab?.id && disposition === "currentTab") {
    chrome.tabs.update(tab.id, { url });
  } else {
    chrome.tabs.create({ url });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  RECENT_TABS.delete(tabId);
});

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

export function getRecentUrlForTab(tabId) {
  return RECENT_TABS.get(tabId) || null;
}

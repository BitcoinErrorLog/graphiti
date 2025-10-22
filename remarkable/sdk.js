const DEFAULTS = {
  RELAY: "https://httprelay.pubky.app/link/",
  NEXUS: "https://nexus.pubky.app",
  CAPS: ["/pub/remarkable/:rw"],
  SIDEBAR_WIDTH: 380
};

const STORAGE_CONFIG_KEY = "remarkable:config";
const SESSION_KEY = "remarkable:session";
const BOOKMARK_PREFIX = "bm:";
const CACHE_TTL = 30_000; // 30s cache for sidebar reads

let clientPromise;
let searchCache = new Map();

export async function getConfig() {
  const { [STORAGE_CONFIG_KEY]: stored } = await chrome.storage.sync.get(STORAGE_CONFIG_KEY);
  return {
    relay: DEFAULTS.RELAY,
    nexusUrl: DEFAULTS.NEXUS,
    following: [],
    myPubkey: "",
    debug: false,
    ...(stored || {})
  };
}

export async function setConfig(cfg) {
  const current = await getConfig();
  const next = { ...current, ...cfg };
  await chrome.storage.sync.set({ [STORAGE_CONFIG_KEY]: next });
  if (typeof cfg.debug === "boolean") {
    clientPromise = undefined; // reset to reapply log level
  }
}

export function normalizeUrl(href) {
  const u = new URL(href);
  u.hash = "";
  const sorted = [...u.searchParams.entries()].sort(([ak, av], [bk, bv]) => {
    if (ak === bk) {
      return av.localeCompare(bv);
    }
    return ak.localeCompare(bk);
  });
  u.search = "";
  if (sorted.length) {
    const params = new URLSearchParams();
    for (const [k, v] of sorted) params.append(k, v);
    u.search = `?${params.toString()}`;
  }
  u.host = u.host.toLowerCase();
  if ((u.protocol === "http:" && u.port === "80") || (u.protocol === "https:" && u.port === "443")) {
    u.port = "";
  }
  return u.toString();
}

export async function startRingAuth() {
  const cfg = await getConfig();
  const caps = DEFAULTS.CAPS;
  const relay = cfg.relay || DEFAULTS.RELAY;
  const reqRes = await fetch(new URL("requests", relay).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ caps })
  });
  if (!reqRes.ok) {
    throw new Error("Auth relay error creating request");
  }
  const reqData = await reqRes.json();
  if (!reqData?.id || !reqData?.url) {
    throw new Error("Auth relay error creating request");
  }

  const statusUrl = new URL(`requests/${reqData.id}`, relay).toString();
  await chrome.tabs.create({ url: chrome.runtime.getURL(`auth.html#auth=${encodeURIComponent(reqData.url)}&status=${encodeURIComponent(statusUrl)}`) });

  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const statusRes = await fetch(statusUrl);
    if (!statusRes.ok) {
      await delay(1000);
      continue;
    }
    const payload = await statusRes.json();
    if (payload.status === "approved" && payload.session && payload.pubkey) {
      await Promise.all([
        setSession(payload.session),
        setConfig({ myPubkey: payload.pubkey })
      ]);
      return true;
    }
    if (payload.status === "denied" || payload.status === "expired") {
      throw new Error("Auth denied or expired.");
    }
    await delay(1000);
  }
  throw new Error("Auth timeout.");
}

export async function createUrlPost({ url, tags, note }) {
  const cfg = await getConfig();
  const session = await getSession();
  if (!cfg.myPubkey) {
    throw new Error("Set your pubkey in Settings first.");
  }
  const normalized = normalizeUrl(url);
  await getClient();
  const fname = await sha256Hex(normalized);
  const target = `https://_pubky.${cfg.myPubkey}/pub/remarkable/${fname}.json`;
  const post = {
    kind: "link",
    content: normalized,
    tags: Array.isArray(tags) ? tags.filter(Boolean) : [],
    note: note || "",
    created_at: Date.now()
  };
  const headers = { "Content-Type": "application/json" };
  if (session) {
    headers["Authorization"] = `Bearer ${session}`;
  }
  const res = await fetch(target, {
    method: "PUT",
    headers,
    body: JSON.stringify(post)
  });
  if (!res.ok) {
    throw new Error(`PUT failed: ${res.status}`);
  }
  invalidateCache(normalized);
  return true;
}

export async function searchPostsByUrl(url) {
  const normalized = normalizeUrl(url);
  const cached = searchCache.get(normalized);
  if (cached && cached.expires > Date.now()) {
    return { items: cached.items.slice() };
  }
  const cfg = await getConfig();
  const following = (cfg.following || []).filter(Boolean);
  const params = new URLSearchParams({ kind: "link", url: normalized });
  if (following.length) params.set("following", following.join(","));
  let items = [];
  try {
    const nexusUrl = cfg.nexusUrl || DEFAULTS.NEXUS;
    const endpoint = `${nexusUrl.replace(/\/?$/, "")}/v0/search?${params.toString()}`;
    const res = await fetch(endpoint);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        items = data;
      } else if (data && Array.isArray(data.items)) {
        items = data.items;
      }
    }
  } catch (_) {
    // ignore, fallback below
  }
  if (!items.length && following.length) {
    items = await fallbackReads(normalized, following);
  }
  items.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
  searchCache.set(normalized, { items, expires: Date.now() + CACHE_TTL });
  return { items: items.slice() };
}

export async function getBookmark(url) {
  const normalized = normalizeUrl(url);
  const key = BOOKMARK_PREFIX + (await sha256Hex(normalized));
  const { [key]: value } = await chrome.storage.local.get(key);
  return value || null;
}

export async function createBookmark({ url, tags, note }) {
  const normalized = normalizeUrl(url);
  const key = BOOKMARK_PREFIX + (await sha256Hex(normalized));
  const value = { saved: true, at: Date.now(), tags: tags || [], note: note || "" };
  await chrome.storage.local.set({ [key]: value });
  return true;
}

export async function deleteBookmark({ url }) {
  const normalized = normalizeUrl(url);
  const key = BOOKMARK_PREFIX + (await sha256Hex(normalized));
  await chrome.storage.local.remove(key);
  return true;
}

export async function getSession() {
  const { [SESSION_KEY]: session } = await chrome.storage.local.get(SESSION_KEY);
  return session || "";
}

export async function setSession(session) {
  await chrome.storage.local.set({ [SESSION_KEY]: session });
}

async function fallbackReads(normalized, following) {
  const out = [];
  const urlHash = await sha256Hex(normalized);
  await Promise.all(following.map(async (z32) => {
    try {
      const url = `https://_pubky.${z32}/pub/remarkable/${urlHash}.json`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.kind === "link") {
        out.push({ ...data, author: z32 });
      }
    } catch (_) {
      // ignore
    }
  }));
  return out;
}

function invalidateCache(normalized) {
  searchCache.delete(normalized);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sha256Hex(str) {
  const msgUint8 = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getClient() {
  if (!clientPromise) {
    clientPromise = (async () => {
      try {
        const mod = await import(chrome.runtime.getURL("lib/index.js"));
        const cfg = await getConfig();
        if (cfg.debug && typeof mod.setLogLevel === "function") {
          mod.setLogLevel("debug");
        }
        return mod;
      } catch (err) {
        console.error("SDK unavailable", err);
        throw new Error("SDK unavailable");
      }
    })();
  }
  return clientPromise;
}

export async function ensureClient() {
  return getClient();
}

if (!globalThis.__remarkableSdkListener) {
  globalThis.__remarkableSdkListener = true;
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.scope !== "remarkable:sdk") return;
    (async () => {
      try {
        switch (message.type) {
          case "normalize": {
            sendResponse({ ok: true, value: normalizeUrl(message.href) });
            return;
          }
          case "search": {
            const result = await searchPostsByUrl(message.url);
            sendResponse({ ok: true, value: result });
            return;
          }
          case "bookmark:get": {
            const value = await getBookmark(message.url);
            sendResponse({ ok: true, value });
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
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes[STORAGE_CONFIG_KEY]) {
    clientPromise = undefined;
  }
});

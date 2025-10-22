const DEFAULTS = {
  RELAY: "https://httprelay.pubky.app/link/",
  NEXUS: "https://nexus.pubky.app",
  CAPS: ["/pub/remarkable/:rw"],
  SIDEBAR_WIDTH: 380
};

let normalizeUrlFn = (href) => href;
const sdkReady = (async () => {
  try {
    ({ normalizeUrl: normalizeUrlFn } = await import(chrome.runtime.getURL('sdk.js')));
  } catch (err) {
    console.error('Failed to load normalizeUrl', err);
  }
})();

const SIDEBAR_ID = "remarkable-sidebar";
const STATE = {
  open: false,
  currentUrl: null,
  bookmark: null,
  posts: [],
  loading: false,
  error: ""
};

let shadowRoot;
let container;
let form;
let list;
let status;
let bookmarkToggle;
let noteInput;
let tagsInput;

const ESCAPE = document.createElement("textarea");
function escape(str) {
  ESCAPE.textContent = str ?? "";
  return ESCAPE.innerHTML;
}

function ensureSidebar() {
  if (container) return;
  container = document.createElement("div");
  container.id = SIDEBAR_ID;
  container.attachShadow({ mode: "open" });
  shadowRoot = container.shadowRoot;
  const styleLink = document.createElement("link");
  styleLink.rel = "stylesheet";
  styleLink.href = chrome.runtime.getURL("styles/shadcn.css");
  shadowRoot.appendChild(styleLink);

  const wrapper = document.createElement("div");
  wrapper.className = "remarkable-shell";
  wrapper.innerHTML = `
    <style>${getSidebarCss()}</style>
    <div class="remarkable-panel">
      <header class="remarkable-header">
        <strong>Remarkable</strong>
        <button class="remarkable-close" title="Close">×</button>
      </header>
      <section class="remarkable-form">
        <label>Tags
          <input type="text" name="tags" placeholder="comma,separated" />
        </label>
        <label>Note
          <textarea name="note" rows="3" placeholder="Add a note"></textarea>
        </label>
        <div class="remarkable-actions">
          <button type="submit" class="remarkable-save">Save</button>
          <button type="button" class="remarkable-bookmark" title="Toggle bookmark">☆</button>
        </div>
        <p class="remarkable-status" aria-live="polite"></p>
      </section>
      <section class="remarkable-list" aria-live="polite"></section>
    </div>`;
  shadowRoot.appendChild(wrapper);
  document.documentElement.appendChild(container);

  form = shadowRoot.querySelector(".remarkable-form");
  list = shadowRoot.querySelector(".remarkable-list");
  status = shadowRoot.querySelector(".remarkable-status");
  bookmarkToggle = shadowRoot.querySelector(".remarkable-bookmark");
  noteInput = shadowRoot.querySelector("textarea[name=note]");
  tagsInput = shadowRoot.querySelector("input[name=tags]");

  shadowRoot.querySelector(".remarkable-close").addEventListener("click", () => toggleSidebar(false));
  bookmarkToggle.addEventListener("click", onBookmarkToggle);
  form.addEventListener("submit", onSave);
}

async function onSave(evt) {
  evt.preventDefault();
  if (!STATE.currentUrl) return;
  try {
    setLoading(true, "Saving…");
    const tags = (tagsInput.value || "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    await sendBg("posts:create", { url: STATE.currentUrl, tags, note: noteInput.value || "" });
    setMessage("Saved!");
    await refreshData();
  } catch (err) {
    setError(err?.message || "Failed");
  } finally {
    setLoading(false);
  }
}

async function onBookmarkToggle() {
  if (!STATE.currentUrl) return;
  try {
    if (STATE.bookmark) {
      await sendBg("bookmark:delete", { url: STATE.currentUrl });
      STATE.bookmark = null;
      setMessage("Bookmark removed");
    } else {
      const tags = (tagsInput.value || "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      await sendBg("bookmark:create", { url: STATE.currentUrl, tags, note: noteInput.value || "" });
      STATE.bookmark = await sendBg("bookmark:get", null, STATE.currentUrl);
      setMessage("Bookmarked");
    }
    updateBookmarkUi();
  } catch (err) {
    setError(err?.message || "Bookmark error");
  }
}

async function refreshData() {
  if (!STATE.currentUrl) return;
  setLoading(true, "Loading…");
  try {
    const posts = await sendBg("posts:search", null, STATE.currentUrl);
    STATE.posts = posts || [];
    STATE.bookmark = await sendBg("bookmark:get", null, STATE.currentUrl);
    renderList();
    updateBookmarkUi();
    if (!STATE.posts.length) {
      list.innerHTML = `<p class="remarkable-empty">No posts yet.</p>`;
    }
  } catch (err) {
    setError(err?.message || "Failed to load");
  } finally {
    setLoading(false);
  }
}

function setLoading(flag, msg) {
  STATE.loading = flag;
  if (flag && msg) setMessage(msg);
}

function setMessage(msg) {
  if (status) {
    status.textContent = msg;
  }
}

function setError(msg) {
  STATE.error = msg;
  if (status) {
    status.textContent = msg;
    status.classList.add("remarkable-error");
    setTimeout(() => status.classList.remove("remarkable-error"), 2000);
  }
}

function updateBookmarkUi() {
  if (!bookmarkToggle) return;
  bookmarkToggle.textContent = STATE.bookmark ? "★" : "☆";
}

function renderList() {
  if (!list) return;
  list.innerHTML = STATE.posts
    .map((item) => {
      const tags = (item.tags || []).map((tag) => `<span class="tag">${escape(tag)}</span>`).join(" ");
      const author = item.author ? `<span class=\"author\">${escape(item.author)}</span>` : "";
      const note = item.note ? `<p class=\"note\">${escape(item.note)}</p>` : "";
      return `<article class="card">
        <header>
          <span>${new Date(item.created_at || 0).toLocaleString()}</span>
          ${author}
        </header>
        ${note}
        <footer>${tags}</footer>
      </article>`;
    })
    .join("");
}

async function toggleSidebar(force) {
  ensureSidebar();
  if (typeof force === "boolean") {
    STATE.open = force;
  } else {
    STATE.open = !STATE.open;
  }
  container.style.display = STATE.open ? "block" : "none";
  if (STATE.open) {
    await sdkReady.catch(() => {});
    try {
      STATE.currentUrl = normalizeUrlFn(location.href);
    } catch (err) {
      setError(err?.message || 'Invalid URL');
      return;
    }
    await refreshData();
  }
}

async function sendBg(type, payload, urlOverride) {
  const data = await chrome.runtime.sendMessage({
    scope: "remarkable:bg",
    type,
    payload,
    url: urlOverride || STATE.currentUrl,
    href: urlOverride || STATE.currentUrl
  });
  if (!data?.ok) {
    throw new Error(data?.error || "Unknown error");
  }
  return data.value;
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "TOGGLE_SIDEBAR") {
    toggleSidebar();
  }
});

window.addEventListener("keydown", (evt) => {
  if (evt.key === "Escape" && STATE.open) {
    toggleSidebar(false);
  }
});

function getSidebarCss() {
  return `
    :host, .remarkable-shell { all: initial; }
    .remarkable-shell {
      position: fixed;
      top: 0;
      right: 0;
      height: 100vh;
      width: ${DEFAULTS.SIDEBAR_WIDTH}px;
      z-index: 2147483647;
      font-family: 'Inter', system-ui, sans-serif;
    }
    .remarkable-panel {
      background: var(--surface);
      color: var(--text);
      height: 100%;
      display: flex;
      flex-direction: column;
      border-left: 1px solid var(--border);
      box-shadow: -4px 0 16px rgba(0,0,0,0.45);
    }
    .remarkable-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      background: var(--bg);
      border-bottom: 1px solid var(--border);
    }
    .remarkable-close {
      background: transparent;
      border: none;
      color: var(--muted);
      font-size: 1.5rem;
      line-height: 1;
      padding: 0;
      cursor: pointer;
    }
    .remarkable-form {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 1rem;
      border-bottom: 1px solid var(--border);
    }
    .remarkable-actions {
      display: flex;
      gap: 0.5rem;
    }
    .remarkable-save {
      flex: 1;
    }
    .remarkable-bookmark {
      width: 3rem;
      background: var(--accent-soft);
      color: var(--accent);
      border: 1px solid var(--border);
    }
    .remarkable-status {
      min-height: 1.5rem;
      font-size: 0.8rem;
      color: var(--muted);
    }
    .remarkable-status.remarkable-error {
      color: var(--danger);
    }
    .remarkable-list {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .remarkable-empty {
      color: var(--muted);
      text-align: center;
    }
    .card {
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0.75rem;
      background: var(--bg);
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .card header {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--muted);
    }
    .card footer {
      display: flex;
      gap: 0.4rem;
      flex-wrap: wrap;
    }
    .card .tag {
      background: var(--accent-soft);
      color: var(--accent);
      padding: 0.1rem 0.4rem;
      border-radius: 999px;
      font-size: 0.7rem;
    }
    .card .note {
      font-size: 0.9rem;
    }
    .card .author {
      font-weight: 600;
      color: var(--text);
    }
  `;
}


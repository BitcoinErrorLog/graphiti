import { normalizeUrl, startRingAuth } from "./sdk.js";

const form = document.getElementById("quick-form");
const toggleBtn = document.getElementById("toggle");
const settingsBtn = document.getElementById("settings");
const signinBtn = document.getElementById("signin");
const bookmarkBtn = document.getElementById("bookmark");
const status = document.getElementById("status");

let currentUrl = null;

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabUrl = tab?.url ? normalizeUrl(tab.url) : null;
  let recentUrl = null;
  if (tab?.id) {
    try {
      recentUrl = await sendBg("recent:get", { tabId: tab.id });
    } catch (err) {
      console.warn("Failed to fetch recent URL for tab", err);
    }
  }
  if (recentUrl) {
    try {
      currentUrl = normalizeUrl(recentUrl);
    } catch (err) {
      console.warn("Failed to normalize recent URL", err);
      currentUrl = tabUrl;
    }
  } else {
    currentUrl = tabUrl;
  }
  if (!currentUrl) {
    setStatus("Unable to detect URL", true);
  } else {
    const bookmark = await sendBg("bookmark:get");
    if (bookmark) {
      bookmarkBtn.textContent = "★";
    }
  }
}

form.addEventListener("submit", async (evt) => {
  evt.preventDefault();
  if (!currentUrl) return;
  const formData = new FormData(form);
  const tags = (formData.get("tags") || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const note = formData.get("note") || "";
  try {
    setStatus("Saving…");
    await sendBg("posts:create", { url: currentUrl, tags, note });
    setStatus("Saved!");
  } catch (err) {
    setStatus(err?.message || "Failed", true);
  }
});

bookmarkBtn.addEventListener("click", async () => {
  if (!currentUrl) return;
  try {
    if (bookmarkBtn.textContent === "★") {
      await sendBg("bookmark:delete", { url: currentUrl });
      bookmarkBtn.textContent = "☆";
      setStatus("Bookmark removed");
    } else {
      const formData = new FormData(form);
      const tags = (formData.get("tags") || "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      const note = formData.get("note") || "";
      await sendBg("bookmark:create", { url: currentUrl, tags, note });
      bookmarkBtn.textContent = "★";
      setStatus("Bookmarked");
    }
  } catch (err) {
    setStatus(err?.message || "Bookmark failed", true);
  }
});

toggleBtn.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_SIDEBAR" }).catch(() => {});
  }
});

settingsBtn.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

signinBtn.addEventListener("click", async () => {
  try {
    setStatus("Opening Pubky Ring…");
    await startRingAuth({ awaitApproval: false });
    setStatus("Check the new tab for QR");
  } catch (err) {
    setStatus(err?.message || "Auth failed", true);
  }
});

function setStatus(msg, isError = false) {
  status.textContent = msg;
  status.classList.toggle("error", !!isError);
}

async function sendBg(type, payload) {
  const res = await chrome.runtime.sendMessage({ scope: "graphiti:bg", type, payload, url: currentUrl, href: currentUrl });
  if (!res?.ok) {
    throw new Error(res?.error || "Unknown error");
  }
  return res.value;
}

init();

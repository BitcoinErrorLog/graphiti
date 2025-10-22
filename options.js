import { getConfig, setConfig, startRingAuth, getSession } from "./sdk.js";

const form = document.getElementById("settings");
const signinBtn = document.getElementById("signin");
const sessionLabel = document.getElementById("session");

async function init() {
  const cfg = await getConfig();
  form.myPubkey.value = cfg.myPubkey || "";
  form.nexusUrl.value = cfg.nexusUrl || "";
  form.relay.value = cfg.relay || "";
  form.following.value = (cfg.following || []).join(",");
  form.debug.checked = !!cfg.debug;
  updateSession();
}

form.addEventListener("submit", async (evt) => {
  evt.preventDefault();
  const payload = {
    myPubkey: form.myPubkey.value.trim(),
    nexusUrl: form.nexusUrl.value.trim(),
    relay: form.relay.value.trim(),
    following: form.following.value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean),
    debug: form.debug.checked
  };
  await setConfig(payload);
  updateSession();
});

signinBtn.addEventListener("click", async () => {
  try {
    await startRingAuth();
    updateSession();
  } catch (err) {
    alert(err?.message || "Auth failed");
  }
});

async function updateSession() {
  const session = await getSession();
  if (session) {
    sessionLabel.textContent = "Signed in";
  } else {
    sessionLabel.textContent = "Not signed in";
  }
}

init();

const BACKEND_URL = "http://localhost:8000/screen-solve";

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "capture-solve") return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  try {
    // Notify content script: loading started
    await sendToContent(tab.id, { type: "loading" });

    // 1. Capture visible tab as full-res PNG data URL
    const rawDataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: "png",
    });

    // 2. Compress via offscreen document (canvas is unavailable in SW)
    const compressedDataUrl = await compressImage(rawDataUrl);

    // 3. POST to backend
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_data_url: compressedDataUrl }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`Backend returned ${res.status}`);

    const { answer, confidence, rationale } = await res.json();

    // 4. Send result to content script overlay
    await sendToContent(tab.id, {
      type: "result",
      answer,
      confidence,
      rationale,
    });
  } catch (err) {
    console.error("[CCAT] solve failed:", err);
    await sendToContent(tab.id, {
      type: "error",
      message: err.name === "AbortError" ? "Request timed out" : err.message,
    });
  }
});

// --------------- Offscreen compression helpers ---------------

async function ensureOffscreen() {
  // Wait for the offscreen document to signal it's ready
  const readyPromise = new Promise((resolve) => {
    const listener = (msg) => {
      if (msg.type === "offscreen-ready") {
        chrome.runtime.onMessage.removeListener(listener);
        resolve();
      }
    };
    chrome.runtime.onMessage.addListener(listener);
  });

  try {
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["BLOBS"],
      justification: "Downscale and compress screenshot to JPEG",
    });
    await readyPromise;
  } catch (e) {
    // Already exists — that's fine
    if (!e.message?.includes("Only a single offscreen")) throw e;
  }
}

async function compressImage(dataUrl) {
  await ensureOffscreen();

  const response = await chrome.runtime.sendMessage({
    type: "compress",
    dataUrl,
    maxWidth: 1280,
    quality: 0.7,
  });

  if (response?.error) throw new Error(response.error);
  if (!response?.dataUrl) throw new Error("Compression returned no data");
  return response.dataUrl;
}

// --------------- Content script messaging ---------------

async function sendToContent(tabId, payload) {
  try {
    await chrome.tabs.sendMessage(tabId, payload);
  } catch {
    // Content script may not be injected yet (e.g. freshly opened tab)
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
    await chrome.tabs.sendMessage(tabId, payload);
  }
}

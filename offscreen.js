// Signal to SW that the script is loaded and ready
chrome.runtime.sendMessage({ type: "offscreen-ready" });

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "compress") return false;

  const { dataUrl, maxWidth, quality } = msg;
  const img = new Image();
  img.onload = () => {
    let w = img.naturalWidth;
    let h = img.naturalHeight;

    if (w > maxWidth) {
      h = Math.round(h * (maxWidth / w));
      w = maxWidth;
    }

    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);

    canvas.convertToBlob({ type: "image/jpeg", quality }).then((blob) => {
      const reader = new FileReader();
      reader.onloadend = () => sendResponse({ dataUrl: reader.result });
      reader.readAsDataURL(blob);
    });
  };
  img.onerror = () => sendResponse({ error: "Image decode failed" });
  img.src = dataUrl;
  return true; // keep message channel open for async sendResponse
});

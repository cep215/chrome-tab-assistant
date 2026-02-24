(() => {
  const OVERLAY_ID = "__ccat_overlay";
  const AUTO_HIDE_MS = 15000;

  let hideTimer = null;

  function getOrCreateOverlay() {
    let el = document.getElementById(OVERLAY_ID);
    if (el) return el;

    el = document.createElement("div");
    el.id = OVERLAY_ID;
    Object.assign(el.style, {
      position: "fixed",
      top: "16px",
      right: "16px",
      zIndex: "2147483647",
      maxWidth: "340px",
      padding: "14px 18px",
      borderRadius: "10px",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      fontSize: "13px",
      lineHeight: "1.45",
      color: "#e2e8f0",
      background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)",
      transition: "opacity 0.25s ease",
      opacity: "0",
      pointerEvents: "auto",
    });

    // Close button
    const close = document.createElement("span");
    close.textContent = "\u00d7";
    Object.assign(close.style, {
      position: "absolute",
      top: "6px",
      right: "10px",
      cursor: "pointer",
      fontSize: "18px",
      color: "#94a3b8",
      lineHeight: "1",
    });
    close.addEventListener("click", () => dismissOverlay());
    el.appendChild(close);

    document.documentElement.appendChild(el);
    return el;
  }

  function showOverlay(html) {
    const el = getOrCreateOverlay();
    // Keep close button, replace rest
    const close = el.firstChild;
    el.innerHTML = "";
    el.appendChild(close);

    const body = document.createElement("div");
    body.innerHTML = html;
    el.appendChild(body);

    // Fade in
    requestAnimationFrame(() => { el.style.opacity = "1"; });

    // Auto-dismiss
    clearTimeout(hideTimer);
    hideTimer = setTimeout(dismissOverlay, AUTO_HIDE_MS);
  }

  function dismissOverlay() {
    const el = document.getElementById(OVERLAY_ID);
    if (!el) return;
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 300);
    clearTimeout(hideTimer);
  }

  // ----- Message handler -----

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "loading") {
      showOverlay(`
        <div style="display:flex;align-items:center;gap:8px">
          <span style="display:inline-block;width:14px;height:14px;border:2px solid #60a5fa;border-top-color:transparent;border-radius:50%;animation:__ccat_spin .6s linear infinite"></span>
          <span style="color:#93c5fd">Solving&hellip;</span>
        </div>
        <style>@keyframes __ccat_spin{to{transform:rotate(360deg)}}</style>
      `);
      return;
    }

    if (msg.type === "result") {
      const conf = Math.round((msg.confidence ?? 0) * 100);
      const barColor = conf >= 80 ? "#34d399" : conf >= 50 ? "#fbbf24" : "#f87171";
      showOverlay(`
        <div style="font-weight:600;font-size:15px;margin-bottom:6px;color:#f1f5f9">
          ${escHtml(msg.answer)}
        </div>
        <div style="margin-bottom:6px">
          <div style="display:flex;justify-content:space-between;font-size:11px;color:#94a3b8;margin-bottom:2px">
            <span>Confidence</span><span>${conf}%</span>
          </div>
          <div style="height:4px;border-radius:2px;background:#334155">
            <div style="width:${conf}%;height:100%;border-radius:2px;background:${barColor};transition:width .3s"></div>
          </div>
        </div>
        ${msg.rationale ? `<div style="font-size:12px;color:#94a3b8">${escHtml(msg.rationale)}</div>` : ""}
      `);
      return;
    }

    if (msg.type === "error") {
      showOverlay(`
        <div style="color:#f87171;font-weight:600">Error</div>
        <div style="color:#fca5a5;font-size:12px;margin-top:4px">${escHtml(msg.message)}</div>
      `);
    }
  });

  function escHtml(str) {
    const d = document.createElement("div");
    d.textContent = str ?? "";
    return d.innerHTML;
  }
})();

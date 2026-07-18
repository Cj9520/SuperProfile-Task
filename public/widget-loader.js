// SuperProfile Widget Loader
// Embeddable via: <script src="/widget-loader.js" data-widget-token="your_token"></script>
(function () {
  "use strict";

  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName("script");
    return scripts[scripts.length - 1];
  })();

  var token = script.getAttribute("data-widget-token");
  if (!token) {
    console.warn("[SuperProfile] data-widget-token is required");
    return;
  }

  var BASE_URL = script.src.replace("/widget-loader.js", "");

  // Create iframe container
  var container = document.createElement("div");
  container.id = "superprofile-widget-root";
  container.style.cssText = [
    "position:fixed",
    "bottom:20px",
    "right:20px",
    "z-index:999999",
    "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  ].join(";");
  document.body.appendChild(container);

  // State
  var isOpen = false;
  var iframe = null;
  var bubble = null;
  var unreadCount = 0;

  // Create launcher bubble
  bubble = document.createElement("button");
  bubble.id = "sp-launcher";
  bubble.setAttribute("aria-label", "Open chat");
  bubble.style.cssText = [
    "width:60px",
    "height:60px",
    "border-radius:50%",
    "background:#141416",
    "border:none",
    "cursor:pointer",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "box-shadow:0 8px 32px rgba(0,0,0,0.45)",
    "transition:transform 0.2s ease,box-shadow 0.2s ease",
    "outline:none",
    "position:relative",
  ].join(";");

  bubble.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';

  bubble.addEventListener("mouseenter", function () {
    bubble.style.transform = "scale(1.08)";
    bubble.style.boxShadow = "0 12px 40px rgba(0,0,0,0.55)";
  });
  bubble.addEventListener("mouseleave", function () {
    bubble.style.transform = "scale(1)";
    bubble.style.boxShadow = "0 8px 32px rgba(0,0,0,0.45)";
  });

  // Unread badge
  var badge = document.createElement("span");
  badge.id = "sp-badge";
  badge.style.cssText = [
    "position:absolute",
    "top:-4px",
    "right:-4px",
    "background:#ef4444",
    "color:white",
    "border-radius:50%",
    "width:18px",
    "height:18px",
    "font-size:10px",
    "font-weight:700",
    "display:none",
    "align-items:center",
    "justify-content:center",
    "border:2px solid white",
  ].join(";");
  bubble.appendChild(badge);
  container.appendChild(bubble);

  // Create iframe
  iframe = document.createElement("iframe");
  iframe.id = "sp-iframe";
  iframe.src = BASE_URL + "/widget?token=" + token;
  iframe.style.cssText = [
    "position:absolute",
    "bottom:72px",
    "right:0",
    "width:380px",
    "height:560px",
    "border:none",
    "border-radius:16px",
    "box-shadow:0 24px 64px rgba(0,0,0,0.2)",
    "display:none",
    "transition:opacity 0.2s ease,transform 0.2s ease",
    "opacity:0",
    "transform:translateY(16px) scale(0.96)",
    "background:white",
  ].join(";");
  iframe.setAttribute("title", "SuperProfile Customer Support");
  iframe.setAttribute("allow", "microphone; camera");
  container.appendChild(iframe);

  // Toggle chat
  function toggleChat() {
    isOpen = !isOpen;
    if (isOpen) {
      iframe.style.display = "block";
      setTimeout(function () {
        iframe.style.opacity = "1";
        iframe.style.transform = "translateY(0) scale(1)";
      }, 10);
      bubble.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
      // Reset unread
      unreadCount = 0;
      badge.style.display = "none";
    } else {
      iframe.style.opacity = "0";
      iframe.style.transform = "translateY(16px) scale(0.96)";
      setTimeout(function () { iframe.style.display = "none"; }, 200);
      bubble.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
    }
  }

  bubble.addEventListener("click", toggleChat);

  // Listen for messages from the widget iframe
  window.addEventListener("message", function (e) {
    if (!e.data || e.data.source !== "superprofile-widget") return;

    if (e.data.type === "new-message" && !isOpen) {
      unreadCount++;
      badge.textContent = unreadCount > 9 ? "9+" : unreadCount;
      badge.style.display = "flex";
    }

    if (e.data.type === "close") {
      if (isOpen) toggleChat();
    }

    if (e.data.type === "open") {
      if (!isOpen) toggleChat();
    }
  });

  // Expose global API
  window.SuperProfile = {
    open: function () { if (!isOpen) toggleChat(); },
    close: function () { if (isOpen) toggleChat(); },
    toggle: toggleChat,
  };
})();

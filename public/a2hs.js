let deferredPrompt = null;

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isInStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;

  const btn = document.getElementById("a2hs-btn");
  if (btn) btn.style.display = "block";
});

window.addEventListener("load", () => {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js");
  }

  const iosBanner = document.getElementById("ios-a2hs");
  if (iosBanner && isIos() && !isInStandaloneMode()) {
    iosBanner.style.display = "block";
  }

  if (isInStandaloneMode()) {
    const btn = document.getElementById("a2hs-btn");
    const ios = document.getElementById("ios-a2hs");
    if (btn) btn.style.display = "none";
    if (ios) ios.style.display = "none";
  }
});

async function handleInstallClick() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;

  const btn = document.getElementById("a2hs-btn");
  if (btn) btn.style.display = "none";
}

window.handleInstallClick = handleInstallClick;

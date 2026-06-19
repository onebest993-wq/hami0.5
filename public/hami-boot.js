/**
 * Hami boot script — externalized for strict CSP (no inline script-src).
 */
(function () {
  window.removeLoader = function () {
    var loader = document.getElementById('loading-overlay');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(function () {
        loader.remove();
      }, 500);
    }
  };

  window.onerror = function (msg, url, line) {
    var loader = document.getElementById('loading-overlay');
    if (loader) {
      while (loader.firstChild) loader.removeChild(loader.firstChild);
      var h1 = document.createElement('h1');
      h1.style.color = 'red';
      h1.textContent = 'System Error';
      var pre = document.createElement('pre');
      pre.style.color = 'white';
      pre.style.textAlign = 'left';
      pre.style.background = '#111';
      pre.style.padding = '10px';
      var lines = [];
      if (msg != null) lines.push(String(msg));
      if (url != null) lines.push(String(url));
      if (line != null) lines.push(String(line));
      pre.textContent = lines.join('\n');
      var btn = document.createElement('button');
      btn.textContent = 'Reload';
      btn.onclick = function () {
        location.reload();
      };
      loader.appendChild(h1);
      loader.appendChild(pre);
      loader.appendChild(btn);
    }
  };

  window.addEventListener('pageshow', function () {
    if (typeof window.removeLoader === 'function') window.removeLoader();
  });

  setTimeout(function () {
    if (typeof window.removeLoader === 'function') {
      window.removeLoader();
      return;
    }
    var loader = document.getElementById('loading-overlay');
    if (loader && loader.parentNode) {
      loader.style.opacity = '0';
      loader.style.transition = 'opacity 0.5s';
      setTimeout(function () {
        loader.remove();
      }, 500);
    }
  }, 12000);
})();

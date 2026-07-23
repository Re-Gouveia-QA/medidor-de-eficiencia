(function () {
  var el = document.querySelector('[data-started-at]');
  if (!el) return;

  var startedAt = new Date(el.getAttribute('data-started-at')).getTime();

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function formatElapsed(ms) {
    var totalMin = Math.max(0, Math.floor(ms / 60000));
    var h = Math.floor(totalMin / 60);
    var m = totalMin % 60;
    return pad(h) + ':' + pad(m);
  }

  function tick() {
    el.textContent = formatElapsed(Date.now() - startedAt);
  }

  tick();
  setInterval(tick, 1000);
})();

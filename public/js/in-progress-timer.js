(function () {
  var el = document.querySelector('[data-started-at]');
  if (!el) return;

  var startedAt = new Date(el.getAttribute('data-started-at')).getTime();

  function formatElapsed(ms) {
    var totalSec = Math.max(0, Math.floor(ms / 1000));
    var h = Math.floor(totalSec / 3600);
    var m = Math.floor((totalSec % 3600) / 60);
    var s = totalSec % 60;
    if (h > 0) return h + 'h ' + m + 'min';
    if (m > 0) return m + 'min ' + s + 's';
    return s + 's';
  }

  function tick() {
    el.textContent = formatElapsed(Date.now() - startedAt);
  }

  tick();
  setInterval(tick, 1000);
})();

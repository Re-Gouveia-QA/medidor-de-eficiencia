(function () {
  var btn = document.getElementById('navToggle');
  var panel = document.getElementById('topbarActions');
  if (!btn || !panel) return;

  function close() {
    panel.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
  }

  function open() {
    panel.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
  }

  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (panel.classList.contains('is-open')) {
      close();
    } else {
      open();
    }
  });

  document.addEventListener('click', function (e) {
    if (panel.classList.contains('is-open') && !panel.contains(e.target) && e.target !== btn) {
      close();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && panel.classList.contains('is-open')) {
      close();
      btn.focus();
    }
  });
})();

(function () {
  var btn = document.getElementById('designToggle');
  if (!btn) return;

  btn.addEventListener('click', function () {
    var isSketch = document.documentElement.getAttribute('data-design') === 'sketch';
    if (isSketch) {
      document.documentElement.removeAttribute('data-design');
    } else {
      document.documentElement.setAttribute('data-design', 'sketch');
    }
    btn.setAttribute('aria-pressed', String(!isSketch));
    // Cookie (não localStorage) é o que o servidor lê para renderizar o <html> já no modo certo
    // na próxima navegação — mesmo padrão do cookie "theme" (evita flash/reversão ao trocar de página).
    document.cookie = 'design=' + (isSketch ? 'minimal' : 'sketch') + '; path=/; max-age=31536000; samesite=lax';
  });
})();

(function () {
  var btn = document.getElementById('themeToggle');
  if (!btn) return;

  btn.addEventListener('click', function () {
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    // Cookie (não localStorage) é o que o servidor lê para renderizar o <html> já no tema certo
    // na próxima navegação — evita qualquer flash/reversão de tema ao trocar de página.
    document.cookie = 'theme=' + (isDark ? 'light' : 'dark') + '; path=/; max-age=31536000; samesite=lax';
  });
})();

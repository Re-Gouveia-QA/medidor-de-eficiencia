(function () {
  var btn = document.getElementById('localeToggle');
  if (!btn) return;

  btn.addEventListener('click', function () {
    var next = btn.getAttribute('data-next-locale');
    if (!next) return;
    // Cookie (lido no servidor em app.ts) é quem decide o idioma renderizado — diferente do tema
    // (só CSS), o texto traduzido vem do servidor, então precisa recarregar a página.
    document.cookie = 'locale=' + next + '; path=/; max-age=31536000; samesite=lax';
    window.location.reload();
  });
})();

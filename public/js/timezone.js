(function () {
  var tz;
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (e) {
    return; // navegador sem suporte a Intl.DateTimeFormat — mantém o fuso padrão do servidor (UTC)
  }
  if (!tz) return;

  var match = document.cookie.split(';').map(function (p) { return p.trim(); }).find(function (p) {
    return p.indexOf('tz=') === 0;
  });
  var current = match ? decodeURIComponent(match.slice('tz='.length)) : '';
  if (current === tz) return; // já está correto — evita reescrever o cookie a cada navegação

  // Cookie (não localStorage) é o que o servidor lê para converter/exibir horários no fuso certo
  // (RNF05), mesmo padrão do cookie "theme".
  document.cookie = 'tz=' + encodeURIComponent(tz) + '; path=/; max-age=31536000; samesite=lax';
})();

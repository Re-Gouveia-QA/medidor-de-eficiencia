(function () {
  document.querySelectorAll('.js-back').forEach(function (btn) {
    btn.addEventListener('click', function (event) {
      // Só usa o histórico do navegador quando ele realmente veio de OUTRA página. Sem essa checagem,
      // ações que recarregam a página atual (ex.: o formulário de filtro em /activities, que faz um
      // GET com querystring) empilham uma entrada de histórico "de si mesma", e o botão Voltar passa
      // a levar de volta pro filtro anterior em vez do menu/listagem — daí o href fixo do servidor
      // continua sendo o fallback correto nesse caso.
      if (!document.referrer || window.history.length <= 1) return;

      try {
        var referrer = new URL(document.referrer);
        if (referrer.origin === window.location.origin && referrer.pathname !== window.location.pathname) {
          event.preventDefault();
          window.history.back();
        }
      } catch (e) {
        /* referrer inválido — usa o href padrão calculado no servidor */
      }
    });
  });
})();

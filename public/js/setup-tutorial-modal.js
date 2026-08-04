(function () {
  var modal = document.getElementById('setupTutorialModal');
  if (!modal) return;

  var closeBtn = modal.querySelector('.setup-tutorial-modal-close');
  var dismissBtn = modal.querySelector('.setup-tutorial-modal-dismiss');
  var primaryLink = document.getElementById('setupTutorialPrimaryButton');

  function markSeen() {
    document.cookie = 'setupTutorialSeen=1; path=/; max-age=31536000; samesite=lax';
  }

  function hide() {
    modal.classList.remove('is-visible');
  }

  // A decisao de mostrar ja foi tomada no servidor (categorias.length === 0 && !setupTutorialSeen)
  // -- diferente do activity-detail-modal, nao ha trigger de clique aqui.
  modal.classList.add('is-visible');
  closeBtn.focus();

  closeBtn.addEventListener('click', function () {
    markSeen();
    hide();
  });
  dismissBtn.addEventListener('click', function () {
    markSeen();
    hide();
  });
  // Navegacao real pro link "Ver modelos" -- grava o cookie antes de sair da pagina, senao voltar
  // da tela de modelos sem aplicar nenhum preset faria o modal reaparecer.
  primaryLink.addEventListener('click', markSeen);

  document.addEventListener('click', function (event) {
    if (event.target === modal) {
      markSeen();
      hide();
    }
  });

  document.addEventListener('keydown', function (event) {
    if (!modal.classList.contains('is-visible')) return;
    if (event.key === 'Escape') {
      markSeen();
      hide();
    }
  });
})();

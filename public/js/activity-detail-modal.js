(function () {
  var modal = document.getElementById('activityDetailModal');
  if (!modal) return;

  var body = modal.querySelector('.activity-detail-body');
  var closeBtn = modal.querySelector('.activity-detail-modal-close');
  var trigger = null;

  function hide() {
    modal.classList.remove('is-visible');
    body.innerHTML = '';
    if (trigger) {
      trigger.focus();
      trigger = null;
    }
  }

  function show(fromTrigger, template) {
    trigger = fromTrigger;
    body.innerHTML = '';
    body.appendChild(template.content.cloneNode(true));
    modal.classList.add('is-visible');
    closeBtn.focus();
  }

  document.addEventListener('click', function (event) {
    var viewBtn = event.target.closest('.js-view-activity-details');
    if (viewBtn) {
      var item = viewBtn.closest('.list-item');
      var template = item && item.querySelector('.activity-detail-template');
      if (template) show(viewBtn, template);
      return;
    }
    // Clique no scrim (fora do card) fecha — mesmo evento de clique, checando o alvo exato.
    if (event.target === modal) hide();
  });

  closeBtn.addEventListener('click', hide);

  // Trap de foco: o corpo clonado é só leitura (sem botões/links), então o único elemento
  // focável dentro do modal é o botão de fechar — Tab/Shift+Tab sempre voltam pra ele, mesma
  // ideia do confirm-submit.js (mas lá com 2 botões fixos, aqui só 1).
  document.addEventListener('keydown', function (event) {
    if (!modal.classList.contains('is-visible')) return;

    if (event.key === 'Escape') {
      hide();
      return;
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      closeBtn.focus();
    }
  });
})();

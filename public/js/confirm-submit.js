(function () {
  var toast = document.getElementById('confirmToast');
  if (!toast) return;

  var messageEl = toast.querySelector('.confirm-toast-message');
  var cancelBtn = toast.querySelector('.confirm-toast-cancel');
  var confirmBtn = toast.querySelector('.confirm-toast-confirm');
  var pendingForm = null;
  var trigger = null;

  function hide() {
    toast.classList.remove('is-visible');
    pendingForm = null;
    if (trigger) {
      trigger.focus();
      trigger = null;
    }
  }

  document.addEventListener('submit', function (event) {
    var form = event.target.closest('.js-confirm-submit');
    if (!form) return;
    event.preventDefault();
    pendingForm = form;
    trigger = document.activeElement;
    messageEl.textContent = form.dataset.confirm || toast.dataset.defaultMessage || 'Confirma esta ação?';
    toast.classList.add('is-visible');
    confirmBtn.focus();
  });

  cancelBtn.addEventListener('click', hide);

  confirmBtn.addEventListener('click', function () {
    var form = pendingForm;
    toast.classList.remove('is-visible');
    pendingForm = null;
    trigger = null;
    // form.submit() (ao contrário de form.requestSubmit()) não dispara o evento "submit",
    // então não reentra neste mesmo listener.
    if (form) HTMLFormElement.prototype.submit.call(form);
  });

  // Trap de foco: com o toast aberto (aria-modal="true"), Tab/Shift+Tab devem circular só entre
  // os dois botões do toast — sem isso, o foco escaparia pro resto da página "por baixo" dela.
  document.addEventListener('keydown', function (event) {
    if (!toast.classList.contains('is-visible')) return;

    if (event.key === 'Escape') {
      hide();
      return;
    }

    if (event.key === 'Tab') {
      var focusable = [cancelBtn, confirmBtn];
      var currentIndex = focusable.indexOf(document.activeElement);
      var nextIndex = event.shiftKey
        ? (currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1)
        : (currentIndex === focusable.length - 1 ? 0 : currentIndex + 1);
      event.preventDefault();
      focusable[nextIndex].focus();
    }
  });
})();

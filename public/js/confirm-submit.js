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
    messageEl.textContent = form.dataset.confirm || 'Confirma esta ação?';
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

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && toast.classList.contains('is-visible')) hide();
  });
})();

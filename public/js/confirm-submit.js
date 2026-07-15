(function () {
  document.addEventListener('submit', function (event) {
    var form = event.target.closest('.js-confirm-submit');
    if (form && !window.confirm(form.dataset.confirm || 'Confirma esta ação?')) {
      event.preventDefault();
    }
  });
})();

(function () {
  var form = document.getElementById('activityForm');
  var categorySelect = document.getElementById('categoryId');
  var horaInicio = document.getElementById('horaInicio');
  var horaFim = document.getElementById('horaFim');
  var valorField = document.getElementById('valorField');
  var valorInput = document.getElementById('valor');
  var valorLabelText = document.getElementById('valorLabelText');
  if (!form || !categorySelect || !horaInicio || !horaFim || !valorField || !valorInput || !valorLabelText) return;

  var isEditing = form.dataset.editing === 'true';

  function selectedOption() {
    return categorySelect.options[categorySelect.selectedIndex];
  }

  function addMinutes(hhmm, minutes) {
    var parts = hhmm.split(':').map(Number);
    var total = parts[0] * 60 + parts[1] + minutes;
    total = ((total % 1440) + 1440) % 1440;
    var h = Math.floor(total / 60).toString().padStart(2, '0');
    var m = (total % 60).toString().padStart(2, '0');
    return h + ':' + m;
  }

  function applyCategoryDefaults() {
    var opt = selectedOption();
    if (!opt) return;

    var duracaoPadraoMin = opt.getAttribute('data-duracao-padrao-min');
    if (duracaoPadraoMin && horaInicio.value && !horaFim.value) {
      horaFim.value = addMinutes(horaInicio.value, Number(duracaoPadraoMin));
    }

    var possuiValor = opt.getAttribute('data-possui-valor') === 'true';
    valorField.classList.toggle('hidden', !possuiValor);
    valorLabelText.textContent = opt.getAttribute('data-valor-label') || valorLabelText.textContent;
    if (possuiValor && !isEditing && !valorInput.value) {
      var valorPadrao = opt.getAttribute('data-valor-padrao');
      if (valorPadrao) valorInput.value = valorPadrao;
    }
  }

  categorySelect.addEventListener('change', applyCategoryDefaults);
  horaInicio.addEventListener('change', function () {
    if (!horaFim.value) applyCategoryDefaults();
  });

  applyCategoryDefaults();
})();

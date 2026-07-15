(function () {
  var checkbox = document.getElementById('possuiValor');
  var fields = document.getElementById('valorFields');
  if (!checkbox || !fields) return;

  checkbox.addEventListener('change', function () {
    fields.classList.toggle('hidden', !checkbox.checked);
  });
})();

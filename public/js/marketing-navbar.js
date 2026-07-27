(function () {
  var topbar = document.querySelector('.marketing-topbar');
  if (!topbar) return;

  // Pequena margem (não 0) — evita a classe "piscar" ligada/desligada bem no topo da página por
  // causa de scroll de 1-2px (bounce do trackpad/mobile, barra de endereço recolhendo etc.).
  var THRESHOLD = 12;

  function update() {
    topbar.classList.toggle('is-scrolled', window.scrollY > THRESHOLD);
  }

  window.addEventListener('scroll', update, { passive: true });
  update();
})();

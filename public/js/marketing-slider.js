(function () {
  var grid = document.querySelector('.marketing-usecases-grid');
  var prevBtn = document.querySelector('.marketing-slider-prev');
  var nextBtn = document.querySelector('.marketing-slider-next');
  if (!grid || !prevBtn || !nextBtn) return;

  var cards = grid.querySelectorAll('.marketing-usecase');

  // Avança um card por vez (largura real do card + gap), não uma página inteira do carrossel —
  // mede no DOM em vez de fixar 280px no JS pra não duplicar o valor já definido em styles.css.
  function step() {
    var card = grid.querySelector('.marketing-usecase');
    if (!card) return grid.clientWidth;
    var gap = parseFloat(window.getComputedStyle(grid).columnGap) || 0;
    return card.getBoundingClientRect().width + gap;
  }

  function updateButtons() {
    var maxScroll = grid.scrollWidth - grid.clientWidth;
    prevBtn.disabled = grid.scrollLeft <= 4;
    nextBtn.disabled = grid.scrollLeft >= maxScroll - 4;
  }

  // Efeito "coverflow" (carrossel 3D): cada card gira em torno do eixo Y proporcionalmente à
  // distância do seu centro até o centro do carrossel — perto do centro fica quase reto, nas
  // bordas inclina "pra longe" (rotateY) e recua um pouco (translateZ/scale), como uma parede
  // curva em 3D. O perspective() fica só no container (.marketing-usecases-grid, CSS), não
  // repetido em cada card — assim todos os cards compartilham o mesmo ponto de fuga, em vez de
  // cada um ter sua própria perspectiva isolada (o que pareceria "errado", cada card girando em
  // torno de si mesmo em vez de se comportar como parte de uma cena única).
  var MAX_ROTATE_DEG = 28;
  var raf = null;

  function apply3D() {
    raf = null;
    var rect = grid.getBoundingClientRect();
    var centerX = rect.left + rect.width / 2;
    cards.forEach(function (card) {
      var cardRect = card.getBoundingClientRect();
      var cardCenterX = cardRect.left + cardRect.width / 2;
      var offset = (cardCenterX - centerX) / (rect.width / 2);
      var clamped = Math.max(-1, Math.min(1, offset));
      var rotateY = clamped * -MAX_ROTATE_DEG;
      var depth = Math.abs(clamped);
      var scale = 1 - depth * 0.12;
      var translateZ = -depth * 70;
      card.style.transform =
        'rotateY(' + rotateY.toFixed(2) + 'deg) scale(' + scale.toFixed(3) + ') translateZ(' + translateZ.toFixed(1) + 'px)';
      card.style.opacity = String((1 - depth * 0.35).toFixed(2));
    });
  }

  function scheduleApply3D() {
    if (raf !== null) return;
    raf = window.requestAnimationFrame(apply3D);
  }

  prevBtn.addEventListener('click', function () {
    grid.scrollBy({ left: -step(), behavior: 'smooth' });
  });
  nextBtn.addEventListener('click', function () {
    grid.scrollBy({ left: step(), behavior: 'smooth' });
  });
  grid.addEventListener(
    'scroll',
    function () {
      updateButtons();
      scheduleApply3D();
    },
    { passive: true }
  );
  window.addEventListener('resize', scheduleApply3D);
  updateButtons();
  apply3D();
})();

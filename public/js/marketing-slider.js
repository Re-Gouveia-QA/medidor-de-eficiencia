(function () {
  var grid = document.querySelector('.marketing-usecases-grid');
  var prevBtn = document.querySelector('.marketing-slider-prev');
  var nextBtn = document.querySelector('.marketing-slider-next');
  if (!grid || !prevBtn || !nextBtn) return;

  var cards = grid.querySelectorAll('.marketing-usecase');
  var cardsArr = Array.prototype.slice.call(cards);

  // Alvo de scroll exato do centro de um card (mesmo cálculo que scroll-snap-align:center faz
  // internamente). Setas usavam scrollBy(largura do card + gap) — uma aproximação que quase nunca
  // batia exatamente com o ponto de snap real do CSS (scroll-snap-type: x mandatory), então ao fim
  // da rolagem suave do JS o navegador ainda precisava fazer uma segunda correção pro snap point
  // verdadeiro, visível como um engasgo (a rolagem parava e "pulava" de novo logo em seguida,
  // mais perceptível ao voltar). Rolar direto pro alvo exato do card elimina essa segunda correção.
  function cardTarget(card) {
    var target = card.offsetLeft + card.offsetWidth / 2 - grid.clientWidth / 2;
    var maxScroll = grid.scrollWidth - grid.clientWidth;
    return Math.max(0, Math.min(maxScroll, target));
  }

  function closestIndex() {
    var current = grid.scrollLeft;
    var closest = 0;
    var closestDist = Infinity;
    cardsArr.forEach(function (card, i) {
      var dist = Math.abs(cardTarget(card) - current);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    });
    return closest;
  }

  // Mesmo mirando o centro exato do card, scroll-snap-type: mandatory ainda "brigava" com o
  // scrollTo(smooth) das setas: perto do fim da rolagem o navegador reavaliava o snap por conta
  // própria e aplicava uma segunda correção (o engasgo em si — a rolagem parava e "pulava" de
  // novo). Desligar o snap enquanto a rolagem das setas está em andamento, e religar só quando ela
  // termina (evento nativo scrollend), remove essa segunda correção sem afetar o snap do gesto de
  // arrastar/rolar manual, que continua mandatory normalmente.
  function goTo(index) {
    var clamped = Math.max(0, Math.min(cardsArr.length - 1, index));
    grid.style.scrollSnapType = 'none';
    grid.scrollTo({ left: cardTarget(cardsArr[clamped]), behavior: 'smooth' });
  }
  grid.addEventListener('scrollend', function () {
    grid.style.scrollSnapType = '';
  });

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
    goTo(closestIndex() - 1);
  });
  nextBtn.addEventListener('click', function () {
    goTo(closestIndex() + 1);
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

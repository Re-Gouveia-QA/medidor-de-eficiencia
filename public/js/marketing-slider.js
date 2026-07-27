(function () {
  var grid = document.querySelector('.marketing-usecases-grid');
  var prevBtn = document.querySelector('.marketing-slider-prev');
  var nextBtn = document.querySelector('.marketing-slider-next');
  if (!grid || !prevBtn || !nextBtn) return;

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

  prevBtn.addEventListener('click', function () {
    grid.scrollBy({ left: -step(), behavior: 'smooth' });
  });
  nextBtn.addEventListener('click', function () {
    grid.scrollBy({ left: step(), behavior: 'smooth' });
  });
  grid.addEventListener('scroll', updateButtons, { passive: true });
  window.addEventListener('resize', updateButtons);
  updateButtons();
})();

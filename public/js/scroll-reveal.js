(function () {
  var targets = document.querySelectorAll('[data-scroll-reveal]');
  if (!targets.length) return;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Sem suporte a IntersectionObserver, ou com prefers-reduced-motion: só torna tudo visível na
  // hora, sem depender de scroll nem animar — nunca deixa conteúdo escondido esperando um scroll
  // que talvez não aconteça (ex.: usuário chega direto no meio da página via link ancorado).
  if (reduceMotion || !('IntersectionObserver' in window)) {
    for (var i = 0; i < targets.length; i++) targets[i].classList.remove('scroll-reveal');
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        // Troca a classe "escondida" (opacity: 0) pela mesma animação de entrada já usada no
        // resto do app (sketch-in) — reaproveita o mecanismo, só muda o gatilho de carregamento
        // da página pra interseção com a viewport.
        entry.target.classList.remove('scroll-reveal');
        entry.target.classList.add('sketch-in');
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.15 },
  );

  for (var i = 0; i < targets.length; i++) observer.observe(targets[i]);
})();

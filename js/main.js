/* Bientôt Étudiant — menu mobile + révélation au scroll */
(function () {
  // Menu mobile
  const b = document.getElementById("burger");
  const m = document.getElementById("menu");
  if (b && m) {
    b.addEventListener("click", function () {
      m.classList.toggle("open");
      b.textContent = m.classList.contains("open") ? "✕" : "☰";
    });
    m.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        m.classList.remove("open");
        b.textContent = "☰";
      });
    });
  }

  // Révélation au scroll
  const reveals = document.querySelectorAll(".reveal");
  if (reveals.length) {
    const obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); obs.unobserve(e.target); }
      });
    }, { threshold: .12 });
    reveals.forEach(function (el) { obs.observe(el); });
  }
})();

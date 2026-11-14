// Home: cliccando una copertina sfocata si apre il popup con le istruzioni.
(function () {
  var modal = document.querySelector(".modal");
  if (!modal) return;
  var fileLabel = modal.querySelector(".modal-file");

  document.querySelectorAll("[data-locked]").forEach(function (card) {
    card.addEventListener("click", function () {
      var title = card.getAttribute("data-locked");
      fileLabel.textContent = title;
      if (typeof modal.showModal === "function") modal.showModal();
      else modal.setAttribute("open", "");
      if (window.plausible) window.plausible("Contenuto bloccato", { props: { file: title } });
    });
  });

  function close() {
    if (typeof modal.close === "function") modal.close();
    else modal.removeAttribute("open");
  }
  modal.querySelector("[data-close]").addEventListener("click", close);
  // clic sullo sfondo scuro
  modal.addEventListener("click", function (e) {
    if (e.target === modal) close();
  });
})();

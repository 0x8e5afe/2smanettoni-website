// Home: le copertine sfocate aprono il popup con le istruzioni.
// Se su questo browser è già stato aperto il link con l'id, la card è sbloccata e porta alla pagina.
(function () {
  var modal = document.querySelector(".modal");
  var fileLabel = modal && modal.querySelector(".modal-file");

  var unlocked = {};
  try {
    var saved = JSON.parse(localStorage.getItem("2sm-unlocked") || "{}");
    if (saved && typeof saved === "object") unlocked = saved;
  } catch (e) { /* storage non disponibile: tutto resta bloccato */ }
  var validId = /^[A-Za-z0-9_-]{22}$/;

  document.querySelectorAll("[data-locked]").forEach(function (card) {
    var slug = card.getAttribute("data-slug");
    var id = unlocked[slug];

    if (typeof id === "string" && validId.test(id)) {
      var page = "p/" + id + "/";
      var img = card.querySelector(".thumb img");
      var clear = new Image();
      // Si sblocca solo se la copertina nitida esiste davvero (id ancora valido).
      clear.onload = function () {
        img.src = clear.src;
        card.classList.add("unlocked");
        card.setAttribute("aria-label", card.getAttribute("data-locked") + " · apri e scarica");
        card.addEventListener("click", function (e) {
          e.stopImmediatePropagation();
          location.href = page;
        }, true);
      };
      clear.src = page + "cover.jpg";
    }

    card.addEventListener("click", function () {
      if (card.classList.contains("unlocked") || !modal) return;
      var title = card.getAttribute("data-locked");
      fileLabel.textContent = title;
      if (typeof modal.showModal === "function") modal.showModal();
      else modal.setAttribute("open", "");
      if (window.plausible) window.plausible("Contenuto bloccato", { props: { file: title } });
    });
  });

  if (!modal) return;
  function close() {
    if (typeof modal.close === "function") modal.close();
    else modal.removeAttribute("open");
  }
  modal.querySelector("[data-close]").addEventListener("click", close);
  modal.addEventListener("click", function (e) {
    if (e.target === modal) close();
  });
})();

// Anteprima del PDF: la prima pagina è già un'immagine; pdf.js disegna le altre.
(function () {
  var box = document.querySelector(".pages[data-pdf]");

  // Chi apre il link con l'id ritrova il contenuto sbloccato anche dalla home (solo su questo browser).
  var slug = document.body.getAttribute("data-slug");
  var id = document.body.getAttribute("data-id");
  if (slug && id) {
    try {
      var saved = JSON.parse(localStorage.getItem("2sm-unlocked") || "{}");
      if (!saved || typeof saved !== "object") saved = {};
      saved[slug] = id;
      localStorage.setItem("2sm-unlocked", JSON.stringify(saved));
    } catch (e) { /* navigazione privata o storage bloccato: pazienza */ }
  }

  // Plausible: conta i download come evento "Download" con il nome del file.
  document.querySelectorAll("a[download]").forEach(function (a) {
    a.addEventListener("click", function () {
      if (window.plausible) window.plausible("Download", { props: { file: a.getAttribute("href").split("/").pop() } });
    });
  });

  // Bottone fisso in basso sul telefono, quando quello principale esce dallo schermo.
  var main = document.querySelector(".info .btn-main");
  var sticky = document.querySelector(".sticky-dl");
  if (main && sticky && "IntersectionObserver" in window) {
    new IntersectionObserver(function (e) {
      sticky.classList.toggle("show", !e[0].isIntersecting && e[0].boundingClientRect.top < 0);
    }).observe(main);
  }

  if (!box || !window.pdfjsLib) return;
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  var MAX = 30; // oltre, basta l'anteprima delle prime pagine
  pdfjsLib.getDocument(box.getAttribute("data-pdf")).promise.then(function (pdf) {
    var n = Math.min(pdf.numPages, MAX);
    var width = box.clientWidth - 8;
    var ratio = Math.min(window.devicePixelRatio || 1, 2);
    var figs = [box.querySelector(".page")];
    for (var i = 2; i <= n; i++) {
      var f = document.createElement("figure");
      f.className = "page";
      f.style.aspectRatio = "595 / 842";
      box.appendChild(f);
      figs.push(f);
    }
    // Segnaposto con le proporzioni reali della prima pagina (non solo A4).
    pdf.getPage(1).then(function (p1) {
      var v = p1.getViewport({ scale: 1 });
      figs.slice(1).forEach(function (f) { if (!f.firstChild) f.style.aspectRatio = v.width + " / " + v.height; });
    });
    if (pdf.numPages > MAX) {
      var more = document.createElement("p");
      more.className = "page-label";
      more.textContent = "…e altre " + (pdf.numPages - MAX) + " pagine nel PDF";
      box.appendChild(more);
    }

    function render(idx) {
      return pdf.getPage(idx).then(function (page) {
        var v1 = page.getViewport({ scale: 1 });
        var vp = page.getViewport({ scale: (width / v1.width) * ratio });
        var c = document.createElement("canvas");
        c.width = Math.floor(vp.width);
        c.height = Math.floor(vp.height);
        c.setAttribute("role", "img");
        c.setAttribute("aria-label", "Pagina " + idx);
        return page.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise.then(function () {
          var fig = figs[idx - 1];
          fig.style.aspectRatio = "";
          fig.innerHTML = "";
          fig.appendChild(c);
        });
      });
    }

    // Una pagina alla volta, quando sta per entrare nello schermo.
    var queue = Promise.resolve();
    var done = {};
    function enqueue(idx) {
      if (done[idx]) return;
      done[idx] = true;
      queue = queue.then(function () { return render(idx); }).catch(function () {});
    }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { enqueue(figs.indexOf(e.target) + 1); io.unobserve(e.target); }
        });
      }, { root: getComputedStyle(box).overflowY === "auto" ? box : null, rootMargin: "600px 0px" });
      figs.slice(1).forEach(function (f) { io.observe(f); });
    } else {
      for (var k = 2; k <= n; k++) enqueue(k);
    }
  }).catch(function () { /* resta l'immagine della prima pagina */ });
})();

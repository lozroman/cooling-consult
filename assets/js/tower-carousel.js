(function () {
  'use strict';
  document.querySelectorAll('[data-tower-carousel]').forEach(function (carousel) {
    var slides = Array.from(carousel.querySelectorAll('[data-carousel-slide]'));
    var tablist = carousel.querySelector('[data-carousel-tabs]');
    var tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
    var counter = carousel.querySelector('[data-carousel-count]');
    var current = 0;
    function show(index, focus) {
      current = (index + slides.length) % slides.length;
      slides.forEach(function (slide, i) { slide.hidden = i !== current; });
      tabs.forEach(function (tab, i) {
        tab.setAttribute('aria-selected', String(i === current));
        tab.tabIndex = i === current ? 0 : -1;
      });
      counter.textContent = String(current + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
      if (focus) tabs[current].focus();
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { show(i, false); });
      tab.addEventListener('keydown', function (event) {
        var next = current;
        if (event.key === 'ArrowRight') next++;
        else if (event.key === 'ArrowLeft') next--;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = slides.length - 1;
        else return;
        event.preventDefault(); show(next, true);
      });
    });
    carousel.querySelector('[data-carousel-prev]').addEventListener('click', function () { show(current - 1, false); });
    carousel.querySelector('[data-carousel-next]').addEventListener('click', function () { show(current + 1, false); });
    // Swipe only the static previews; dragging an active canvas rotates the model.
    var swipe = null;
    carousel.addEventListener('pointerdown', function (event) {
      if (event.isPrimary && event.target.classList.contains('equipment-model__poster')) swipe = {x: event.clientX, y: event.clientY};
    });
    carousel.addEventListener('pointerup', function (event) {
      if (!swipe) return;
      var dx = event.clientX - swipe.x, dy = event.clientY - swipe.y;
      swipe = null;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) show(current + (dx < 0 ? 1 : -1), false);
    });
    carousel.addEventListener('pointercancel', function () { swipe = null; });
    tablist.hidden = false;
    carousel.querySelector('[data-carousel-controls]').hidden = false;
    show(0, false);
  });
})();

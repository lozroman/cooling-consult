// Accessible local project galleries. No autoplay, storage, analytics or network API.
(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('[data-case-gallery]').forEach(function (gallery) {
    var track = gallery.querySelector('.case-gallery__track');
    var slides = Array.from(track.querySelectorAll('figure'));
    var dots = Array.from(gallery.querySelectorAll('[data-slide]'));
    var prev = gallery.querySelector('[data-prev]'), next = gallery.querySelector('[data-next]');
    var count = gallery.querySelector('[data-count]');
    var current = 0, queued = false, opener = null, dialogIndex = 0;
    var dialog = document.getElementById(gallery.getAttribute('data-dialog'));
    function update(index) {
      current = Math.max(0, Math.min(slides.length - 1, index));
      prev.disabled = current === 0;
      next.disabled = current === slides.length - 1;
      count.textContent = (current + 1) + ' / ' + slides.length;
      dots.forEach(function (dot, i) { dot.setAttribute('aria-current', i === current ? 'true' : 'false'); });
      slides.forEach(function (slide, i) { slide.querySelector('a').tabIndex = i === current ? 0 : -1; });
    }
    function go(index) {
      update(index);
      track.scrollTo({left: slides[current].offsetLeft - slides[0].offsetLeft, behavior: reduced ? 'auto' : 'smooth'});
    }
    prev.addEventListener('click', function () { go(current - 1); });
    next.addEventListener('click', function () { go(current + 1); });
    dots.forEach(function (dot, i) { dot.addEventListener('click', function () { go(i); }); });
    track.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); go(current + (event.key === 'ArrowRight' ? 1 : -1)); }
    });
    track.addEventListener('scroll', function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () {
        var left = track.getBoundingClientRect().left;
        var closest = 0, distance = Infinity;
        slides.forEach(function (slide, i) {
          var delta = Math.abs(slide.getBoundingClientRect().left - left);
          if (delta < distance) { distance = delta; closest = i; }
        });
        update(closest); queued = false;
      });
    }, {passive: true});
    if (dialog && typeof dialog.showModal === 'function') {
      var large = dialog.querySelector('img'), caption = dialog.querySelector('.case-lightbox__caption');
      var back = dialog.querySelector('[data-prev]'), forward = dialog.querySelector('[data-next]');
      function show(index) {
        dialogIndex = Math.max(0, Math.min(slides.length - 1, index));
        var slide = slides[dialogIndex], img = slide.querySelector('img');
        large.src = slide.querySelector('a').href; large.alt = img.alt;
        caption.textContent = (dialogIndex + 1) + ' / ' + slides.length + ' — ' + slide.querySelector('figcaption').textContent.trim();
        back.disabled = dialogIndex === 0; forward.disabled = dialogIndex === slides.length - 1;
      }
      slides.forEach(function (slide, i) {
        slide.querySelector('a').addEventListener('click', function (event) {
          if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
          event.preventDefault(); opener = event.currentTarget; show(i);
          dialog.showModal(); document.body.classList.add('case-image-open');
          dialog.querySelector('[data-close]').focus();
        });
      });
      back.addEventListener('click', function () { show(dialogIndex - 1); });
      forward.addEventListener('click', function () { show(dialogIndex + 1); });
      dialog.querySelector('[data-close]').addEventListener('click', function () { dialog.close(); });
      dialog.addEventListener('click', function (event) { if (event.target === dialog) { var r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
      dialog.addEventListener('keydown', function (event) {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); show(dialogIndex + (event.key === 'ArrowRight' ? 1 : -1)); }
      });
      dialog.addEventListener('close', function () {
        document.body.classList.remove('case-image-open');
        if (opener) opener.focus({preventScroll:true});
      });
    }
    update(0); gallery.classList.add('is-ready');
  });
})();

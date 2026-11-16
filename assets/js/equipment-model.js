/* Local, on-demand equipment viewer. No external requests or stored visitor data. */
(function () {
  'use strict';
  var scripts = {};
  function loadScript(src) {
    if (!scripts[src]) scripts[src] = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = function () { delete scripts[src]; script.remove(); reject(new Error('Asset unavailable')); };
      document.head.appendChild(script);
    });
    return scripts[src];
  }

  document.querySelectorAll('[data-equipment-model]').forEach(function (container) {
    var stage = container.querySelector('.equipment-model__stage');
    var poster = container.querySelector('.equipment-model__poster');
    var start = container.querySelector('[data-model-start]');
    var toolbar = container.querySelector('.equipment-model__toolbar');
    var status = container.querySelector('[data-model-status]');
    var type = container.getAttribute('data-equipment-model');
    var files = {tower: 'cooling-tower.js', chiller: 'chiller.js', plasticTank: 'plastic-tank.js', steelTank: 'steel-tank.js', hybridTower: 'hybrid-tower.js', axialTower: 'axial-tower.js', directTower: 'direct-tower.js'};
    var labels = {tower: 'Компактная градирня', chiller: 'Чиллер', plasticTank: 'Вертикальная пластиковая емкость', steelTank: 'Горизонтальная металлическая емкость', hybridTower: 'Гибридная градирня', axialTower: 'Градирня с торцевым вентилятором', directTower: 'Градирня с прямым приводом'};
    if (!files[type]) return;
    start.hidden = false;
    var cutButton = container.querySelector('[data-model-cutaway]');
    var cutaway = false, loadedRoot = null, redraw = function () {};
    var exteriorPoster = poster.getAttribute('src');
    if (cutButton) {
      cutButton.hidden = false;
      cutButton.addEventListener('click', function () {
        cutaway = !cutaway;
        cutButton.setAttribute('aria-pressed', String(cutaway));
        cutButton.textContent = cutaway ? 'Показать корпус' : 'Показать разрез';
        poster.setAttribute('src', cutaway ? container.getAttribute('data-cutaway-poster') : exteriorPoster);
        poster.setAttribute('alt', labels[type] + (cutaway ? ': разрез, внутренние узлы' : ': внешний вид'));
        if (loadedRoot) { loadedRoot.userData.setCutaway(cutaway); redraw(); }
      });
    }

    start.addEventListener('click', async function () {
      start.disabled = true;
      status.textContent = 'Загрузка 3D-модели…';
      var renderer;
      try {
        await loadScript('assets/vendor/three-r128.min.js');
        if (['hybridTower', 'axialTower', 'directTower'].indexOf(type) !== -1) await loadScript('assets/js/tower-model-data.js?v=20261116c');
        await loadScript('assets/models/' + files[type] + '?v=20261116c');
        var THREE = window.THREE;
        renderer = new THREE.WebGLRenderer({antialias: true, alpha: false, powerPreference: 'default'});
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1;
        var scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff);
        var root = await window.CCEquipmentFactories[type](THREE);
        if (cutButton) root.userData.setCutaway(cutaway);
        loadedRoot = root;
        scene.add(root);
        scene.add(new THREE.HemisphereLight(0xffffff, 0x8b99a7, 1.1));
        [[-4, 8, 6, 1.25], [6, 4, 2, .7], [0, 6, -6, .9]].forEach(function (l) {
          var light = new THREE.DirectionalLight(0xffffff, l[3]);
          light.position.set(l[0], l[1], l[2]); scene.add(light);
        });
        var bounds = root.userData.bounds || new THREE.Box3().setFromObject(root);
        var center = bounds.getCenter(new THREE.Vector3());
        var size = bounds.getSize(new THREE.Vector3());
        var radius = size.length() / 2;
        var camera = new THREE.PerspectiveCamera(36, 1, .01, radius * 100);
        var initialTheta = type === 'tower' ? .59 : type === 'steelTank' ? 2.5 : type === 'axialTower' ? -.63 : type === 'hybridTower' || type === 'directTower' ? -.8 : .65;
        var theta = initialTheta, phi = 1.12, zoom = 1, distance = 1;
        var canvas = renderer.domElement;
        canvas.tabIndex = 0;
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', labels[type] + ': интерактивная 3D-модель. Стрелки — поворот, плюс и минус — масштаб, Home — общий вид.');
        stage.appendChild(canvas);
        var frame = 0;
        function render() {
          if (frame) return;
          frame = requestAnimationFrame(function () {
            frame = 0;
            var r = distance / zoom, sin = Math.sin(phi);
            camera.position.set(center.x + r * sin * Math.sin(theta), center.y + r * Math.cos(phi), center.z + r * sin * Math.cos(theta));
            camera.lookAt(center);
            renderer.render(scene, camera);
          });
        }
        function resize() {
          if (!stage.clientWidth || !stage.clientHeight) return;
          var width = Math.max(1, stage.clientWidth), height = Math.max(1, stage.clientHeight);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          var vfov = THREE.MathUtils.degToRad(camera.fov), hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
          distance = radius / Math.sin(Math.min(vfov, hfov) / 2) * 1.08;
          renderer.setSize(width, height, false);
          render();
        }
        redraw = render;
        function scale(factor) { zoom = THREE.MathUtils.clamp(zoom * factor, .65, 3.5); render(); }
        function reset() { theta = initialTheta; phi = 1.12; zoom = 1; render(); }
        var pointers = new Map(), pinch = 0;
        canvas.addEventListener('pointerdown', function (event) {
          if (event.button !== 0) return;
          canvas.focus({preventScroll: true});
          canvas.setPointerCapture(event.pointerId);
          pointers.set(event.pointerId, {x: event.clientX, y: event.clientY});
          pinch = 0;
        });
        canvas.addEventListener('pointermove', function (event) {
          var old = pointers.get(event.pointerId);
          if (!old) return;
          pointers.set(event.pointerId, {x: event.clientX, y: event.clientY});
          if (pointers.size === 2) {
            var p = Array.from(pointers.values()), d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
            if (pinch > 0 && d > 0) scale(d / pinch);
            pinch = d;
          } else {
            theta -= (event.clientX - old.x) * .008;
            phi = THREE.MathUtils.clamp(phi - (event.clientY - old.y) * .008, .08, Math.PI - .08);
            render();
          }
        });
        ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (name) {
          canvas.addEventListener(name, function (event) { pointers.delete(event.pointerId); pinch = 0; });
        });
        canvas.addEventListener('wheel', function (event) { event.preventDefault(); scale(Math.exp(-event.deltaY * .001)); }, {passive: false});
        canvas.addEventListener('keydown', function (event) {
          var handled = true;
          if (event.key === 'ArrowLeft') theta -= .12;
          else if (event.key === 'ArrowRight') theta += .12;
          else if (event.key === 'ArrowUp') phi = Math.max(.08, phi - .12);
          else if (event.key === 'ArrowDown') phi = Math.min(Math.PI - .08, phi + .12);
          else if (event.key === '+' || event.key === '=') scale(1.15);
          else if (event.key === '-') scale(1 / 1.15);
          else if (event.key === 'Home') reset();
          else handled = false;
          if (handled) { event.preventDefault(); render(); }
        });
        container.querySelector('[data-model-zoom-in]').onclick = function () { scale(1.2); };
        container.querySelector('[data-model-zoom-out]').onclick = function () { scale(1 / 1.2); };
        container.querySelector('[data-model-reset]').onclick = reset;
        var fullscreen = container.querySelector('[data-model-fullscreen]');
        fullscreen.hidden = !container.requestFullscreen;
        fullscreen.onclick = async function () {
          try {
            if (document.fullscreenElement === container) await document.exitFullscreen();
            else await container.requestFullscreen();
          } catch (_) { status.textContent = 'Полноэкранный режим недоступен в этом окне.'; }
        };
        document.addEventListener('fullscreenchange', function () {
          fullscreen.textContent = document.fullscreenElement === container ? 'Свернуть' : 'На весь экран';
          resize();
        });
        var observer = new ResizeObserver(resize);
        observer.observe(stage);
        canvas.addEventListener('webglcontextlost', function (event) {
          event.preventDefault();
          observer.disconnect();
          if (frame) cancelAnimationFrame(frame);
          loadedRoot = null; redraw = function () {};
          renderer.dispose();
          canvas.remove(); poster.hidden = false; toolbar.hidden = true;
          status.textContent = 'Просмотр 3D прерван. Обновите страницу, чтобы открыть модель снова.';
        });
        poster.hidden = true; start.hidden = true; toolbar.hidden = false;
        status.textContent = 'Потяните для вращения · колесо или два пальца для масштаба';
        resize(); if (stage.clientWidth) canvas.focus({preventScroll: true});
      } catch (_) {
        loadedRoot = null; redraw = function () {};
        if (renderer) { renderer.dispose(); renderer.domElement.remove(); }
        poster.hidden = false;
        start.disabled = false;
        start.textContent = 'Повторить загрузку 3D';
        status.textContent = 'Не удалось открыть 3D. Изображение модели доступно выше.';
      }
    });
  });
})();

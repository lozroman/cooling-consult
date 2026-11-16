/* Local compressed geometry shared by the tower viewers. */
(function () {
  'use strict';
  window.CCBuildPackedTower = async function (THREE, encoded) {
    var bytes = Uint8Array.from(atob(encoded), function (c) { return c.charCodeAt(0); });
    var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    var buffer = await new Response(stream).arrayBuffer();
    var length = new DataView(buffer).getUint32(0, true);
    var data = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 4, length)));
    var base = Math.ceil((4 + length) / 4) * 4;
    var geos = data.geos.map(function (d) {
      var q = new Uint16Array(buffer, base + d.p[0], d.p[1]);
      var positions = new Float32Array(q.length);
      for (var i = 0; i < q.length; i++) positions[i] = d.lo[i % 3] + q[i] / 65535 * d.sz[i % 3];
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(new Int16Array(buffer, base + d.n[0], d.n[1]), 3, true));
      if (d.i) geo.setIndex(new THREE.BufferAttribute(new Uint32Array(buffer, base + d.i[0], d.i[1]), 1));
      geo.computeBoundingBox(); geo.computeBoundingSphere();
      return geo;
    });
    var root = new THREE.Group(), cutaway = [], bounds = new THREE.Box3();
    data.meshes.forEach(function (d) {
      var m = d.mat;
      var material = new THREE.MeshStandardMaterial({
        color: new THREE.Color().fromArray(m.c), metalness: m.m, roughness: m.r,
        opacity: m.a, transparent: m.a < 1, depthWrite: m.a === 1, side: m.s
      });
      var mesh = new THREE.InstancedMesh(geos[d.g], material, d.t[1] / 16);
      mesh.instanceMatrix.array.set(new Float32Array(buffer, base + d.t[0], d.t[1]));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.frustumCulled = false;
      var matrix = new THREE.Matrix4();
      for (var i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, matrix);
        bounds.union(geos[d.g].boundingBox.clone().applyMatrix4(matrix));
      }
      root.add(mesh);
      if (d.cut) cutaway.push(mesh);
    });
    root.userData.setCutaway = function (enabled) {
      cutaway.forEach(function (mesh) { mesh.visible = !enabled; });
    };
    root.userData.bounds = bounds;
    return root;
  };
})();

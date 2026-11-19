/* Geometry adapted from the supplied cooling tower model for the equipment viewer. */
window.CCEquipmentFactories = window.CCEquipmentFactories || {};
window.CCEquipmentFactories.topFanTower = function (THREE) {
  'use strict';

  const PI = Math.PI;
  const TAU = 2 * PI;
  const vector = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const rotation = (x = 0, y = 0, z = 0) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
  const axisRotation = {x: rotation(0, 0, -PI / 2), y: rotation(), z: rotation(PI / 2)};

  function material(color, metalness, roughness, options = {}) {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(color).convertSRGBToLinear(),
      metalness,
      roughness,
      side: THREE.DoubleSide,
      ...options
    });
  }

  const finish = {
    panel: material(0xa7b9c8, .18, .46),
    trim: material(0x315f88, .23, .37),
    trimHighlight: material(0x6589a9, .23, .39),
    frame: material(0x344858, .30, .42),
    metal: material(0xb4bfc6, .40, .33),
    silver: material(0xdde5e9, .42, .28),
    gasket: material(0x263039, .05, .76),
    louver: material(0x566c7d, .23, .63),
    plastic: material(0x39464e, .05, .51),
    pvc: material(0x607582, .06, .50),
    brass: material(0xb48b4b, .38, .36),
    feed: material(0xa85233, .18, .41),
    outlet: material(0x286b9a, .28, .39),
    motor: material(0x244b71, .28, .37),
    blade: material(0xaabfc9, .39, .33),
    water: material(0x398eaf, .12, .30, {transparent: true, opacity: .53, depthWrite: false}),
    fillDark: material(0x293a48, .04, .63),
    fillLight: material(0x4f6471, .04, .65),
    vanes: material(0x738792, .10, .45),
    float: material(0xd5a849, .26, .32)
  };

  const tower = new THREE.Group();
  const cutawayParts = [];
  const batches = new Map();

  function assembly(parent, hideInCutaway = false) {
    const group = new THREE.Group();
    parent.add(group);
    if (hideInCutaway) cutawayParts.push(group);
    return group;
  }

  function part(group, geometry, finish, x = 0, y = 0, z = 0, orientation = rotation()) {
    if (!batches.has(group)) batches.set(group, new Map());
    const finishes = batches.get(group);
    if (!finishes.has(finish)) finishes.set(finish, []);
    const matrix = new THREE.Matrix4().compose(vector(x, y, z), orientation, vector(1, 1, 1));
    finishes.get(finish).push({geometry, matrix});
  }

  // Batch by assembly and material to keep the detailed model responsive during rotation.
  function finishParts() {
    const point = vector();
    const normal = new THREE.Matrix3();
    for (const [group, finishes] of batches) {
      for (const [finish, parts] of finishes) {
        const vertexCount = parts.reduce((count, {geometry}) => count + geometry.attributes.position.count, 0);
        const indexCount = parts.reduce((count, {geometry}) => count + (geometry.index || geometry.attributes.position).count, 0);
        const positions = new Float32Array(vertexCount * 3);
        const normals = new Float32Array(vertexCount * 3);
        const indices = vertexCount > 65535 ? new Uint32Array(indexCount) : new Uint16Array(indexCount);
        let vertexOffset = 0;
        let indexOffset = 0;

        for (const {geometry, matrix} of parts) {
          const {position, normal: sourceNormal} = geometry.attributes;
          normal.getNormalMatrix(matrix);
          for (let i = 0; i < position.count; i++) {
            const offset = (vertexOffset + i) * 3;
            point.fromBufferAttribute(position, i).applyMatrix4(matrix).toArray(positions, offset);
            point.fromBufferAttribute(sourceNormal, i).applyMatrix3(normal).normalize().toArray(normals, offset);
          }
          const count = (geometry.index || position).count;
          for (let i = 0; i < count; i++) {
            indices[indexOffset++] = vertexOffset + (geometry.index ? geometry.index.getX(i) : i);
          }
          vertexOffset += position.count;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
        geometry.setIndex(new THREE.BufferAttribute(indices, 1));
        geometry.computeBoundingSphere();
        group.add(new THREE.Mesh(geometry, finish));
      }
    }
    batches.clear();
  }

  function triangles(positions, indices) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  function box(group, x, y, z, width, height, depth, finish, orientation) {
    part(group, new THREE.BoxGeometry(width, height, depth), finish, x, y, z, orientation);
  }

  function beam(group, start, end, width, depth, finish) {
    const point = vector(...start);
    const delta = vector(...end).sub(point);
    const orientation = new THREE.Quaternion().setFromUnitVectors(vector(0, 1, 0), delta.clone().normalize());
    point.addScaledVector(delta, .5);
    box(group, point.x, point.y, point.z, width, delta.length(), depth, finish, orientation);
  }

  function cylinder(group, x, y, z, radius, height, finish, axis = 'y', segments = 32) {
    part(group, new THREE.CylinderGeometry(radius, radius, height, segments), finish, x, y, z, axisRotation[axis]);
  }

  function lathe(group, x, y, z, profile, finish, axis = 'y', start = 0, span = TAU, segments = 64) {
    const points = profile.map(([r, h]) => new THREE.Vector2(r, h));
    const geometry = new THREE.LatheGeometry(points, Math.max(6, Math.ceil(segments * span / TAU)), start, span);
    part(group, geometry, finish, x, y, z, axisRotation[axis]);
  }

  function ring(group, x, y, z, radius, thickness, height, finish, axis = 'y') {
    const inner = radius - thickness;
    const bottom = -height / 2;
    const top = height / 2;
    const profile = [[radius, bottom], [radius, top], [inner, top], [inner, bottom], [radius, bottom]];
    lathe(group, x, y, z, profile, finish, axis, 0, TAU, 56);
  }

  function tube(group, points, radius, finish) {
    const curve = new THREE.CatmullRomCurve3(points.map(point => vector(...point)));
    part(group, new THREE.TubeGeometry(curve, Math.max(16, points.length * 6), radius, 10, false), finish);
  }

  function screw(group, x, y, z, size = .025, axis = 'y') {
    cylinder(group, x, y, z, size * 1.23, size * .25, finish.metal, axis, 14);
    const offset = size * .31;
    cylinder(group, x + (axis === 'x' ? offset : 0), y + (axis === 'y' ? offset : 0),
      z + (axis === 'z' ? offset : 0), size, size * .63, finish.silver, axis, 6);
  }

  function flange(group, x, y, z, radius, finish, axis = 'x') {
    ring(group, x, y, z, radius, radius * .36, .037, finish, axis);
    for (let i = 0; i < 8; i++) {
      const angle = TAU * (i + .5) / 8;
      const u = radius * .81 * Math.sin(angle);
      const v = radius * .81 * Math.cos(angle);
      screw(group, x + (axis === 'x' ? .025 : u), y + (axis === 'x' ? u : v),
        z + (axis === 'x' ? v : .025), .014, axis);
    }
  }

  function gridPatch(columns, rows, surface) {
    const positions = [];
    const indices = [];
    for (let j = 0; j <= rows; j++) {
      for (let i = 0; i <= columns; i++) positions.push(...surface(i / columns, j / rows));
    }
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < columns; i++) {
        const a = j * (columns + 1) + i;
        const b = a + columns + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
    return triangles(positions, indices);
  }

  function wall(group, axis, sign, along, y, span, height, offset, depth, finish, holes = []) {
    const shape = new THREE.Shape();
    shape.moveTo(-span / 2, -height / 2);
    shape.lineTo(span / 2, -height / 2);
    shape.lineTo(span / 2, height / 2);
    shape.lineTo(-span / 2, height / 2);
    shape.closePath();
    for (const [u, v, radius] of holes) {
      const hole = new THREE.Path();
      hole.absarc(u, v, radius, 0, TAU, true);
      shape.holes.push(hole);
    }
    const geometry = new THREE.ExtrudeGeometry(shape, {depth, bevelEnabled: false, curveSegments: 20});
    geometry.translate(0, 0, -depth / 2);
    if (axis === 'x') geometry.rotateY(-PI / 2);
    part(group, geometry, finish, axis === 'x' ? sign * offset : along, y, axis === 'x' ? along : sign * offset);
  }

  const halfWidth = 2.08;
  const halfDepth = 1.57;

  function hoodPoint(angle, span) {
    const x = Math.sin(angle);
    const z = Math.cos(angle);
    const edge = 1 / Math.max(Math.abs(x) / halfWidth, Math.abs(z) / halfDepth);
    const radius = edge + (1.305 - edge) * span;
    return [radius * x, 3.81 + .49 * span, radius * z];
  }

  function makeShell() {
    const shell = assembly(tower);
    for (const sign of [-1, 1]) {
      box(shell, sign * 1.39, .095, 0, .18, .15, 3.38, finish.frame);
      box(shell, sign * 1.39, .025, 0, .32, .035, 3.44, finish.metal);
      for (const z of [-1.58, 1.58]) {
        for (const offset of [-.104, .104]) screw(shell, sign * 1.39 + offset, .052, z, .024);
      }
    }
    for (const axis of ['x', 'z']) {
      for (const sign of [-1, 1]) {
        const side = assembly(shell, sign > 0);
        const extent = axis === 'x' ? halfWidth : halfDepth;
        const halfSpan = axis === 'x' ? halfDepth : halfWidth;
        const count = axis === 'x' ? 3 : 4;
        const span = 2 * halfSpan / count;
        const panel = (along, y, width, height, offset, depth, finish, holes) =>
          wall(side, axis, sign, along, y, width, height, extent + offset, depth, finish, holes);

        for (let i = 0; i < count; i++) {
          const at = -halfSpan + (i + .5) * span;
          const holes = axis === 'x' && sign === 1 && i === 1 ? [[0, 3.17 - 2.657, .139]] : [];
          panel(at, 2.657, span - .018, 2.225, 0, .049, finish.panel, holes);
          for (const offset of [-.41, .41]) {
            panel(at + offset * span, 2.635, .038, 1.96, .032, .026, finish.panel);
            for (let j = 0; j < 6; j++) {
              const along = at + Math.sign(offset) * .472 * span;
              const outside = sign * (extent + .036);
              screw(side, axis === 'x' ? outside : along, 1.66 + j * .39,
                axis === 'x' ? along : outside, .014, axis);
            }
          }
          const profile = [[.09, 0], [.014, .066], [-.04, .066], [-.10, .12]];
          for (let j = 0; j < 6; j++) {
            for (let k = 0; k < profile.length - 1; k++) {
              const [d0, h0] = profile[k];
              const [d1, h1] = profile[k + 1];
              const blade = gridPatch(1, 1, (u, v) => {
                const along = at + (u - .5) * (span - .055);
                const outside = sign * (extent + d0 * (1 - v) + d1 * v);
                const y = .69 + j * .143 + h0 * (1 - v) + h1 * v;
                return axis === 'x' ? [outside, y, along] : [along, y, outside];
              });
              part(side, blade, finish.louver);
            }
          }
          for (const offset of [-.485, .485]) panel(at + span * offset, 1.05, .038, .84, .03, .075, finish.frame);
        }
        panel(0, .635, 2 * halfSpan + .028, .054, .006, .084, finish.metal);
        panel(0, 1.515, 2 * halfSpan + .028, .105, .006, .084, finish.trim);
        panel(0, 3.79, 2 * halfSpan + .028, .09, .006, .084, finish.trim);
        if (axis === 'z' && sign === 1) {
          panel(-.68, 2.34, .60, .77, .049, .039, finish.frame);
          panel(-.68, 2.34, .55, .72, .083, .035, finish.panel);
          for (const y of [2.12, 2.56]) {
            panel(-.945, y, .07, .103, .112, .04, finish.metal);
            panel(-.44, y, .038, .082, .123, .041, finish.frame);
          }
        }
      }
    }
    for (const x of [-halfWidth, halfWidth]) {
      for (const z of [-halfDepth, halfDepth]) {
        const post = assembly(shell, x > 0 && z > 0);
        box(post, x, 2.11, z, .075, 3.39, .085, finish.frame);
        box(post, x, .59, z, .132, .095, .13, finish.silver);
      }
    }
    for (const y of [1.44, 3.43]) {
      for (const z of [-1.53, 1.53]) box(shell, 0, y, z, 4.10, .053, .058, finish.metal);
    }
    for (let k = 0; k < 16; k++) {
      const start = k * TAU / 16 + .001;
      const end = (k + 1) * TAU / 16 - .001;
      const sector = assembly(shell, k < 5);
      part(sector, gridPatch(16, 4, (u, v) => hoodPoint(start + (end - start) * u, v)), finish.trim);
      beam(sector, hoodPoint(start, 0), hoodPoint(start, 1), .015, .022, finish.trimHighlight);
      for (const span of [.14, .85]) {
        const [x, y, z] = hoodPoint(start + .028, span);
        screw(sector, x, y + .011, z, .013);
      }
    }
  }

  function makePan() {
    const pan = assembly(tower);
    box(pan, 0, .187, 0, 3.97, .066, 2.91, finish.frame);
    const corners = [[-1.98, -1.48], [1.98, -1.48], [1.98, 1.48], [-1.98, 1.48]];
    // Four sloped facets meet at the low suction pocket.
    for (let i = 0; i < corners.length; i++) {
      const [x0, z0] = corners[i];
      const [x1, z1] = corners[(i + 1) % corners.length];
      part(pan, triangles([x0, .288, z0, x1, .288, z1, -.65, .21, .87], [0, 1, 2]), finish.metal);
    }
    for (const axis of ['x', 'z']) {
      for (const sign of [-1, 1]) {
        const len = axis === 'x' ? 2 * halfDepth : 2 * halfWidth;
        const extent = axis === 'x' ? halfWidth : halfDepth;
        let holes = [];
        if (axis === 'z' && sign === 1) holes = [[-.64, -.025, .113], [1.25, .10, .038], [.57, -.135, .032]];
        if (axis === 'x' && sign === 1) holes = [[.80, .121, .043]];
        wall(pan, axis, sign, 0, .427, len, .422, extent - .024, .049, finish.panel, holes);
        wall(pan, axis, sign, 0, .606, len + .04, .079, extent - .008, .091, finish.trim);
        for (let j = 0; j < 9; j++) {
          const along = (j / 8 - .5) * (len - .13);
          screw(pan, axis === 'x' ? sign * extent : along, .59,
            axis === 'x' ? along : sign * extent, .014, axis);
        }
      }
    }
    ring(pan, -.64, .402, 1.78, .147, .025, .49, finish.outlet, 'z');
    flange(pan, -.64, .402, 2.025, .185, finish.outlet, 'z');
    for (const [x, y, radius] of [[.57, .292, .042], [1.25, .527, .049]]) {
      ring(pan, x, y, 1.67, radius, .009, .27, finish.metal, 'z');
      flange(pan, x, y, 1.816, radius * 1.5, finish.metal, 'z');
    }
    for (let i = 0; i < 19; i++) {
      const angle = TAU * i / 19;
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      beam(pan, [-.64 + .148 * c, .403 + .128 * s, 1.51],
        [-.64 + .125 * c, .403 + .110 * s, 1.11], .009, .009, finish.silver);
    }
    for (let j = 0; j < 7; j++) ring(pan, -.64, .403, 1.12 + j * .065, .128 + j * .003, .01, .011, finish.metal, 'z');
    for (let j = -3; j <= 3; j++) {
      const u = j * .030;
      const v = Math.sqrt(.116 * .116 - u * u);
      beam(pan, [-.64 + u, .403 - v, 1.105], [-.64 + u, .403 + v, 1.105], .009, .009, finish.silver);
    }
    ring(pan, 1.97, .548, .8, .049, .013, .32, finish.brass, 'x');
    cylinder(pan, 1.80, .548, .8, .064, .12, finish.brass, 'x', 8);
    beam(pan, [1.77, .57, .80], [1.45, .49, .71], .022, .02, finish.brass);
    part(pan, new THREE.SphereGeometry(.094, 24, 16).scale(1.25, .85, 1), finish.float, 1.43, .495, .71);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(4.055, 3.045).rotateX(-PI / 2), finish.water);
    water.position.y = .495;
    water.renderOrder = 2;
    pan.add(water);
  }

  function fanBlade() {
    const positions = [];
    const indices = [];
    const sections = 20;
    const vertices = 24;
    for (let i = 0; i <= sections; i++) {
      const span = i / sections;
      const radius = .17 + span * .987;
      const chord = .196 + .19 * Math.sin(PI * span * .87) - .119 * span * span;
      const sweep = .19 * span * span;
      const twist = .79 - .42 * span;
      for (let j = 0; j < vertices; j++) {
        const angle = j * TAU / vertices;
        const u = (1 - Math.cos(angle)) / 2;
        const along = (u - .40) * chord;
        const thickness = .027 * Math.sin(angle) * (1 - .23 * span) + .032 * Math.sin(PI * u);
        positions.push(radius, along * Math.sin(twist) + thickness * Math.cos(twist),
          sweep + along * Math.cos(twist) - thickness * Math.sin(twist));
      }
    }
    for (let i = 0; i < sections; i++) {
      for (let j = 0; j < vertices; j++) {
        const a = i * vertices + j;
        const b = i * vertices + (j + 1) % vertices;
        indices.push(a, b, a + vertices, b, b + vertices, a + vertices);
      }
    }
    const tip = sections * vertices;
    for (let j = 1; j < vertices - 1; j++) indices.push(0, j + 1, j, tip, tip + j, tip + j + 1);
    return triangles(positions, indices);
  }

  function makeDrive() {
    const drive = assembly(tower);
    const profile = [
      [1.34, 0], [1.34, .041], [1.26, .09], [1.216, .18], [1.205, .36], [1.226, .46], [1.25, .50],
      [1.268, .50], [1.25, .442], [1.231, .35], [1.241, .18], [1.278, .106], [1.369, .047], [1.369, 0], [1.34, 0]
    ];
    for (let k = 0; k < 8; k++) {
      const ringSector = assembly(drive, k < 2);
      lathe(ringSector, 0, 4.30, 0, profile, finish.trim, 'y', k * TAU / 8, TAU / 8 - .003);
      for (let i = 0; i < 4; i++) {
        const angle = (k + (i + .5) / 4) * TAU / 8;
        screw(ringSector, 1.348 * Math.sin(angle), 4.354, 1.348 * Math.cos(angle), .019);
      }
    }
    for (let k = 0; k < 4; k++) {
      const angle = (k + .5) * PI / 2;
      const x = Math.sin(angle);
      const z = Math.cos(angle);
      beam(drive, [x * .16, 4.91, z * .16], [x * 1.234, 4.826, z * 1.234], .095, .091, finish.frame);
      box(drive, x * 1.235, 4.815, z * 1.235, .14, .058, .163, finish.metal, rotation(0, angle, 0));
    }
    const screen = assembly(drive, true);
    for (let i = 0; i < 11; i++) ring(screen, 0, 4.826, 0, .35 + i * .086, .008, .011, finish.metal);
    for (let i = 0; i < 26; i++) {
      const angle = TAU * i / 26;
      const x = Math.sin(angle);
      const z = Math.cos(angle);
      beam(screen, [.31 * x, 4.834, .31 * z], [1.227 * x, 4.834, 1.227 * z], .009, .011, finish.metal);
    }
    const rotor = assembly(drive);
    rotor.position.y = 4.555;
    cylinder(rotor, 0, 0, 0, .197, .13, finish.metal);
    cylinder(rotor, 0, .071, 0, .15, .039, finish.frame);
    cylinder(rotor, 0, .207, 0, .056, .28, finish.silver);
    const blade = fanBlade();
    for (let i = 0; i < 7; i++) {
      const bladeGroup = assembly(rotor);
      bladeGroup.rotation.y = TAU * i / 7;
      part(bladeGroup, blade, finish.blade);
      cylinder(bladeGroup, .181, .004, .008, .044, .115, finish.metal, 'x');
      for (const z of [-.052, .052]) screw(bladeGroup, .175, .07, z, .016);
    }
    ring(drive, 0, 4.905, 0, .255, .185, .067, finish.metal);
    cylinder(drive, 0, 4.96, 0, .215, .059, finish.trim);
    ring(drive, 0, 4.911, 0, .084, .026, .097, finish.frame);
    lathe(drive, 0, 4.978, 0, [[.159, 0], [.185, .023], [.182, .282], [.170, .331], [.130, .355], [.01, .355]], finish.motor);
    for (let i = 0; i < 32; i++) {
      const angle = TAU * i / 32;
      box(drive, .183 * Math.sin(angle), 5.136, .183 * Math.cos(angle), .012, .238, .046, finish.motor, rotation(0, angle, 0));
    }
    cylinder(drive, 0, 5.318, 0, .175, .066, finish.frame);
    cylinder(drive, 0, 5.359, 0, .143, .031, finish.trim);
    for (let i = 0; i < 8; i++) {
      const angle = TAU * i / 8;
      screw(drive, .214 * Math.sin(angle), 4.952, .214 * Math.cos(angle), .018);
    }
    ring(drive, 0, 5.407, 0, .055, .014, .025, finish.silver, 'z');
    box(drive, 0, 5.119, .204, .176, .142, .093, finish.frame);
    box(drive, 0, 5.119, .257, .185, .151, .021, finish.trim);
    for (const x of [-.071, .071]) {
      for (const y of [5.065, 5.171]) screw(drive, x, y, .275, .009, 'z');
    }
    tube(drive, [[.082, 5.10, .22], [.18, 5.068, .281], [.23, 4.959, .31],
      [.41, 4.951, .43], [.83, 4.895, .84]], .014, finish.gasket);
  }

  function nozzle(group, x, y, z) {
    cylinder(group, x, y - .08, z, .047, .095, finish.plastic);
    cylinder(group, x, y - .143, z, .057, .055, finish.brass, 'y', 6);
    for (let i = 0; i < 4; i++) ring(group, x, y - .171 - i * .013, z, .043, .008, .008, finish.frame);
    const profile = [[.043, .032], [.043, .01], [.054, -.007], [.041, -.049], [.030, -.056], [.029, .031]];
    lathe(group, x, y - .210, z, profile, finish.plastic, 'y', 0, TAU, 36);
    for (let k = 0; k < 3; k++) {
      const angle = k * TAU / 3;
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      beam(group, [x + .048 * c, y - .216, z + .048 * s],
        [x + .084 * c, y - .314, z + .084 * s], .012, .012, finish.plastic);
    }
    ring(group, x, y - .315, z, .093, .033, .016, finish.plastic);
    for (let k = 0; k < 16; k++) {
      const angle = TAU * k / 16;
      box(group, x + .079 * Math.sin(angle), y - .327, z + .079 * Math.cos(angle),
        .012, .017, .025, finish.plastic, rotation(0, angle, 0));
    }
  }

  function makeDistributor() {
    const distributor = assembly(tower);
    const y = 3.17;
    const branches = [-1.56, -.52, .52, 1.56];
    ring(distributor, .125, y, 0, .122, .014, 4.68, finish.feed, 'x');
    flange(distributor, 2.46, y, 0, .166, finish.feed);
    flange(distributor, 2.095, y, 0, .161, finish.metal);
    cylinder(distributor, -2.183, y, 0, .125, .038, finish.feed, 'x');
    for (const x of branches) {
      for (const sign of [-1, 1]) {
        cylinder(distributor, x, y, sign * .727, .066, 1.40, finish.pvc, 'z');
        ring(distributor, x, y, sign * .149, .085, .012, .11, finish.plastic, 'z');
        cylinder(distributor, x, y, sign * 1.432, .074, .036, finish.plastic, 'z', 12);
      }
      ring(distributor, x, y, 0, .134, .02, .15, finish.feed, 'x');
      for (const z of [-1.08, -.36, .36, 1.08]) nozzle(distributor, x, y, z);
    }
    for (const z of [-1.29, 1.29]) {
      box(distributor, 0, 3.061, z, 4.14, .046, .068, finish.metal);
      for (const x of branches) {
        const strap = Array.from({length: 13}, (_, j) => {
          const angle = PI * j / 12;
          return [x + .083 * Math.cos(angle), y + .083 * Math.sin(angle), z];
        });
        tube(distributor, strap, .009, finish.metal);
        for (const offset of [-.083, .083]) {
          cylinder(distributor, x + offset, 3.11, z, .008, .12, finish.metal);
          screw(distributor, x + offset, 3.077, z, .013);
        }
      }
    }
  }

  function makeMedia() {
    const fill = assembly(tower);
    const drift = assembly(tower);
    const packWidth = 1.94;
    const packDepth = 1.435;
    const bend = [[0, -.025], [.19, -.042], [.42, .040], [.57, .052], [.76, -.018], [1, -.031]];
    for (const x of [-1.01, 1.01]) {
      for (const z of [-.75, .75]) {
        const nearCorner = x > 0 && z > 0;
        const fillSlice = nearCorner ? assembly(fill, true) : fill;
        const driftSlice = nearCorner ? assembly(drift, true) : drift;
        for (let j = 0; j < 39; j++) {
          const sheet = gridPatch(46, 20, (v, u) => {
            const phase = v * 11 + (j % 2 ? 1 : -1) * u * 4.6;
            const finePhase = v * 22 + (j % 2 ? 1 : -1) * u * 9.2;
            const flute = .023 * Math.sin(TAU * phase) + .0026 * Math.sin(TAU * finePhase);
            return [x - packWidth / 2 + .031 + (packWidth - .062) * j / 38 + flute,
              1.51 + u * .92, z + (v - .5) * packDepth];
          });
          part(j >= 10 ? fillSlice : fill, sheet, j % 2 ? finish.fillDark : finish.fillLight);
        }
        for (let j = 0; j < 38; j++) {
          const origin = x - packWidth / 2 + .04 + j * (packWidth - .08) / 37;
          for (let k = 1; k < bend.length; k++) {
            const [a, start] = bend[k - 1];
            const [b, end] = bend[k];
            const vane = gridPatch(1, 1, (u, v) => [origin + start + (end - start) * v,
              3.49 + .265 * (a + (b - a) * v), z + (u - .5) * packDepth]);
            part(j >= 9 ? driftSlice : drift, vane, j % 2 ? finish.vanes : finish.pvc);
          }
        }
        for (const sign of [-1, 1]) {
          const edge = z + sign * packDepth / 2;
          box(fill, x, 1.51, edge, packWidth, .041, .038, finish.frame);
          box(drift, x, 3.526, edge, packWidth, .053, .026, finish.plastic);
          box(drift, x, 3.715, edge, packWidth, .046, .025, finish.pvc);
        }
      }
    }
    for (const z of [-1.49, 0, 1.49]) {
      box(fill, 0, 1.462, z, 4.07, .060, .072, finish.metal);
      box(drift, 0, 3.456, z, 4.07, .046, .072, finish.metal);
    }
  }

  makeShell();
  makePan();
  makeDrive();
  makeDistributor();
  makeMedia();
  finishParts();
  tower.userData.setCutaway = function (enabled) {
    cutawayParts.forEach(group => { group.visible = !enabled; });
  };
  return tower;
};

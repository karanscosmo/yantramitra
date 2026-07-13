(function() {
  const PALETTE = {
    primary: 0x413fd6,
    teal: 0x5efae4,
    amber: 0xffba4b,
    red: 0xba1a1a,
    ink: 0x191a28,
    muted: 0xc7c4d7,
    steel: 0x9aa4b2,
    floor: 0xf8f7ff
  };

  const _beltCanvas = document.createElement('canvas');
  _beltCanvas.width = 128;
  _beltCanvas.height = 32;
  const _beltCtx = _beltCanvas.getContext('2d');
  _beltCtx.fillStyle = '#ffffff';
  _beltCtx.fillRect(0, 0, 128, 32);
  _beltCtx.fillStyle = '#cccccc';
  for (let i = 0; i < 128; i += 24) _beltCtx.fillRect(i, 0, 12, 32);
  const _beltTex = new THREE.CanvasTexture(_beltCanvas);
  _beltTex.wrapS = THREE.RepeatWrapping;
  _beltTex.wrapT = THREE.RepeatWrapping;
  _beltTex.repeat.set(6, 1);

  const _sensorCanvas = document.createElement('canvas');
  _sensorCanvas.width = 16;
  _sensorCanvas.height = 16;
  const _sCtx = _sensorCanvas.getContext('2d');
  _sCtx.fillStyle = '#ffffff';
  _sCtx.beginPath();
  _sCtx.arc(8, 8, 4, 0, Math.PI * 2);
  _sCtx.fill();
  const _sensorTex = new THREE.CanvasTexture(_sensorCanvas);

  function includes(machine, words) {
    const haystack = `${machine.name || ''} ${machine.type || ''} ${machine.location || ''}`.toLowerCase();
    return words.some(word => haystack.includes(word));
  }

  function material(color, opts = {}) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: opts.roughness ?? 0.45,
      metalness: opts.metalness ?? 0.2,
      emissive: opts.emissive ?? 0x000000,
      emissiveIntensity: opts.emissiveIntensity ?? 0
    });
  }

  function box(w, h, d, color, x = 0, y = h / 2, z = 0, opts = {}) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(color, opts));
    mesh.position.set(x, y, z);
    if (opts.rotation) mesh.rotation.set(opts.rotation[0] || 0, opts.rotation[1] || 0, opts.rotation[2] || 0);
    return mesh;
  }

  function cyl(rTop, rBottom, h, color, x = 0, y = h / 2, z = 0, opts = {}) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, opts.segments || 28), material(color, opts));
    mesh.position.set(x, y, z);
    if (opts.rotation) mesh.rotation.set(opts.rotation[0] || 0, opts.rotation[1] || 0, opts.rotation[2] || 0);
    return mesh;
  }

  function labelSprite(text, color = '#191a28') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(255,255,255,.88)';
    ctx.roundRect(8, 18, 496, 92, 22);
    ctx.fill();
    ctx.strokeStyle = 'rgba(65,63,214,.28)';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.font = '700 30px Inter, Arial, sans-serif';
    ctx.fillStyle = color;
    const short = text.length > 24 ? `${text.slice(0, 22)}...` : text;
    ctx.fillText(short, 30, 74);
    const texture = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
    sprite.scale.set(4.2, 1.05, 1);
    return sprite;
  }

  function addConveyor(group, length = 5.2, z = 0, color = PALETTE.primary) {
    const belt = box(length, 0.22, 0.8, color, 0, 0.28, z, { emissive: 0x15115d, emissiveIntensity: 0.1 });
    belt.material.map = _beltTex;
    belt.material.needsUpdate = true;
    belt.userData.isBelt = true;
    group.add(belt);
    for (let i = -2; i <= 2; i += 1) {
      group.add(cyl(0.16, 0.16, 0.9, PALETTE.steel, i * (length / 5), 0.48, z, { rotation: [Math.PI / 2, 0, 0], metalness: 0.45 }));
    }
  }

  function addRobotArm(group, x = 0, z = 0, fault = false) {
    const baseColor = fault ? PALETTE.red : PALETTE.teal;
    group.add(cyl(0.45, 0.6, 0.38, PALETTE.primary, x, 0.19, z, { metalness: 0.35 }));
    const shoulder = cyl(0.15, 0.15, 2.0, baseColor, x + 0.45, 1.05, z, { rotation: [0, 0, -0.72], emissive: 0x003a35, emissiveIntensity: 0.12 });
    const forearm = cyl(0.13, 0.13, 1.8, baseColor, x + 1.25, 1.85, z, { rotation: [0, 0, 0.92], emissive: 0x003a35, emissiveIntensity: 0.12 });
    shoulder.userData.isArm = true;
    shoulder.userData._armBaseRot = -0.72;
    forearm.userData.isArm = true;
    forearm.userData._armBaseRot = 0.92;
    group.add(shoulder, forearm);
    group.add(cyl(0.24, 0.24, 0.32, PALETTE.teal, x + 0.9, 1.65, z, { rotation: [Math.PI / 2, 0, 0] }));
    group.add(box(0.7, 0.12, 0.45, PALETTE.ink, x + 1.85, 1.45, z));
  }

  function buildAutomotive(machine, fault) {
    const group = new THREE.Group();
    if (includes(machine, ['robot', 'weld', 'welder'])) {
      addConveyor(group, 5.5, -0.8, PALETTE.amber);
      addRobotArm(group, -1.3, 0.15, fault);
      addRobotArm(group, 1.25, 0.25, fault);
      group.add(box(1.8, 0.55, 1.2, 0xced6e0, 0, 0.62, 0.45, { metalness: 0.25 }));
    } else if (includes(machine, ['cnc', 'turning', 'machine'])) {
      group.add(box(2.6, 1.8, 1.9, 0xdfe4ea, 0, 0.9, 0, { metalness: 0.35 }));
      group.add(box(1.45, 0.82, 0.08, 0x86fff0, 0.05, 1.02, -0.98, { emissive: 0x00514b, emissiveIntensity: 0.25 }));
      group.add(box(0.55, 0.75, 0.12, PALETTE.ink, 1.0, 1.15, -1.04));
      addConveyor(group, 4.2, 1.3, PALETTE.amber);
    } else {
      addConveyor(group, 5.7, 0, PALETTE.amber);
      group.add(box(1.1, 0.6, 1.1, 0x4f58d8, -1.6, 0.72, -0.85));
      group.add(box(1.1, 0.6, 1.1, 0x4f58d8, 1.6, 0.72, 0.85));
    }
    return group;
  }

  function buildProcess(machine, fault) {
    const group = new THREE.Group();
    if (includes(machine, ['dye', 'chemical', 'dosing', 'effluent', 'tank'])) {
      group.add(cyl(0.8, 0.8, 1.8, fault ? PALETTE.red : PALETTE.primary, -0.9, 0.9, 0, { metalness: 0.28 }));
      group.add(cyl(0.6, 0.6, 1.45, PALETTE.steel, 0.95, 0.72, 0.1, { metalness: 0.4 }));
      group.add(cyl(0.08, 0.08, 2.2, PALETTE.teal, 0.04, 1.35, 0, { rotation: [0, 0, Math.PI / 2], emissive: 0x00443f, emissiveIntensity: 0.2 }));
      group.add(box(1.2, 0.8, 0.18, PALETTE.ink, 0.95, 1.18, -0.72));
    } else {
      addConveyor(group, 5.4, 0.2, 0x6f64e7);
      for (let i = -2; i <= 2; i += 1) {
        group.add(cyl(0.32, 0.32, 1.6, i % 2 ? 0x2d9cdb : 0xff6b8a, i * 0.75, 0.75, -0.55, { rotation: [Math.PI / 2, 0, 0], metalness: 0.2 }));
      }
      group.add(box(5.4, 0.08, 1.45, 0x7ff6e8, 0, 0.98, -0.55, { emissive: 0x003f3b, emissiveIntensity: 0.18 }));
    }
    return group;
  }

  function buildElectronics(machine, fault) {
    const group = new THREE.Group();
    addConveyor(group, 5.9, 0, PALETTE.primary);
    for (let i = -2; i <= 2; i += 1) {
      group.add(box(0.55, 0.05, 0.38, 0x1cbf7a, i * 0.9, 0.57, -0.02, { emissive: 0x003b27, emissiveIntensity: 0.12 }));
    }
    if (includes(machine, ['pick', 'smt'])) {
      group.add(box(2.4, 1.25, 1.3, fault ? PALETTE.red : 0xe9edff, 0, 1.0, 0, { metalness: 0.15 }));
      group.add(cyl(0.08, 0.08, 1.8, PALETTE.ink, -0.8, 1.45, 0, { rotation: [0, 0, Math.PI / 2] }));
      group.add(box(0.38, 0.38, 0.38, PALETTE.teal, 0.18, 1.28, 0, { emissive: 0x004742, emissiveIntensity: 0.18 }));
    } else if (includes(machine, ['reflow', 'oven'])) {
      group.add(box(3.4, 1.25, 1.25, fault ? PALETTE.red : 0xdfe4ea, 0, 1, 0, { metalness: 0.35 }));
      for (let i = -1; i <= 1; i += 1) group.add(box(0.62, 0.08, 0.08, PALETTE.amber, i * 0.8, 1.35, -0.68, { emissive: 0x7b3f00, emissiveIntensity: 0.45 }));
    } else {
      group.add(box(1.9, 1.1, 1.35, fault ? PALETTE.red : 0xf5f7ff, 0, 0.9, 0, { metalness: 0.18 }));
      group.add(cyl(0.28, 0.18, 0.6, PALETTE.ink, 0, 1.55, 0, { rotation: [Math.PI, 0, 0] }));
      group.add(box(1.0, 0.08, 0.72, 0x6ff7ea, 0, 0.94, -0.72, { emissive: 0x00423d, emissiveIntensity: 0.25 }));
    }
    return group;
  }

  function buildPrecision(machine, fault) {
    const group = new THREE.Group();
    if (includes(machine, ['metrology', 'calibration', 'cmm'])) {
      group.add(box(3.2, 0.25, 2.1, 0xe7ebf2, 0, 0.22, 0, { metalness: 0.25 }));
      group.add(box(0.18, 1.6, 0.18, PALETTE.primary, -1.15, 1.02, 0));
      group.add(box(0.18, 1.6, 0.18, PALETTE.primary, 1.15, 1.02, 0));
      group.add(box(2.7, 0.18, 0.18, PALETTE.primary, 0, 1.82, 0));
      group.add(box(0.28, 0.78, 0.28, PALETTE.teal, 0.25, 1.35, 0, { emissive: 0x00433e, emissiveIntensity: 0.18 }));
    } else if (includes(machine, ['additive', 'print'])) {
      group.add(box(1.8, 2.1, 1.8, fault ? PALETTE.red : 0xf3f5ff, 0, 1.05, 0, { metalness: 0.2 }));
      group.add(box(1.05, 1.25, 0.08, 0x80fff2, 0, 1.08, -0.92, { emissive: 0x00433e, emissiveIntensity: 0.25 }));
      group.add(cyl(0.28, 0.28, 0.5, PALETTE.primary, 0, 0.65, 0));
    } else {
      group.add(box(2.35, 1.55, 1.9, fault ? PALETTE.red : 0xdde4ef, 0, 0.78, 0, { metalness: 0.35 }));
      group.add(box(1.1, 0.7, 0.08, 0x69f4e9, -0.25, 0.95, -0.98, { emissive: 0x00423d, emissiveIntensity: 0.18 }));
      addRobotArm(group, 1.45, 0.55, fault);
    }
    return group;
  }

  function buildLogistics(machine, fault) {
    const group = new THREE.Group();
    if (includes(machine, ['asrs', 'storage', 'rack'])) {
      for (let i = -1; i <= 1; i += 1) {
        group.add(box(0.16, 2.9, 2.4, PALETTE.steel, i * 0.8, 1.45, 0, { metalness: 0.5 }));
        for (let y = 0.7; y <= 2.5; y += 0.55) group.add(box(2.1, 0.08, 2.3, 0xd6dbe8, 0, y, 0));
      }
      group.add(box(0.55, 2.4, 0.45, fault ? PALETTE.red : PALETTE.teal, 1.45, 1.2, 0, { emissive: 0x00433e, emissiveIntensity: 0.18 }));
    } else if (includes(machine, ['agv', 'sort', 'conveyor'])) {
      addConveyor(group, 6.2, 0, PALETTE.teal);
      group.add(box(1.25, 0.45, 0.95, fault ? PALETTE.red : PALETTE.amber, -1.6, 0.45, 0.88));
      group.add(cyl(0.16, 0.16, 0.12, PALETTE.ink, -2.0, 0.2, 1.4, { rotation: [Math.PI / 2, 0, 0] }));
      group.add(cyl(0.16, 0.16, 0.12, PALETTE.ink, -1.2, 0.2, 1.4, { rotation: [Math.PI / 2, 0, 0] }));
      group.add(box(0.82, 0.5, 0.82, PALETTE.primary, 1.5, 0.48, -0.75));
    } else {
      group.add(box(3.8, 1.8, 0.28, 0xdfe4ea, 0, 0.9, -0.8));
      for (let i = -1; i <= 1; i += 1) group.add(box(0.82, 0.72, 0.72, PALETTE.amber, i * 1.05, 0.36, 0.55));
    }
    return group;
  }

  function buildMachine(machine, plant) {
    const fault = machine.status === 'warning' || machine.status === 'maintenance' || Number(machine.health || 100) < 76;
    const group = new THREE.Group();
    let body;
    const plantText = `${plant?.name || ''} ${plant?.domain || ''}`.toLowerCase();
    if (plantText.includes('textile') || plantText.includes('chemical') || includes(machine, ['dye', 'stenter', 'chemical', 'effluent'])) {
      body = buildProcess(machine, fault);
    } else if (plantText.includes('electronics') || includes(machine, ['smt', 'aoi', 'reflow', 'pcb', 'pick'])) {
      body = buildElectronics(machine, fault);
    } else if (plantText.includes('precision') || includes(machine, ['micro', 'laser', 'metrology', 'additive', 'calibration'])) {
      body = buildPrecision(machine, fault);
    } else if (plantText.includes('logistics') || includes(machine, ['asrs', 'agv', 'dock', 'sort'])) {
      body = buildLogistics(machine, fault);
    } else {
      body = buildAutomotive(machine, fault);
    }
    group.add(body);

    const plate = box(4.8, 0.06, 3.3, fault ? 0xffeeee : 0xffffff, 0, 0.03, 0, { roughness: 0.72 });
    plate.position.y = 0.01;
    group.add(plate);
    plate.renderOrder = -1;

    const beaconColor = fault ? PALETTE.red : (machine.status === 'idle' ? PALETTE.amber : PALETTE.teal);
    const beacon = cyl(0.16, 0.16, 0.18, beaconColor, 0, 2.85, 0, { emissive: beaconColor, emissiveIntensity: 0.8 });
    const light = new THREE.PointLight(beaconColor, fault ? 2.2 : 0.9, 6);
    light.position.set(0, 3, 0);
    group.add(beacon, light);
    if (fault) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.45, 0.06, 12, 54), new THREE.MeshBasicMaterial({ color: 0xff2a2a }));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.09;
      group.add(ring);
    }

    const label = labelSprite(machine.name || 'Machine', fault ? '#ba1a1a' : '#191a28');
    label.position.set(0, 3.45, 0);
    group.add(label);

    const indicatorMat = new THREE.MeshStandardMaterial({ color: 0x5efae4, emissive: 0x5efae4, emissiveIntensity: 0.5 });
    const indicator = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), indicatorMat);
    indicator.position.set(0, 3.1, 0.55);
    indicator.userData.isIndicator = true;
    group.add(indicator);

    for (let i = 0; i < 4; i++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: _sensorTex, color: 0x5efae4, transparent: true, opacity: 0.3, depthWrite: false }));
      const angle = (i / 4) * Math.PI * 2;
      sprite.position.set(Math.cos(angle) * 2.2, 0.4 + Math.random() * 1.2, Math.sin(angle) * 2.2);
      sprite.userData.isSensor = true;
      sprite.userData._sIdx = i;
      group.add(sprite);
    }

    group.position.set((machine.posX ?? 0) * 1.6, 0, (machine.posZ ?? 0) * 1.6);
    group.rotation.y = machine.rotation || 0;
    group.userData.machine = machine;
    group.traverse(child => { child.userData.machine = machine; });
    return group;
  }

  function addFactoryShell(scene, plant, machines) {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(85, 55), material(PALETTE.floor, { roughness: 0.82, metalness: 0 }));
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    const grid = new THREE.GridHelper(85, 40, 0xc7c4d7, 0xe7e5f6);
    grid.position.y = 0.015;
    scene.add(grid);
    scene.add(box(85, 0.2, 0.25, 0xd9d8ee, 0, 0.1, -27.5));
    scene.add(box(85, 0.2, 0.25, 0xd9d8ee, 0, 0.1, 27.5));
    scene.add(box(0.25, 0.2, 55, 0xd9d8ee, -42.5, 0.1, 0));
    scene.add(box(0.25, 0.2, 55, 0xd9d8ee, 42.5, 0.1, 0));
    const aisleColor = (plant?.domain || '').toLowerCase().includes('logistics') ? 0xffba4b : PALETTE.teal;
    scene.add(box(78, 0.04, 0.18, aisleColor, 0, 0.035, -9, { emissive: aisleColor, emissiveIntensity: 0.28 }));
    scene.add(box(78, 0.04, 0.18, aisleColor, 0, 0.035, 9, { emissive: aisleColor, emissiveIntensity: 0.28 }));
    scene.add(box(0.18, 0.04, 48, aisleColor, -16, 0.035, 0, { emissive: aisleColor, emissiveIntensity: 0.18 }));
    const plantLabel = labelSprite(`${plant?.name || 'Plant'} · ${machines.length} machines`, '#413fd6');
    plantLabel.position.set(-24, 6.5, -22);
    plantLabel.scale.set(10, 2.4, 1);
    scene.add(plantLabel);
  }

  function renderPlantFloor(options) {
    const host = typeof options.host === 'string' ? document.querySelector(options.host) : options.host;
    if (!host || !window.THREE) return null;
    host.innerHTML = '';
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, options.pixelRatio || 1.7));
    renderer.shadowMap.enabled = true;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(options.background || 0x13131f);
    scene.fog = new THREE.Fog(0x13131f, 50, 110);

    const camera = new THREE.PerspectiveCamera(options.fov || 42, 1, 0.1, 1000);
    camera.position.set(options.cameraX ?? 24, options.cameraY ?? 18, options.cameraZ ?? 34);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.HemisphereLight(0x8a85ff, 0x1a1a2e, 1.2));
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(20, 30, 25);
    key.castShadow = true;
    scene.add(key);
    const fill = new THREE.PointLight(PALETTE.teal, 0.6, 70);
    fill.position.set(-15, 12, -12);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0x5efae4, 0.3);
    rim.position.set(-15, 5, -20);
    scene.add(rim);

    const machines = options.machines || [];
    addFactoryShell(scene, options.plant, machines);

    const group = new THREE.Group();
    machines.forEach(machine => group.add(buildMachine(machine, options.plant)));
    scene.add(group);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let angle = options.initialAngle ?? 0.62;
    let dragging = false;
    let lastX = 0;
    let zoom = 1;

    const tooltip = document.createElement('div');
    tooltip.className = 'fixed z-[90] hidden rounded-lg bg-[#191a28] text-white text-xs font-bold px-3 py-2 pointer-events-none shadow-xl';
    document.body.appendChild(tooltip);

    function resize() {
      const rect = host.getBoundingClientRect();
      renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height));
      camera.aspect = Math.max(1, rect.width) / Math.max(1, rect.height);
      camera.updateProjectionMatrix();
    }

    function pick(event) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObjects(group.children, true).find(hit => hit.object.userData.machine);
    }

    renderer.domElement.addEventListener('pointerdown', event => {
      dragging = true;
      lastX = event.clientX;
      renderer.domElement.setPointerCapture?.(event.pointerId);
    });
    window.addEventListener('pointerup', () => { dragging = false; });
    window.addEventListener('pointermove', event => {
      if (!dragging) return;
      angle += (event.clientX - lastX) * 0.008;
      lastX = event.clientX;
    });
    renderer.domElement.addEventListener('pointermove', event => {
      if (dragging) return;
      const hit = pick(event);
      if (!hit) {
        tooltip.classList.add('hidden');
        return;
      }
      const machine = hit.object.userData.machine;
      tooltip.textContent = `${machine.name} · ${Math.round(machine.health || 0)}% health · ${machine.status || 'running'}`;
      tooltip.style.left = `${Math.min(window.innerWidth - 270, event.clientX + 14)}px`;
      tooltip.style.top = `${Math.max(78, event.clientY + 14)}px`;
      tooltip.classList.remove('hidden');
    });
    renderer.domElement.addEventListener('pointerleave', () => tooltip.classList.add('hidden'));
    let sceneObj = null;
    let clickTimer = null;
    renderer.domElement.addEventListener('click', event => {
      if (clickTimer) {
        clearTimeout(clickTimer);
        clickTimer = null;
        const hit = pick(event);
        if (hit && sceneObj && typeof sceneObj.flyTo === 'function') {
          const m = hit.object.userData.machine;
          sceneObj.flyTo((m.posX ?? 0) * 1.6, (m.posZ ?? 0) * 1.6);
        }
      } else {
        clickTimer = setTimeout(() => {
          clickTimer = null;
          const hit = pick(event);
          if (hit && typeof options.onSelect === 'function') options.onSelect(hit.object.userData.machine);
        }, 280);
      }
    });
    renderer.domElement.addEventListener('wheel', event => {
      event.preventDefault();
      zoom = Math.max(0.7, Math.min(1.45, zoom + event.deltaY * 0.0015));
    }, { passive: false });

    function animate() {
      const frame = requestAnimationFrame(animate);
      renderPlantFloor._frames.set(host, frame);
      const sceneData = renderPlantFloor._scenes.get(host);
      if (sceneData) sceneData._tickFly();
      const radius = (options.radius || 22) * zoom;
      camera.position.x = Math.sin(angle) * radius;
      camera.position.z = Math.cos(angle) * radius;
      camera.position.y = (options.cameraY ?? 16) * zoom;
      camera.lookAt(0, 0, 0);
      group.children.forEach((machineGroup, index) => {
        const machine = machineGroup.userData.machine || {};
        if (machine.status !== 'running') machineGroup.rotation.y += 0.006;
        machineGroup.position.y = Math.sin(Date.now() * 0.0015 + index) * 0.035;
      });
      _beltTex.offset.x += 0.004;
      group.children.forEach(mg => {
        const m = mg.userData.machine || {};
        if (includes(m, ['robot', 'weld', 'welder'])) {
          mg.traverse(child => {
            if (child.userData.isArm) {
              child.rotation.z = child.userData._armBaseRot + Math.sin(Date.now() * 0.002 + child.id) * 0.12;
            }
          });
        }
      });
      group.children.forEach((mg, i) => {
        const m = mg.userData.machine || {};
        if (includes(m, ['agv'])) {
          const t = Date.now() * 0.0005 + i;
          mg.position.x = (m.posX ?? 0) * 1.6 + Math.sin(t) * 0.5;
          mg.position.z = (m.posZ ?? 0) * 1.3 + Math.cos(t) * 0.5;
        }
      });
      group.children.forEach(mg => {
        mg.traverse(child => {
          if (child.userData.isIndicator) {
            child.material.emissiveIntensity = 0.3 + Math.sin(Date.now() * 0.003 + child.id) * 0.2;
          }
        });
      });
      group.children.forEach(mg => {
        mg.traverse(child => {
          if (child.userData.isSensor) {
            child.material.opacity = 0.2 + Math.sin(Date.now() * 0.004 + (child.userData._sIdx || 0)) * 0.15;
          }
        });
      });
      renderer.render(scene, camera);
    }

    const previousFrame = renderPlantFloor._frames.get(host);
    if (previousFrame) cancelAnimationFrame(previousFrame);
    const ro = new ResizeObserver(() => resize());
    ro.observe(host);
    resize();
    animate();

    const defaultRadius = options.radius || 28;
    const defaultCamY = options.cameraY ?? 18;
    let targetZoom = 1, flyTarget = null, flyProgress = 0;

    sceneObj = {
      renderer, scene, camera, group,
      flyTo(x, z) {
        const targetAngle = Math.atan2(x, z);
        targetZoom = 0.65;
        flyTarget = { x, z, startAngle: angle, targetAngle, startZoom: zoom };
        flyProgress = 0;
      },
      resetCamera() {
        targetZoom = 1;
        flyTarget = { x: 0, z: 0, startAngle: angle, targetAngle: 0.72, startZoom: zoom };
        flyProgress = 0;
      },
      _tickFly() {
        if (!flyTarget) return;
        flyProgress += 0.035;
        if (flyProgress >= 1) {
          angle = flyTarget.targetAngle;
          zoom = targetZoom;
          flyTarget = null;
          return;
        }
        const t = 1 - Math.pow(1 - flyProgress, 3);
        angle = flyTarget.startAngle + (flyTarget.targetAngle - flyTarget.startAngle) * t;
        zoom = flyTarget.startZoom + (targetZoom - flyTarget.startZoom) * t;
      },
      destroy() {
        const frame = renderPlantFloor._frames.get(host);
        if (frame) cancelAnimationFrame(frame);
        ro.disconnect();
        tooltip.remove();
        renderer.dispose();
        host.innerHTML = '';
      }
    };
    renderPlantFloor._scenes.set(host, sceneObj);
    return sceneObj;
  }

  renderPlantFloor._frames = new WeakMap();
  renderPlantFloor._scenes = new WeakMap();
  window.YMFactory3D = { renderPlantFloor, buildMachine };
})();

/* graph.js — the work as a scene graph.

   Projects are nodes. So are the tools and methods they are built from.
   An edge means "this project uses this thing". Tools shared between
   projects therefore pull those projects together, which is the point:
   the layout shows what the work actually has in common.
   Drag a node to move it, click one to read about it. */

(function () {
  var cv = document.getElementById('graph');
  if (!cv) return;

  var ctx = cv.getContext('2d');
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function css(v) {
    return getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  }
  var col = {};
  function readColors() {
    col.proj = css('--node');
    col.tool = css('--node-tool');
    col.edge = css('--node-tool');
    col.text = css('--text');
    col.dim  = css('--dim');
    col.bg   = css('--bg');
  }

  /* ── data ── */
  var projects = [
    { id: 'ovmm', label: 'Open-Vocab Mobile Manipulation', kind: 'project',
      meta: 'Robotics · lab project · ongoing',
      stack: 'ROS 2 · Mask3D · SAM 3 · Nav2 · AnyGrasp',
      desc: 'Open-vocabulary manipulation on the Toyota HSR. Scene graph built from iPad scans, Dockerised inference over HTTP, geometric to AnyGrasp pipeline.',
      foot: 'University of Bonn',
      link: 'projects/ovmm.html', linkText: 'Full details \u2192',
      tools: ['ros2', 'mask3d', 'sam3', 'nav2', 'anygrasp', 'docker', 'scenegraph'] },

    { id: 'moro', label: 'Geospatial LiDAR Pipeline', kind: 'project',
      meta: '3D · LiDAR · master’s project · ongoing',
      stack: 'PDAL · Open3D · SMRF · CloudCompare',
      desc: 'Streaming point-cloud processing over a 10 km Bonn corridor (ALS + MMS). GPU tensor ops, ground filtering, parallel tiled processing.',
      foot: 'University of Bonn',
      link: 'projects/lidar-pipeline.html', linkText: 'Full details \u2192',
      tools: ['pdal', 'open3d', 'smrf', 'pointcloud', 'cpp'] },

    { id: 'sfm', label: 'casualSfM', kind: 'project',
      meta: 'Vision · reconstruction · personal',
      stack: 'Python · OpenCV · NumPy',
      desc: 'Incremental Structure-from-Motion. SIFT matching, RANSAC essential matrix, triangulation, bundle adjustment. Written up chapter by chapter in the build log.',
      foot: 'personal project',
      link: 'projects/casualsfm.html', linkText: 'Full details \u2192',
      tools: ['python', 'opencv', 'numpy', 'reconstruction', 'sfm'] },

    { id: 'ekf', label: 'EKF SLAM (slam-factory)', kind: 'project',
      meta: 'Robotics · SLAM · personal · ongoing',
      stack: 'Python · ROS 2 · NumPy',
      desc: 'Filter-based SLAM framework with a clean Python core and a thin ROS 2 wrapper. 25-test suite, written after Thrun’s Probabilistic Robotics.',
      foot: 'personal project',
      link: 'projects/slam-factory.html', linkText: 'Full details \u2192',
      tools: ['python', 'ros2', 'numpy', 'slam'] }
  ];

  var toolLabels = {
    ros2: 'ROS 2', mask3d: 'Mask3D', sam3: 'SAM 3', nav2: 'Nav2',
    anygrasp: 'AnyGrasp', docker: 'Docker', scenegraph: 'Scene Graph',
    pdal: 'PDAL', open3d: 'Open3D', smrf: 'SMRF', pointcloud: 'Point Cloud',
    cpp: 'C++17', python: 'Python', opencv: 'OpenCV', numpy: 'NumPy',
    reconstruction: '3D Recon', sfm: 'SfM', slam: 'SLAM'
  };

  /* ── build nodes + edges ── */
  var nodes = [], nodeIndex = {}, edges = [];

  function addNode(id, label, kind, data) {
    if (nodeIndex[id] != null) return nodeIndex[id];
    nodeIndex[id] = nodes.length;
    nodes.push({
      id: id, label: label, kind: kind, data: data || null,
      x: cv.clientWidth / 2 + (Math.random() - 0.5) * 200,
      y: cv.clientHeight / 2 + (Math.random() - 0.5) * 160,
      vx: 0, vy: 0, r: kind === 'project' ? 7 : 4, deg: 0, fx: null, fy: null
    });
    return nodeIndex[id];
  }

  projects.forEach(function (p) { addNode(p.id, p.label, 'project', p); });

  /* seed the projects on a circle rather than at random, so the layout
     settles the same readable way every load */
  (function seed() {
    var cx = cv.clientWidth / 2, cy = cv.clientHeight / 2;
    var rad = Math.min(cx, cy) * 0.62;
    projects.forEach(function (p, i) {
      var a = (i / projects.length) * Math.PI * 2 - Math.PI / 2;
      var n = nodes[nodeIndex[p.id]];
      n.x = cx + Math.cos(a) * rad;
      n.y = cy + Math.sin(a) * rad * 0.8;
    });
  })();

  projects.forEach(function (p) {
    p.tools.forEach(function (t) {
      addNode(t, toolLabels[t] || t, 'tool');
      edges.push([nodeIndex[p.id], nodeIndex[t]]);
      nodes[nodeIndex[p.id]].deg++;
      nodes[nodeIndex[t]].deg++;
    });
  });
  /* a tool's dot grows with how many projects lean on it */
  nodes.forEach(function (n) { if (n.kind === 'tool') n.r = 3.5 + Math.min(n.deg, 4) * 1.2; });
  edges.forEach(function (e) { e.shared = nodes[e[1]].deg > 1; });

  var W, H;
  function resize() {
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * DPR; cv.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  /* ── force layout ── */
  function step() {
    var cx = W / 2, cy = H / 2;
    for (var i = 0; i < nodes.length; i++) {
      var a = nodes[i];
      for (var j = i + 1; j < nodes.length; j++) {
        var b = nodes[j];
        var dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy || 0.01;
        var d = Math.sqrt(d2);
        var f = (a.kind === 'project' && b.kind === 'project' ? 7000 : 1500) / d2;
        var fx = dx / d * f, fy = dy / d * f;
        a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
      }
    }
    edges.forEach(function (e) {
      var a = nodes[e[0]], b = nodes[e[1]];
      var dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 0.01;
      var f = (d - 74) * 0.012, fx = dx / d * f, fy = dy / d * f;
      a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
    });
    nodes.forEach(function (n) {
      n.vx += (cx - n.x) * 0.0016; n.vy += (cy - n.y) * 0.0016;
      n.vx *= 0.86; n.vy *= 0.86;
      if (n.fx != null) { n.x = n.fx; n.y = n.fy; n.vx = n.vy = 0; }
      else { n.x += n.vx; n.y += n.vy; }
      /* keep nodes off the edges — project nodes further in, so their
         labels (drawn above and centred) stay inside the box */
      var mx = n.kind === 'project' ? Math.min(W < 480 ? 58 : 118, W / 3) : 16;
      var my = n.kind === 'project' ? 26 : 16;
      n.x = Math.max(mx, Math.min(W - mx, n.x));
      n.y = Math.max(my, Math.min(H - my, n.y));
    });
  }

  var hover = null, selected = null;
  function selIdx() { return selected ? nodeIndex[selected.id] : -1; }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    edges.forEach(function (e) {
      var a = nodes[e[0]], b = nodes[e[1]];
      var active = (e[0] === selIdx() || e[1] === selIdx()) ||
                   (hover && (a === hover || b === hover));
      ctx.strokeStyle = active ? col.proj : col.edge;
      ctx.globalAlpha = active ? 0.85 : (e.shared ? 0.6 : 0.32);
      ctx.lineWidth = active ? 1.2 : (e.shared ? 1 : 0.7);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    });
    ctx.globalAlpha = 1;

    nodes.forEach(function (n) {
      var on = (n === selected || n === hover);
      var c = n.kind === 'project' ? col.proj : col.tool;
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, 7);
      ctx.fillStyle = c; ctx.fill();
      if (n.kind === 'project') { ctx.lineWidth = 1.5; ctx.strokeStyle = col.bg; ctx.stroke(); }
      if (on) {
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 4, 0, 7);
        ctx.strokeStyle = c; ctx.lineWidth = 1; ctx.stroke();
      }
      if (n.kind === 'project' || on) {
        ctx.font = (n.kind === 'project' ? '600 13px ' : '400 12px ') +
                   'Inter, "Source Sans 3", "Segoe UI", system-ui, Arial, sans-serif';
        ctx.fillStyle = n.kind === 'project' ? col.text : col.dim;
        ctx.textAlign = 'center';
        var max = W < 480 ? 15 : (W < 700 ? 26 : 34);   /* shorter labels on narrow canvases */
        var label = n.label.length > max ? n.label.slice(0, max - 2) + '…' : n.label;
        ctx.fillText(label, n.x, n.y - n.r - 6);
      }
    });
  }

  function loop() { step(); draw(); requestAnimationFrame(loop); }

  /* ── interaction ── */
  function pos(e) {
    var r = cv.getBoundingClientRect();
    var t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  }
  function pick(p) {
    for (var i = nodes.length - 1; i >= 0; i--) {
      var n = nodes[i], dx = p.x - n.x, dy = p.y - n.y;
      if (dx * dx + dy * dy <= (n.r + 7) * (n.r + 7)) return n;
    }
    return null;
  }

  var drag = null, dragMoved = false;
  cv.addEventListener('pointermove', function (e) {
    var p = pos(e);
    if (drag) { drag.fx = p.x; drag.fy = p.y; dragMoved = true; return; }
    var h = pick(p);
    if (h !== hover) { hover = h; cv.style.cursor = h ? 'pointer' : 'grab'; }
    if (reduce) draw();
  });
  cv.addEventListener('pointerdown', function (e) {
    var p = pos(e), n = pick(p);
    if (n) { drag = n; n.fx = p.x; n.fy = p.y; dragMoved = false; cv.setPointerCapture(e.pointerId); }
  });
  cv.addEventListener('pointerup', function () {
    if (!drag) return;
    if (!dragMoved) openPanel(drag);
    drag.fx = drag.fy = null; drag = null;
    if (reduce) draw();
  });
  cv.addEventListener('pointerleave', function () { hover = null; });

  /* ── detail panel ── */
  var panel = document.getElementById('node-panel');
  var pk = document.getElementById('np-kind'), pt = document.getElementById('np-title'),
      ps = document.getElementById('np-stack'), pd = document.getElementById('np-desc'),
      pf = document.getElementById('np-foot'), pl = document.getElementById('np-link');

  function openPanel(n) {
    selected = n;
    if (n.kind === 'project' && n.data) {
      var d = n.data;
      pk.textContent = d.meta; pt.textContent = d.label;
      ps.textContent = d.stack; pd.textContent = d.desc; pf.textContent = d.foot;
      if (d.link) { pl.textContent = d.linkText; pl.href = d.link; } else { pl.textContent = ''; }
    } else {
      var usedBy = projects.filter(function (p) { return p.tools.indexOf(n.id) >= 0; })
                           .map(function (p) { return p.label; });
      pk.textContent = 'tool / method';
      pt.textContent = n.label;
      ps.textContent = 'used by ' + usedBy.length + ' project' + (usedBy.length > 1 ? 's' : '');
      pd.textContent = usedBy.join(' · ');
      pf.textContent = 'node degree ' + n.deg;
      pl.textContent = '';
    }
    panel.classList.add('open');
    if (reduce) draw();
  }
  document.getElementById('np-close').addEventListener('click', function () {
    panel.classList.remove('open'); selected = null;
    if (reduce) draw();
  });

  readColors(); resize();
  new ResizeObserver(function () { resize(); if (reduce) draw(); }).observe(cv);
  new MutationObserver(function () { readColors(); if (reduce) draw(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  if (reduce) {
    for (var s = 0; s < 260; s++) step();
    draw();
  } else {
    loop();
  }
})();

/* site.js — theme toggle + the point-cloud background. Shared by every page. */

(function () {
  /* ── theme ──────────────────────────────────────────────────────────── */
  var btn = document.getElementById('theme-toggle');
  if (btn) {
    var sync = function () {
      var dark = document.documentElement.getAttribute('data-theme') === 'dark';
      btn.setAttribute('aria-checked', dark ? 'true' : 'false');
      btn.setAttribute('title', dark ? 'Switch to light mode' : 'Switch to dark mode');
    };
    sync();
    btn.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('ps-theme', next); } catch (e) {}
      sync();
    });
  }

  /* ── point cloud ────────────────────────────────────────────────────────
     A drifting set of points with edges between near neighbours; points
     near the cursor light up, as if newly observed. Kept faint on purpose:
     it should read as texture, not as decoration.
     ─────────────────────────────────────────────────────────────────────── */
  var cv = document.getElementById('cloud');
  if (!cv) return;

  var ctx = cv.getContext('2d');
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W, H, pts = [], N;

  function css(v) {
    return getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  }
  var col = {};
  function readColors() {
    col.point = css('--point');
    col.lit   = css('--point-lit');
    col.edge  = css('--point');
  }

  function resize() {
    W = cv.width  = innerWidth  * DPR;
    H = cv.height = innerHeight * DPR;
    cv.style.width  = innerWidth + 'px';
    cv.style.height = innerHeight + 'px';
    N = Math.min(120, Math.floor(innerWidth / 12));
    pts = [];
    for (var i = 0; i < N; i++) {
      pts.push({
        x: Math.random() * W, y: Math.random() * H, z: Math.random(),
        vx: (Math.random() - 0.5) * 0.16 * DPR,
        vy: (Math.random() - 0.5) * 0.16 * DPR
      });
    }
  }

  var mouse = { x: -9999, y: -9999 };
  window.addEventListener('pointermove', function (e) {
    mouse.x = e.clientX * DPR; mouse.y = e.clientY * DPR;
  }, { passive: true });
  window.addEventListener('pointerleave', function () { mouse.x = mouse.y = -9999; });

  function frame() {
    ctx.clearRect(0, 0, W, H);
    var linkD2 = (110 * DPR) * (110 * DPR);

    ctx.strokeStyle = col.edge;
    ctx.lineWidth = 0.6 * DPR;
    for (var i = 0; i < N; i++) {
      var p = pts[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x += W; if (p.x > W) p.x -= W;
      if (p.y < 0) p.y += H; if (p.y > H) p.y -= H;
      for (var j = i + 1; j < N; j++) {
        var q = pts[j];
        var dx = p.x - q.x, dy = p.y - q.y, d2 = dx * dx + dy * dy;
        if (d2 < linkD2) {
          ctx.globalAlpha = (1 - d2 / linkD2) * 0.22;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        }
      }
    }

    var litD2 = (130 * DPR) * (130 * DPR);
    for (var k = 0; k < N; k++) {
      var pt = pts[k];
      var mdx = pt.x - mouse.x, mdy = pt.y - mouse.y;
      var near = (mdx * mdx + mdy * mdy) < litD2;
      var r = (0.7 + pt.z * 1.3) * DPR * (near ? 1.7 : 1);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
      ctx.fillStyle = near ? col.lit : col.point;
      ctx.globalAlpha = near ? 0.9 : (0.3 + pt.z * 0.35);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (!reduce) requestAnimationFrame(frame);
  }

  readColors(); resize();
  window.addEventListener('resize', function () { readColors(); resize(); if (reduce) frame(); });
  new MutationObserver(function () { readColors(); if (reduce) frame(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  frame();
})();

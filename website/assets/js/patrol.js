(function () {
  "use strict";
  var stage = document.getElementById("merrow-patrol");
  if (!stage) return;
  var cats = Array.from(stage.querySelectorAll(".patrol-cat"));
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var timer = null, visible = false, active = 0, step = 0, resting = 0, paused = false, pauseTimer = null;
  var laneWidth = 0, catWidth = 0, stride = 0, stepCount = 0;
  var note = document.createElement("span");
  note.className = "patrol-note";
  note.textContent = "> don't touch the security layer.";
  note.hidden = true;
  stage.appendChild(note);
  function measure() {
    laneWidth = stage.clientWidth;
    catWidth = parseFloat(getComputedStyle(cats[0]).width);
    // Use the existing blank space down to the viewport bottom. This is
    // normal document flow, below the content, never a fixed overlay.
    var pageTop = stage.getBoundingClientRect().top + window.scrollY;
    var blankHeight = Math.max(catWidth + 20, window.innerHeight - pageTop);
    stage.style.height = Math.ceil(blankHeight) + "px";
    // Whole-pixel jumps; roughly 7-8 seconds per crossing.
    stride = Math.max(4, Math.ceil((laneWidth + catWidth) / 80 / 4) * 4);
    stepCount = Math.ceil((laneWidth + catWidth) / stride);
  }
  function paint() {
    cats.forEach(function (cat, index) { cat.hidden = resting > 0 || index !== active; });
    var x = active === 0 ? -catWidth + step * stride : laneWidth - step * stride;
    cats[active].style.transform = "translateX(" + x + "px)";
  }
  function stop() { clearTimeout(timer); timer = null; }
  function tick() {
    timer = null;
    if (document.hidden || !visible || reducedMotion.matches || paused) return;
    if (resting > 0) {
      resting--;
      if (resting === 0) { active = 1 - active; step = 0; }
    } else {
      step++;
      if (step > stepCount) resting = 6;
    }
    paint();
    timer = setTimeout(tick, 100);
  }
  function sync() {
    stop();
    if (reducedMotion.matches) {
      // Respect reduced motion without leaving a cat parked in the middle.
      cats.forEach(function (cat) { cat.hidden = true; });
    } else {
      paint();
      if (visible && !document.hidden && !paused) timer = setTimeout(tick, 100);
    }
  }
  var observer = new IntersectionObserver(function (entries) {
    visible = entries[0].isIntersecting;
    sync();
  });
  var resizeObserver = new ResizeObserver(function () {
    var previousWidth = laneWidth;
    measure();
    if (previousWidth !== laneWidth) { step = 0; resting = 0; }
    sync();
  });
  window.addEventListener("resize", function () { measure(); sync(); });
  document.addEventListener("visibilitychange", sync);
  reducedMotion.addEventListener("change", sync);
  cats.forEach(function (cat) {
    cat.addEventListener("click", function () {
      if (cat.hidden || reducedMotion.matches) return;
      stop(); paused = true; clearTimeout(pauseTimer);
      var x = active === 0 ? -catWidth + step * stride : laneWidth - step * stride;
      note.style.left = Math.max(2, Math.min(laneWidth - 175, x)) + "px";
      note.hidden = false;
      pauseTimer = setTimeout(function () { note.hidden = true; paused = false; sync(); }, 500);
    });
  });
  measure(); paint();
  observer.observe(stage);
  resizeObserver.observe(stage);
}());

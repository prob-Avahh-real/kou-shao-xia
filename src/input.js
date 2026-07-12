/** 触摸摇杆、键盘、麦克风口哨、戒指/手杖体感 */
export function createInput() {
  const state = {
    move: { x: 0, y: 0 },
    ability: false,
    steer: { x: 0, y: 0 },
    keys: new Set(),
    micActive: false,
    whistleLevel: 0
  };

  let stickActive = false;
  let stickOrigin = { x: 0, y: 0 };
  let steerActive = false;
  let steerOrigin = { x: 0, y: 0 };
  let analyser = null;
  let audioCtx = null;

  const onKey = (e, down) => {
    const k = e.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " ", "shift", "q", "e"].includes(k)) {
      e.preventDefault();
    }
    if (down) state.keys.add(k);
    else state.keys.delete(k);
    updateKeyboardMove();
  };

  function updateKeyboardMove() {
    let x = 0, y = 0;
    if (state.keys.has("w") || state.keys.has("arrowup")) y -= 1;
    if (state.keys.has("s") || state.keys.has("arrowdown")) y += 1;
    if (state.keys.has("a") || state.keys.has("arrowleft")) x -= 1;
    if (state.keys.has("d") || state.keys.has("arrowright")) x += 1;
    const d = Math.hypot(x, y) || 1;
    state.move = { x: x / d * (d > 1 ? 1 : d), y: y / d * (d > 1 ? 1 : d) };
    state.ability = state.keys.has(" ") || state.keys.has("shift");
    if (state.ability && (x || y)) state.steer = { x, y };
  }

  window.addEventListener("keydown", e => onKey(e, true));
  window.addEventListener("keyup", e => onKey(e, false));

  function bindStick(el) {
    const knob = el.querySelector(".knob");
    const maxR = 42;

    const setStick = (cx, cy, px, py) => {
      let dx = px - cx, dy = py - cy;
      const d = Math.hypot(dx, dy);
      if (d > maxR) { dx = dx / d * maxR; dy = dy / d * maxR; }
      knob.style.transform = `translate(${dx}px,${dy}px)`;
      state.move = d < 6 ? { x: 0, y: 0 } : { x: dx / maxR, y: dy / maxR };
    };

    const start = (x, y) => {
      stickActive = true;
      const r = el.getBoundingClientRect();
      stickOrigin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      setStick(stickOrigin.x, stickOrigin.y, x, y);
    };
    const move = (x, y) => { if (stickActive) setStick(stickOrigin.x, stickOrigin.y, x, y); };
    const end = () => {
      stickActive = false;
      knob.style.transform = "translate(0,0)";
      state.move = { x: 0, y: 0 };
    };

    el.addEventListener("touchstart", e => { e.preventDefault(); start(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
    el.addEventListener("touchmove", e => { e.preventDefault(); move(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
    el.addEventListener("touchend", end);
    el.addEventListener("mousedown", e => start(e.clientX, e.clientY));
    window.addEventListener("mousemove", e => move(e.clientX, e.clientY));
    window.addEventListener("mouseup", end);
  }

  function bindSteerZone(el) {
    const maxR = 50;
    const setSteer = (cx, cy, px, py) => {
      let dx = px - cx, dy = py - cy;
      const d = Math.hypot(dx, dy);
      if (d > maxR) { dx = dx / d * maxR; dy = dy / d * maxR; }
      state.steer = d < 8 ? { x: 0, y: 0 } : { x: dx / maxR, y: dy / maxR };
    };
    const start = (x, y) => {
      steerActive = true;
      state.ability = true;
      const r = el.getBoundingClientRect();
      steerOrigin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      setSteer(steerOrigin.x, steerOrigin.y, x, y);
    };
    const move = (x, y) => { if (steerActive) setSteer(steerOrigin.x, steerOrigin.y, x, y); };
    const end = () => {
      steerActive = false;
      state.ability = false;
      state.steer = { x: 0, y: 0 };
    };
    el.addEventListener("touchstart", e => { e.preventDefault(); start(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
    el.addEventListener("touchmove", e => { e.preventDefault(); move(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
    el.addEventListener("touchend", end);
    el.addEventListener("mousedown", e => start(e.clientX, e.clientY));
    window.addEventListener("mousemove", e => { if (steerActive) move(e.clientX, e.clientY); });
    window.addEventListener("mouseup", e => { if (steerActive) end(); });
  }

  function bindAbilityBtn(btn) {
    const down = () => { state.ability = true; };
    const up = () => { state.ability = false; state.steer = { x: 0, y: 0 }; };
    btn.addEventListener("touchstart", e => { e.preventDefault(); down(); }, { passive: false });
    btn.addEventListener("touchend", up);
    btn.addEventListener("mousedown", down);
    btn.addEventListener("mouseup", up);
    btn.addEventListener("mouseleave", up);
  }

  async function enableMic() {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.35;
      audioCtx.createMediaStreamSource(stream).connect(analyser);
      state.micActive = true;
      return true;
    } catch {
      return false;
    }
  }

  function readWhistle() {
    if (!analyser) return 0;
    const buf = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buf);
    let rms = 0;
    for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / buf.length);
    state.whistleLevel = rms;
    return rms > 0.04 ? 1 : 0;
  }

  function bindSensor(btn) {
    let tilt = { x: 0, y: 0 };
    btn?.addEventListener("click", async () => {
      if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
        try {
          const p = await DeviceOrientationEvent.requestPermission();
          if (p !== "granted") return;
        } catch { return; }
      }
      window.addEventListener("deviceorientation", e => {
        tilt.x = clamp((e.gamma ?? 0) / 30, -1, 1);
        tilt.y = clamp((e.beta ?? 0) / 40, -1, 1);
      });
      btn.classList.add("active");
      btn.textContent = "⌚ 体感中";
    });
    return () => {
      if (btn?.classList.contains("active")) {
        state.move = { x: tilt.x, y: tilt.y };
        if (state.ability) state.steer = { x: tilt.x, y: tilt.y };
      }
    };
  }

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  return {
    state,
    bindStick,
    bindSteerZone,
    bindAbilityBtn,
    enableMic,
    readWhistle,
    bindSensor,
    isCyclePrev: () => state.keys.has("q"),
    isCycleNext: () => state.keys.has("e")
  };
}

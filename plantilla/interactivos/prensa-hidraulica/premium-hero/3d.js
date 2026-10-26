const T3_ROOT = Math.sqrt(1.6);
const T3_TAU = Math.PI * 2;
const T3_RAD = Math.PI / 180;
const T3_LB = [0, 0.2, 0.42, 0.62];
const T3_EB = [0.25, 0.5, 0.75];
const T3_SOFT = 0.035;
const T3_LEVELS = 32;
const T3_Q = 64;
const t3State = { detail: 1, exact: false };

function t3Num(v) {
  if (t3State.exact) return String(Math.round(v * 1e6) / 1e6);
  let t = Math.round(v * 100);
  if (t === 0) return "0";
  let sign = "";
  if (t < 0) {
    sign = "-";
    t = -t;
  }
  const whole = Math.floor(t / 100);
  const part = t - whole * 100;
  if (part === 0) return sign + whole;
  if (part < 10) return sign + whole + ".0" + part;
  return sign + whole + "." + (part % 10 === 0 ? part / 10 : part);
}

function t3Fix(v, scale) {
  const t = Math.round(v * scale) / scale;
  return t === 0 ? "0" : String(t);
}

function t3Path(buf, count, closed) {
  if (count < 2) return "";
  let s = "M" + t3Num(buf[0]) + " " + t3Num(buf[1]);
  for (let i = 1; i < count; i++) s += "L" + t3Num(buf[2 * i]) + " " + t3Num(buf[2 * i + 1]);
  return closed ? s + "Z" : s;
}

const t3Step = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function t3Level(score, bands) {
  let u = 0;
  for (let i = 0; i < bands.length; i++) u += t3Step(bands[i] - T3_SOFT, bands[i] + T3_SOFT, score);
  return Math.round(u * T3_Q);
}

function t3Grow(f, name, size, Kind) {
  if (!f[name] || f[name].length < size) f[name] = new Kind(Math.max(size, f[name] ? f[name].length * 2 : 16));
  return f[name];
}

function t3Box(buf, count, box) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let i = 0; i < count; i++) {
    const x = buf[2 * i];
    const y = buf[2 * i + 1];
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  box[0] = x0;
  box[1] = y0;
  box[2] = x1;
  box[3] = y1;
}

function t3Unit(v) {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

function t3Rot(axis, degrees) {
  const [x, y, z] = t3Unit(axis);
  const c = Math.cos(degrees * T3_RAD);
  const s = Math.sin(degrees * T3_RAD);
  const C = 1 - c;
  return new Float64Array([c + x * x * C, x * y * C - z * s, x * z * C + y * s, y * x * C + z * s, c + y * y * C, y * z * C - x * s, z * x * C - y * s, z * y * C + x * s, c + z * z * C]);
}

function t3Mul(A, B) {
  const out = new Float64Array(9);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) out[r * 3 + c] = A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c];
  return out;
}

const t3Apply = (R, v) => [R[0] * v[0] + R[1] * v[1] + R[2] * v[2], R[3] * v[0] + R[4] * v[1] + R[5] * v[2], R[6] * v[0] + R[7] * v[1] + R[8] * v[2]];

const T3_EYE = new Float64Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);

function t3Camera(P, pose) {
  const a = (P.azimuth ?? 45) * T3_RAD;
  const e = (P.elevation ?? 30) * T3_RAD;
  const k = P.scale * T3_ROOT;
  const sa = Math.sin(a);
  const ca = Math.cos(a);
  const se = Math.sin(e);
  const ce = Math.cos(e);
  const cam = { m: new Float64Array(6), ox: 0, oy: 0, V: [0, 0, 0], L: [0, 0, 0], k, turn: 0, R: T3_EYE, t: [0, 0, 0], lx: 0, ly: 1, sa, ca, se, ce, origin: P.origin };
  const lw = Math.hypot(sa, ca, 1.2);
  if (pose && pose.R && !(pose.turn !== undefined && pose.root)) {
    const R = pose.R;
    const t = pose.t ?? [0, 0, 0];
    const r0 = [sa * k, -ca * k, 0];
    const r1 = [ca * se * k, sa * se * k, -ce * k];
    for (let c = 0; c < 3; c++) {
      cam.m[c] = r0[0] * R[c] + r0[1] * R[3 + c] + r0[2] * R[6 + c];
      cam.m[3 + c] = r1[0] * R[c] + r1[1] * R[3 + c] + r1[2] * R[6 + c];
    }
    cam.ox = P.origin[0] + r0[0] * t[0] + r0[1] * t[1] + r0[2] * t[2];
    cam.oy = P.origin[1] + r1[0] * t[0] + r1[1] * t[1] + r1[2] * t[2];
    const V = [ca * ce, sa * ce, se];
    const L = [-sa / lw, ca / lw, 1.2 / lw];
    for (let c = 0; c < 3; c++) {
      cam.V[c] = R[c] * V[0] + R[3 + c] * V[1] + R[6 + c] * V[2];
      cam.L[c] = R[c] * L[0] + R[3 + c] * L[1] + R[6 + c] * L[2];
    }
    cam.R = R;
    cam.t = t;
  } else {
    const turn = pose ? pose.turn ?? 0 : 0;
    const pivot = pose && pose.pivot ? pose.pivot : [0, 0];
    const b = a - turn * T3_RAD;
    const sb = Math.sin(b);
    const cb = Math.cos(b);
    cam.m[0] = sb * k;
    cam.m[1] = -cb * k;
    cam.m[2] = 0;
    cam.m[3] = cb * se * k;
    cam.m[4] = sb * se * k;
    cam.m[5] = -ce * k;
    cam.ox = P.origin[0] + (pivot[0] * sa - pivot[1] * ca) * k;
    cam.oy = P.origin[1] + (pivot[0] * ca + pivot[1] * sa) * se * k;
    cam.V = [cb * ce, sb * ce, se];
    cam.L = [-sb / lw, cb / lw, 1.2 / lw];
    cam.turn = turn;
    const c = Math.cos(turn * T3_RAD);
    const s = Math.sin(turn * T3_RAD);
    cam.R = new Float64Array([c, -s, 0, s, c, 0, 0, 0, 1]);
    cam.t = [pivot[0], pivot[1], 0];
  }
  const lh = Math.hypot(cam.L[0], cam.L[1]) || 1;
  cam.lx = cam.L[0] / lh;
  cam.ly = cam.L[1] / lh;
  return cam;
}

function t3Quat(q) {
  const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  const x = q[0] / l;
  const y = q[1] / l;
  const z = q[2] / l;
  const w = q[3] / l;
  return new Float64Array([1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w), 2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w), 2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]);
}

function t3FreeRot(v) {
  if (v.R) return v.R instanceof Float64Array ? v.R : Float64Array.from(v.R);
  if (v.q) return t3Quat(v.q);
  if (v.axis) return t3Rot(v.axis, v.angle ?? 0);
  return T3_EYE;
}

function t3Poses(groups, values) {
  const get = (name) => (values instanceof Map ? values.get(name) : values ? values[name] : undefined) ?? 0;
  const list = [];
  for (let index = 0; index < groups.length; index++) {
    const g = groups[index];
    const v = get(g.name);
    let parent = g.parent === undefined || g.parent === null || g.parent < 0 ? null : list[g.parent];
    let po = parent ? groups[g.parent].origin : [0, 0, 0];
    let R = T3_EYE;
    let t = [g.origin[0] - po[0], g.origin[1] - po[1], g.origin[2] - po[2]];
    if (g.kind === "turn") R = t3Rot([0, 0, 1], v);
    else if (g.kind === "hinge") R = t3Rot(g.axis, v);
    else if (g.kind === "slide") {
      const d = t3Unit(g.direction);
      t[0] += d[0] * v;
      t[1] += d[1] * v;
      t[2] += d[2] * v;
    } else if (g.kind === "free" && v && typeof v === "object") {
      R = t3FreeRot(v);
      if (v.world) {
        parent = null;
        po = [0, 0, 0];
        t = [g.origin[0], g.origin[1], g.origin[2]];
      }
      if (v.t) {
        t[0] += v.t[0];
        t[1] += v.t[1];
        t[2] += v.t[2];
      }
    }
    if (!parent) {
      const pose = { R, t, value: v };
      if (g.kind === "turn") Object.assign(pose, { turn: v, pivot: [g.origin[0], g.origin[1]], root: true });
      list.push(pose);
      continue;
    }
    const tw = t3Apply(parent.R, t);
    list.push({ R: t3Mul(parent.R, R), t: [tw[0] + parent.t[0], tw[1] + parent.t[1], tw[2] + parent.t[2]], value: v });
  }
  return list;
}

function t3PosesMap(groups, values) {
  const list = t3Poses(groups, values);
  return new Map(groups.map((g, index) => [g.name, list[index]]));
}

function t3Roles(part) {
  const roles = [];
  const spec = part.spec;
  const details = part.details ?? {};
  const add = (name, type, extra = {}) => roles.push({ name, type, ...extra });
  const tone = part.tone ?? "hi";
  const crease = part.crease ?? "faint";
  const fadedSlots = (prefix, count, cls, lineTone) => {
    for (let j = 0; j < count; j++) add(`${prefix}${j}`, "slot", { cls, tone: lineTone });
  };
  const planes = () => (part.planes ?? []).forEach((_, j) => add(`plane${j}`, "plane"));
  const dots = () => (part.dots ?? []).forEach((dot, j) => add(`c${j}`, "dot", { tone: dot.tone ?? "mid", size: dot.size ?? 0.5 }));
  const sheets = (top) => {
    for (let t = 0; t < 4; t++) add(`s${t}`, "path", { cls: "iso-shade", shade: t });
    if (top) add("s4", "path", { cls: "iso-top" });
  };
  const inner = () => {
    if ((details.seams && details.seams.length) || (details.ribs && details.ribs.seams)) add("inner", "path", { cls: "iso-line", tone: "faint" });
  };
  const ribs = () => {
    if (details.ribs) fadedSlots("r", spec.slots?.ribs ?? 6, "iso-line", details.ribs.tone ?? "lo");
  };
  if (part.kind === "prism") {
    add("fill", "path", { cls: "iso-fill" });
    const faces = spec.ring.length / 2 + (spec.up ? 0 : 2);
    for (let j = 0; j < faces; j++) add(`f${j}`, "face");
    if (spec.up) add("top", "xform", { cls: "iso-top" });
    if (crease !== "none") add("crease", "path", { cls: "iso-line iso-crease", tone: crease });
    if (spec.bevel && crease !== "none") fadedSlots("v", spec.slots?.bevel ?? 6, "iso-line iso-bevel", crease);
    if (details.seams && details.seams.length) add("inner", "path", { cls: "iso-line", tone: "faint" });
    planes();
    add("edge", "path", { cls: "iso-line iso-edge", tone });
    dots();
  } else if (part.kind === "round" || part.kind === "lathe") {
    add("fill", "path", { cls: "iso-fill" });
    sheets(true);
    const ends = part.kind === "round" ? spec.ends : spec.caps.map((cap) => (cap ? "flat" : "open"));
    ends.forEach((end, j) => end === "flat" && add(`k${j}`, "face"));
    if (crease !== "none") add("crease", "path", { cls: "iso-line iso-crease", tone: crease });
    inner();
    ribs();
    planes();
    add("edge", "path", { cls: "iso-line iso-edge", tone });
    dots();
  } else if (part.kind === "ball") {
    add("fill", "path", { cls: "iso-fill" });
    sheets(false);
    spec.flats.forEach((_, j) => add(`f${j}`, "face"));
    if (crease !== "none") add("crease", "path", { cls: "iso-line iso-crease", tone: crease });
    planes();
    add("edge", "path", { cls: "iso-line iso-edge", tone });
    dots();
  } else if (part.kind === "tube") {
    add("body", "path", { cls: "tb-body" });
    if (spec.wide) {
      add("shine", "path", { cls: "tb-shine" });
      add("shade", "path", { cls: "tb-shade" });
    }
    if (spec.rings) fadedSlots("r", spec.slots?.ribs ?? 6, "tb-ring", spec.rings.tone ?? "lo");
    add("edges", "path", { cls: "iso-line tb-edge", tone });
  } else if (part.kind === "fixed") {
    add("move", "self");
    ribs();
    planes();
    dots();
  }
  return roles;
}

function t3Planes(list) {
  return (list ?? []).map((plane) => ({ o: plane.o, u: plane.u, v: plane.v, n: plane.n, fade: plane.fade ?? [0.04, 0.3], billboard: Boolean(plane.billboard) }));
}

function t3Dots(list) {
  return (list ?? []).map((dot) => ({ p: dot.p, n: dot.n ?? null, size: dot.size ?? 0.5, fade: dot.fade ?? [0.04, 0.42] }));
}

function t3PreparePrism(run, part) {
  const spec = part.spec;
  const n = spec.ring.length / 2;
  run.n = n;
  run.up = Boolean(spec.up);
  const ring = Float64Array.from(spec.ring);
  run.ring = ring;
  const nx = new Float64Array(n);
  const ny = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const dx = ring[2 * j] - ring[2 * i];
    const dy = ring[2 * j + 1] - ring[2 * i + 1];
    const l = Math.hypot(dx, dy) || 1;
    nx[i] = dy / l;
    ny[i] = -dx / l;
  }
  run.nx = nx;
  run.ny = ny;
  const F = spec.up ? { o: [0, 0, 0], a: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] } : spec.F;
  run.F = F;
  run.s0 = spec.up ? spec.z0 : spec.s0;
  run.s1 = spec.up ? spec.z1 : spec.s1;
  const lo = new Float64Array(3 * n);
  const hi = new Float64Array(3 * n);
  const N3 = new Float64Array(3 * n);
  for (let i = 0; i < n; i++) {
    const x = ring[2 * i];
    const y = ring[2 * i + 1];
    for (let c = 0; c < 3; c++) {
      const base = F.o[c] + F.u[c] * x + F.v[c] * y;
      lo[3 * i + c] = base + F.a[c] * run.s0;
      hi[3 * i + c] = base + F.a[c] * run.s1;
      N3[3 * i + c] = F.u[c] * nx[i] + F.v[c] * ny[i];
    }
  }
  run.lo = lo;
  run.hi = hi;
  run.N3 = N3;
  run.sharp = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const p = (i - 1 + n) % n;
    run.sharp[i] = nx[p] * nx[i] + ny[p] * ny[i] < Math.cos(0.35) ? 1 : 0;
  }
  if (spec.bevel) {
    const inset = new Float64Array(2 * n);
    for (let i = 0; i < n; i++) {
      const p = (i - 1 + n) % n;
      const mx = nx[p] + nx[i];
      const my = ny[p] + ny[i];
      const l = Math.hypot(mx, my) || 1;
      inset[2 * i] = ring[2 * i] - (mx / l) * spec.bevel;
      inset[2 * i + 1] = ring[2 * i + 1] - (my / l) * spec.bevel;
    }
    run.inset = inset;
  }
  run.seams = part.details && part.details.seams ? part.details.seams.slice() : null;
  run.cut = spec.cuts && spec.cuts.length ? spec.cuts : null;
}

function t3Axes(run, part) {
  if (run.kind === "ball") return run.flats.map((flat) => flat.n);
  if (run.kind === "tube") return run.tips.slice();
  if (run.kind === "prism") {
    const out = [run.F.a];
    for (let i = 0; i < run.n; i++) {
      const n = [run.N3[3 * i], run.N3[3 * i + 1], run.N3[3 * i + 2]];
      if (out.every((m) => Math.abs(m[0] * n[0] + m[1] * n[1] + m[2] * n[2]) < 0.9995)) out.push(n);
    }
    return out;
  }
  if (run.F) return [run.F.a];
  if (part.spec && part.spec.F) return [part.spec.F.a];
  return [];
}

function t3Cloud(run, part) {
  const out = [];
  const ring = (F, s, r, count) => {
    for (let j = 0; j < count; j++) {
      const c = Math.cos((j / count) * T3_TAU);
      const n = Math.sin((j / count) * T3_TAU);
      out.push(F.o[0] + F.a[0] * s + r * (c * F.u[0] + n * F.v[0]), F.o[1] + F.a[1] * s + r * (c * F.u[1] + n * F.v[1]), F.o[2] + F.a[2] * s + r * (c * F.u[2] + n * F.v[2]));
    }
  };
  if (run.kind === "prism") {
    for (let i = 0; i < 3 * run.n; i++) out.push(run.lo[i]);
    for (let i = 0; i < 3 * run.n; i++) out.push(run.hi[i]);
  } else if (run.kind === "round") {
    ring(run.F, run.s0, run.r0, 24);
    ring(run.F, run.s1, run.r1, 24);
    for (const [end, s, r] of [[0, run.s0, run.r0], [1, run.s1, run.r1]]) {
      if (run.ends[end] !== "dome") continue;
      const sign = end ? 1 : -1;
      for (const b of [0.5, 1.0, 1.35]) ring(run.F, s + sign * r * Math.sin(b), r * Math.cos(b), 6);
      out.push(run.F.o[0] + run.F.a[0] * (s + sign * r), run.F.o[1] + run.F.a[1] * (s + sign * r), run.F.o[2] + run.F.a[2] * (s + sign * r));
    }
  } else if (run.kind === "ball") {
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < 64; i++) {
      const y = 1 - (2 * (i + 0.5)) / 64;
      const rad = Math.sqrt(1 - y * y);
      const w = [Math.cos(golden * i) * rad, Math.sin(golden * i) * rad, y];
      const p = [run.c[0] + run.r * w[0], run.c[1] + run.r * w[1], run.c[2] + run.r * w[2]];
      let inside = true;
      for (const flat of run.flats) if ((p[0] - run.c[0]) * flat.n[0] + (p[1] - run.c[1]) * flat.n[1] + (p[2] - run.c[2]) * flat.n[2] > flat.d + 1e-9) inside = false;
      if (inside) out.push(p[0], p[1], p[2]);
    }
    for (const flat of run.flats)
      for (let j = 0; j < 12; j++) {
        const c = Math.cos((j / 12) * T3_TAU) * flat.rho;
        const n = Math.sin((j / 12) * T3_TAU) * flat.rho;
        out.push(run.c[0] + flat.n[0] * flat.d + c * flat.u[0] + n * flat.v[0], run.c[1] + flat.n[1] * flat.d + c * flat.u[1] + n * flat.v[1], run.c[2] + flat.n[2] * flat.d + c * flat.u[2] + n * flat.v[2]);
      }
  } else if (run.kind === "lathe") {
    const lv = run.levels;
    const step = Math.max(4, Math.floor(lv.length / 4 / 8)) * 4;
    for (let i = 0; i < lv.length; i += step) ring(run.F, lv[i], lv[i + 1], 8);
    ring(run.F, lv[lv.length - 4], lv[lv.length - 3], 8);
  } else if (run.kind === "tube") {
    const b = run.body;
    const stride = Math.max(1, Math.floor(b.count / 8));
    for (let i = 0; i < b.count; i += stride) {
      const T = t3Unit([b.D3[3 * i], b.D3[3 * i + 1], b.D3[3 * i + 2]]);
      const [u, v] = t3Basis(T);
      ring({ o: [b.P3[3 * i], b.P3[3 * i + 1], b.P3[3 * i + 2]], a: T, u, v }, 0, run.r, 8);
    }
  } else if (part.cloud) for (const v of part.cloud) out.push(v);
  return Float64Array.from(out);
}

function t3Unpack(value, grouped) {
  if (!value) return new Float64Array(0);
  if (typeof value !== "string") return Float64Array.from(value);
  const text = atob(value);
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i);
  const view = new DataView(bytes.buffer);
  const size = grouped ? 10 : 8;
  const stride = grouped ? 6 : 5;
  const count = bytes.length / size;
  const out = new Float64Array(count * stride);
  for (let e = 0; e < count; e++) {
    let o = e * size;
    const at = e * stride;
    out[at] = view.getUint16(o);
    out[at + 1] = view.getUint16(o + 2);
    o += 4;
    if (grouped) {
      out[at + 2] = view.getUint16(o) - 1;
      o += 2;
    }
    let x = (view.getUint16(o) / 65535) * 2 - 1;
    let y = (view.getUint16(o + 2) / 65535) * 2 - 1;
    const z = 1 - Math.abs(x) - Math.abs(y);
    if (z < 0) {
      const ox = (1 - Math.abs(y)) * (x >= 0 ? 1 : -1);
      const oy = (1 - Math.abs(x)) * (y >= 0 ? 1 : -1);
      x = ox;
      y = oy;
    }
    const l = Math.hypot(x, y, z) || 1;
    out[at + stride - 3] = x / l;
    out[at + stride - 2] = y / l;
    out[at + stride - 1] = z / l;
  }
  return out;
}

function t3Prepare(data, { unit = 1 } = {}) {
  const P = data.P;
  const runs = data.parts.map((part, index) => {
    const run = { index, name: part.name, kind: part.kind, group: part.group ?? -1, layer: part.layer, part, roles: t3Roles(part), planes: t3Planes(part.planes), dots: t3Dots(part.dots), unit };
    run.role = Object.fromEntries(run.roles.map((role, j) => [role.name, j]));
    if (part.kind === "prism") t3PreparePrism(run, part);
    else if (part.kind === "round") t3PrepareRound(run, part, P, unit);
    else if (part.kind === "ball") t3PrepareBall(run, part, P, unit);
    else if (part.kind === "lathe") t3PrepareLathe(run, part, P, unit);
    else if (part.kind === "tube") t3PrepareTube(run, part, data);
    else if (part.kind === "fixed") {
      run.anchor = part.spec.anchor;
      run.home = part.spec.home;
      run.box0 = part.spec.box;
      run.hull0 = Float64Array.from(part.spec.hull);
      run.F = part.spec.F ?? null;
      run.ribs = part.details && part.details.ribs ? part.details.ribs : null;
    }
    run.slots = part.spec.slots ?? {};
    run.cloud = t3Cloud(run, part);
    run.axes = t3Axes(run, part);
    const cn = run.cloud.length / 3;
    run.centroid = [0, 0, 0];
    for (let i = 0; i < cn; i++) for (let c = 0; c < 3; c++) run.centroid[c] += run.cloud[3 * i + c] / Math.max(1, cn);
    return run;
  });
  const layers = data.layers.map((layer, index) => {
    const parts = Int32Array.from(layer.parts);
    const local = new Map();
    parts.forEach((global, at) => local.set(global, at));
    const planar = t3Unpack(data.planes && data.planes[layer.name], false);
    const dynamic = Int32Array.from((data.dynamic && data.dynamic[layer.name]) ?? []);
    const free = Int32Array.from((data.free && data.free[layer.name]) ?? []);
    const framed = t3Unpack(data.framed && data.framed[layer.name], true);
    const groupPairs = [];
    const raw = (data.groupPairs && data.groupPairs[layer.name]) ?? [];
    const members = new Map();
    for (const global of parts) {
      const g = runs[global].group;
      if (!members.has(g)) members.set(g, []);
      members.get(g).push(global);
    }
    for (let p = 0; p < raw.length; p += 6) groupPairs.push({ a: Int32Array.from(members.get(raw[p]) ?? []), b: Int32Array.from(members.get(raw[p + 1]) ?? []), frame: raw[p + 2], n: [raw[p + 3], raw[p + 4], raw[p + 5]], boxA: new Float64Array(4), boxB: new Float64Array(4) });
    const looseAt = new Uint8Array(parts.length);
    for (const global of free) looseAt[local.get(global)] = 1;
    return { index, name: layer.name, parts, local, rest: Int32Array.from(layer.rest ?? layer.parts), planar, framed, groupPairs, dynamic, free, looseAt, warm: new Map() };
  });
  return { P, data, unit, groups: data.groups, runs, layers };
}

function t3Frame(run) {
  const count = run.roles.length;
  return { d: new Array(count).fill(""), q: new Int32Array(count), w: new Float64Array(count).fill(-1), t: new Array(count).fill(""), o: new Float64Array(count).fill(1), box: new Float64Array(4), hull: new Float64Array(64), hullN: 0, cx: new Float64Array(count), cy: new Float64Array(count), quads: null, quadN: 0 };
}

const t3Buf = { a: new Float64Array(1024), b: new Float64Array(1024), c: new Float64Array(1024) };

function t3Scratch(name, size) {
  if (t3Buf[name].length < size) t3Buf[name] = new Float64Array(size * 2);
  return t3Buf[name];
}

function t3SetHull(f, buf, count) {
  const hull = t3Grow(f, "hull", 2 * count, Float64Array);
  for (let i = 0; i < 2 * count; i++) hull[i] = buf[i];
  f.hullN = count;
}

function t3Faded(f, run, prefix, lines, count) {
  if (!f.fade) f.fade = {};
  const detail = t3State.detail;
  if (detail < 1) for (let i = 0; i < count; i++) lines.alpha[i] *= detail;
  if (detail < 0.01) count = 0;
  f.fade[prefix] = { key: lines.key.slice(0, count), alpha: lines.alpha.slice(0, count) };
  const slots = run.slots[prefix === "v" ? "bevel" : "ribs"] ?? 6;
  const levels = run._levels ?? (run._levels = new Array(T3_LEVELS + 1));
  for (let l = 0; l <= T3_LEVELS; l++) levels[l] = "";
  for (let i = 0; i < count; i++) {
    const alpha = lines.alpha[i];
    const level = Math.min(T3_LEVELS, Math.round(alpha * T3_LEVELS));
    if (level <= 0) continue;
    levels[level] += lines.d[i];
  }
  const present = [];
  for (let l = T3_LEVELS; l >= 1; l--) if (levels[l]) present.push([l, levels[l]]);
  while (present.length > slots) {
    let best = 1;
    let gap = Infinity;
    for (let i = 1; i < present.length; i++) {
      const g = present[i - 1][0] - present[i][0];
      if (g < gap) {
        gap = g;
        best = i;
      }
    }
    const [a, da] = present[best - 1];
    const [b, db] = present[best];
    present.splice(best - 1, 2, [(a + b) / 2, da + db]);
  }
  for (let j = 0; j < slots; j++) {
    const role = run.role[`${prefix}${j}`];
    if (role === undefined) continue;
    if (j < present.length) {
      f.d[role] = present[j][1];
      f.o[role] = present[j][0] / T3_LEVELS;
    } else {
      f.d[role] = "";
      f.o[role] = 0;
    }
  }
  return present.length;
}

const t3Lines = { d: [], alpha: [], key: [] };
const t3None = { d: [], alpha: [], key: [] };

function t3EmitPrism(run, cam, f) {
  const n = run.n;
  const m = cam.m;
  const ox = cam.ox;
  const oy = cam.oy;
  const V = cam.V;
  const L = cam.L;
  const lo = run.lo;
  const hi = run.hi;
  const N3 = run.N3;
  const bot = t3Scratch("a", 2 * n);
  const top = t3Scratch("b", 2 * n);
  for (let i = 0; i < n; i++) {
    const a = 3 * i;
    bot[2 * i] = ox + m[0] * lo[a] + m[1] * lo[a + 1] + m[2] * lo[a + 2];
    bot[2 * i + 1] = oy + m[3] * lo[a] + m[4] * lo[a + 1] + m[5] * lo[a + 2];
    top[2 * i] = ox + m[0] * hi[a] + m[1] * hi[a + 1] + m[2] * hi[a + 2];
    top[2 * i + 1] = oy + m[3] * hi[a] + m[4] * hi[a + 1] + m[5] * hi[a + 2];
  }
  const F = run.F;
  const aV = F.a[0] * V[0] + F.a[1] * V[1] + F.a[2] * V[2];
  const near = aV >= 0 ? top : bot;
  const far = aV >= 0 ? bot : top;
  const facing = run._facing ?? (run._facing = new Float64Array(n));
  for (let i = 0; i < n; i++) facing[i] = N3[3 * i] * V[0] + N3[3 * i + 1] * V[1] + N3[3 * i + 2] * V[2];
  const on = (i) => facing[((i % n) + n) % n] > 1e-9;
  let i0 = -1;
  for (let i = 0; i < n; i++)
    if (on(i) && !on(i - 1)) {
      i0 = i;
      break;
    }
  const sil = t3Scratch("c", 4 * n + 8);
  const silAt = run._silAt ?? (run._silAt = new Int32Array(2 * n + 4));
  let count = 0;
  let i1 = i0;
  const nearSet = aV >= 0 ? hi : lo;
  const farSet = aV >= 0 ? lo : hi;
  if (i0 < 0) {
    for (let i = 0; i < n; i++) {
      sil[2 * count] = near[2 * i];
      sil[2 * count + 1] = near[2 * i + 1];
      silAt[count] = i;
      count++;
    }
  } else {
    while (on(i1)) i1++;
    for (let j = i0; j <= i1; j++) {
      const i = j % n;
      sil[2 * count] = far[2 * i];
      sil[2 * count + 1] = far[2 * i + 1];
      silAt[count] = -1 - i;
      count++;
    }
    for (let j = i1; j <= i0 + n; j++) {
      const i = j % n;
      sil[2 * count] = near[2 * i];
      sil[2 * count + 1] = near[2 * i + 1];
      silAt[count] = i;
      count++;
    }
    if (count > 2 && Math.abs(sil[0] - sil[2 * count - 2]) < 1e-9 && Math.abs(sil[1] - sil[2 * count - 1]) < 1e-9) count--;
  }
  const outline = t3Path(sil, count, true);
  f.d[run.role.fill] = outline;
  if (run.cut) {
    const inPlane = (index) => {
      const at = silAt[index];
      const set = at < 0 ? farSet : nearSet;
      const v = at < 0 ? -1 - at : at;
      return run.cut.some((cut) => Math.abs(cut.n[0] * set[3 * v] + cut.n[1] * set[3 * v + 1] + cut.n[2] * set[3 * v + 2] - cut.d) < 1e-3);
    };
    const flags = new Uint8Array(count);
    const onSame = (i, j) => {
      const at = (index) => {
        const a = silAt[index];
        const set = a < 0 ? farSet : nearSet;
        const v = a < 0 ? -1 - a : a;
        return [set[3 * v], set[3 * v + 1], set[3 * v + 2]];
      };
      const p = at(i);
      const q = at(j);
      return run.cut.some((cut) => Math.abs(cut.n[0] * p[0] + cut.n[1] * p[1] + cut.n[2] * p[2] - cut.d) < 1e-3 && Math.abs(cut.n[0] * q[0] + cut.n[1] * q[1] + cut.n[2] * q[2] - cut.d) < 1e-3);
    };
    for (let j = 0; j < count; j++) flags[j] = inPlane(j) && onSame(j, (j + 1) % count) ? 1 : 0;
    f.d[run.role.edge] = t3Broken(sil, count, flags);
  } else f.d[run.role.edge] = outline;
  t3Box(sil, count, f.box);
  t3SetHull(f, sil, count);
  const quad = new Float64Array(8);
  for (let i = 0; i < n; i++) {
    const role = run.role[`f${i}`];
    if (!(facing[i] > 1e-6)) {
      f.d[role] = "";
      continue;
    }
    const j = (i + 1) % n;
    quad[0] = top[2 * i];
    quad[1] = top[2 * i + 1];
    quad[2] = top[2 * j];
    quad[3] = top[2 * j + 1];
    quad[4] = bot[2 * j];
    quad[5] = bot[2 * j + 1];
    quad[6] = bot[2 * i];
    quad[7] = bot[2 * i + 1];
    f.d[role] = t3Path(quad, 4, true);
    let score;
    if (run.up) {
      score = (run.nx[i] * cam.lx + run.ny[i] * cam.ly + 1) / 2;
      f.q[role] = t3Level(score, T3_EB);
    } else {
      score = N3[3 * i] * L[0] + N3[3 * i + 1] * L[1] + N3[3 * i + 2] * L[2];
      f.q[role] = t3Level(score, T3_LB);
    }
    const e1 = Math.hypot(quad[2] - quad[0], quad[3] - quad[1]);
    const e2 = Math.hypot(quad[6] - quad[0], quad[7] - quad[1]);
    const area = Math.abs((quad[2] - quad[0]) * (quad[7] - quad[1]) - (quad[3] - quad[1]) * (quad[6] - quad[0]));
    const wide = area / (Math.max(e1, e2) || 1);
    f.w[role] = wide < 0.4 ? Math.round(wide * 100) / 100 : -1;
  }
  if (run.up) {
    const z = run.s1;
    f.t[run.role.top] = `matrix(${t3Fix(m[0], 1e5)} ${t3Fix(m[3], 1e5)} ${t3Fix(m[1], 1e5)} ${t3Fix(m[4], 1e5)} ${t3Fix(ox + m[2] * z, 100)} ${t3Fix(oy + m[5] * z, 100)})`;
  } else {
    for (let side = 0; side < 2; side++) {
      const role = run.role[`f${n + side}`];
      const sign = side ? 1 : -1;
      const face = sign * aV;
      if (!(face > 1e-6)) {
        f.d[role] = "";
        continue;
      }
      const ring = side ? top : bot;
      f.d[role] = t3Path(ring, n, true);
      f.q[role] = t3Level(sign * (F.a[0] * L[0] + F.a[1] * L[1] + F.a[2] * L[2]), T3_LB);
      let minor = Infinity;
      let x0 = Infinity;
      let x1 = -Infinity;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const ex = ring[2 * j] - ring[2 * i];
        const ey = ring[2 * j + 1] - ring[2 * i + 1];
        const l = Math.hypot(ex, ey);
        if (l < 1e-9) continue;
        let lo2 = Infinity;
        let hi2 = -Infinity;
        for (let q = 0; q < n; q++) {
          const v = ((ring[2 * q] - ring[2 * i]) * ey - (ring[2 * q + 1] - ring[2 * i + 1]) * ex) / l;
          if (v < lo2) lo2 = v;
          if (v > hi2) hi2 = v;
        }
        minor = Math.min(minor, hi2 - lo2);
        x0 = Math.min(x0, lo2);
        x1 = Math.max(x1, hi2);
      }
      f.w[role] = minor < 0.4 ? Math.round(minor * 100) / 100 : -1;
    }
  }
  if (run.role.crease !== undefined) {
    let crease = "";
    if (run.up) {
      if (i0 >= 0) {
        const buf = t3Scratch("a", 0);
        let c = 0;
        const rim = t3Scratch("c", 2 * n + 4);
        for (let j = i0; j <= i1; j++) {
          const i = j % n;
          rim[2 * c] = top[2 * i];
          rim[2 * c + 1] = top[2 * i + 1];
          c++;
        }
        crease = t3Path(rim, c, false);
        void buf;
      }
    } else {
      const capOn = [-aV > 1e-6, aV > 1e-6];
      const seg = new Float64Array(4);
      for (let i = 0; i < n; i++) {
        const p = (i - 1 + n) % n;
        if (run.sharp[i] && facing[i] > 1e-6 && facing[p] > 1e-6) {
          seg[0] = bot[2 * i];
          seg[1] = bot[2 * i + 1];
          seg[2] = top[2 * i];
          seg[3] = top[2 * i + 1];
          crease += t3Path(seg, 2, false);
        }
      }
      for (let side = 0; side < 2; side++) {
        if (!capOn[side] || i0 < 0) continue;
        const ring = side ? top : bot;
        const rim = t3Scratch("c", 2 * n + 4);
        let c = 0;
        for (let j = i0; j <= i1; j++) {
          const i = j % n;
          rim[2 * c] = ring[2 * i];
          rim[2 * c + 1] = ring[2 * i + 1];
          c++;
        }
        crease += t3Path(rim, c, false);
      }
    }
    f.d[run.role.crease] = crease;
  }
  if (run.inset && run.role.v0 !== undefined && t3State.detail < 0.01) f.levels = t3Faded(f, run, "v", t3None, 0);
  else if (run.inset && run.role.v0 !== undefined) {
    const lines = t3Lines;
    lines.d.length = 0;
    lines.alpha.length = 0;
  lines.key.length = 0;
    lines.key.length = 0;
    const capSide = aV >= 0 ? 1 : 0;
    const s = capSide ? run.s1 : run.s0;
    const capAlpha = run.up ? 1 : t3Step(0.02, 0.2, Math.abs(aV));
    const ins = t3Scratch("c", 2 * n);
    for (let i = 0; i < n; i++) {
      const x = run.inset[2 * i];
      const y = run.inset[2 * i + 1];
      const px = F.o[0] + F.a[0] * s + F.u[0] * x + F.v[0] * y;
      const py = F.o[1] + F.a[1] * s + F.u[1] * x + F.v[1] * y;
      const pz = F.o[2] + F.a[2] * s + F.u[2] * x + F.v[2] * y;
      ins[2 * i] = ox + m[0] * px + m[1] * py + m[2] * pz;
      ins[2 * i + 1] = oy + m[3] * px + m[4] * py + m[5] * pz;
    }
    const rim = capSide ? top : bot;
    const seg = new Float64Array(4);
    for (let i = 0; i < n; i++) {
      const p = (i - 1 + n) % n;
      const ai = capAlpha * t3Step(0, 0.14, facing[i]);
      const ap = capAlpha * t3Step(0, 0.14, facing[p]);
      if (ai > 0.01) {
        const j = (i + 1) % n;
        seg[0] = ins[2 * i];
        seg[1] = ins[2 * i + 1];
        seg[2] = ins[2 * j];
        seg[3] = ins[2 * j + 1];
        lines.d.push(t3Path(seg, 2, false));
        lines.alpha.push(ai);
        lines.key.push(2 * i);
      }
      const corner = ai * (1 - ap) + ap * (1 - ai);
      if (corner > 0.01) {
        seg[0] = ins[2 * i];
        seg[1] = ins[2 * i + 1];
        seg[2] = rim[2 * i];
        seg[3] = rim[2 * i + 1];
        lines.d.push(t3Path(seg, 2, false));
        lines.alpha.push(corner);
        lines.key.push(2 * i + 1);
      }
    }
    f.levels = t3Faded(f, run, "v", lines, lines.d.length);
  }
  if (run.seams && run.role.inner !== undefined) {
    let inner = "";
    if (i0 >= 0) {
      const rim = t3Scratch("c", 2 * n + 4);
      for (const s of run.seams) {
        let c = 0;
        for (let j = i0; j <= i1; j++) {
          const i = j % n;
          const x = run.ring[2 * i];
          const y = run.ring[2 * i + 1];
          const px = F.o[0] + F.a[0] * s + F.u[0] * x + F.v[0] * y;
          const py = F.o[1] + F.a[1] * s + F.u[1] * x + F.v[1] * y;
          const pz = F.o[2] + F.a[2] * s + F.u[2] * x + F.v[2] * y;
          rim[2 * c] = ox + m[0] * px + m[1] * py + m[2] * pz;
          rim[2 * c + 1] = oy + m[3] * px + m[4] * py + m[5] * pz;
          c++;
        }
        inner += t3Path(rim, c, false);
      }
    }
    f.d[run.role.inner] = inner;
  }
}

function t3Broken(buf, count, skip) {
  let start = -1;
  for (let j = 0; j < count; j++)
    if (skip[(j - 1 + count) % count] && !skip[j]) {
      start = j;
      break;
    }
  if (start < 0) return skip[0] ? "" : t3Path(buf, count, true);
  let out = "";
  let run = [];
  for (let step = 0; step < count; step++) {
    const j = (start + step) % count;
    if (skip[j]) {
      if (run.length) {
        run.push((j + 0) % count);
        out += t3PathOf(run.map((i) => [buf[2 * i], buf[2 * i + 1]]), false);
        run = [];
      }
      continue;
    }
    run.push(j);
  }
  if (run.length) {
    run.push((start + count) % count);
    out += t3PathOf(run.map((i) => [buf[2 * i], buf[2 * i + 1]]), false);
  }
  return out;
}

function t3EmitPlanes(run, cam, f, sx = 0, sy = 0) {
  const m = cam.m;
  const V = cam.V;
  for (let j = 0; j < run.planes.length; j++) {
    const plane = run.planes[j];
    const role = run.role[`plane${j}`];
    const o = plane.o;
    const X = cam.ox - sx + m[0] * o[0] + m[1] * o[1] + m[2] * o[2];
    const Y = cam.oy - sy + m[3] * o[0] + m[4] * o[1] + m[5] * o[2];
    const facing = plane.n[0] * V[0] + plane.n[1] * V[1] + plane.n[2] * V[2];
    const alpha = Math.round(t3Step(plane.fade[0], plane.fade[1], facing) * 100) / 100;
    f.o[role] = alpha;
    if (plane.billboard) {
      f.t[role] = `translate(${t3Num(X)} ${t3Num(Y)})`;
      continue;
    }
    const u = plane.u;
    const v = plane.v;
    const a = m[0] * u[0] + m[1] * u[1] + m[2] * u[2];
    const b = m[3] * u[0] + m[4] * u[1] + m[5] * u[2];
    const c = m[0] * v[0] + m[1] * v[1] + m[2] * v[2];
    const d = m[3] * v[0] + m[4] * v[1] + m[5] * v[2];
    f.t[role] = `matrix(${t3Fix(a, 1e5)} ${t3Fix(b, 1e5)} ${t3Fix(c, 1e5)} ${t3Fix(d, 1e5)} ${t3Fix(X, 100)} ${t3Fix(Y, 100)})`;
  }
}

function t3EmitDots(run, cam, f, sx = 0, sy = 0) {
  const m = cam.m;
  const V = cam.V;
  for (let j = 0; j < run.dots.length; j++) {
    const dot = run.dots[j];
    const role = run.role[`c${j}`];
    const p = dot.p;
    f.cx[role] = cam.ox - sx + m[0] * p[0] + m[1] * p[1] + m[2] * p[2];
    f.cy[role] = cam.oy - sy + m[3] * p[0] + m[4] * p[1] + m[5] * p[2];
    const alpha = (dot.n ? t3Step(dot.fade[0], dot.fade[1], dot.n[0] * V[0] + dot.n[1] * V[1] + dot.n[2] * V[2]) : 1) * t3State.detail;
    f.o[role] = alpha < 0.005 ? 0 : Math.round(alpha * 100) / 100;
  }
}

function t3EmitFixed(run, cam, f) {
  const a = run.anchor;
  const m = cam.m;
  const X = cam.ox + m[0] * a[0] + m[1] * a[1] + m[2] * a[2];
  const Y = cam.oy + m[3] * a[0] + m[4] * a[1] + m[5] * a[2];
  const dx = X - run.home[0];
  const dy = Y - run.home[1];
  const rx = Math.round(dx * 100) / 100;
  const ry = Math.round(dy * 100) / 100;
  f.t[run.role.move] = rx || ry ? `translate(${t3Num(rx)} ${t3Num(ry)})` : "";
  f.shiftX = rx;
  f.shiftY = ry;
  const b = run.box0;
  f.box[0] = b[0] + rx;
  f.box[1] = b[1] + ry;
  f.box[2] = b[2] + rx;
  f.box[3] = b[3] + ry;
  const count = run.hull0.length / 2;
  const hull = t3Grow(f, "hull", 2 * count, Float64Array);
  for (let i = 0; i < count; i++) {
    hull[2 * i] = run.hull0[2 * i] + rx;
    hull[2 * i + 1] = run.hull0[2 * i + 1] + ry;
  }
  f.hullN = count;
  if (run.ribs && run.F) t3EmitRibs(run, cam, f, run.F, run.ribs, rx, ry);
  t3EmitPlanes(run, cam, f, rx, ry);
  t3EmitDots(run, cam, f, rx, ry);
}

function t3EmitRibs(run, cam, f, F, ribs, sx, sy) {
  if (t3State.detail < 0.01) {
    f.levels = t3Faded(f, run, "r", t3None, 0);
    return;
  }
  const m = cam.m;
  const V = cam.V;
  const lines = t3Lines;
  lines.d.length = 0;
  lines.alpha.length = 0;
  lines.key.length = 0;
  const { s0, s1, count, phase = 0, twist = 0, fade = [0.1, 0.55] } = ribs;
  const r0 = ribs.r0 ?? ribs.r;
  const r1 = ribs.r1 ?? r0;
  const slope = (r1 - r0) / (s1 - s0 || 1);
  const norm = Math.hypot(1, slope);
  const aV = F.a[0] * V[0] + F.a[1] * V[1] + F.a[2] * V[2];
  const uV = F.u[0] * V[0] + F.u[1] * V[1] + F.u[2] * V[2];
  const vV = F.v[0] * V[0] + F.v[1] * V[1] + F.v[2] * V[2];
  const seg = new Float64Array(4);
  const at = (s, r, t, out, index) => {
    const c = Math.cos(t);
    const n = Math.sin(t);
    const px = F.o[0] + F.a[0] * s + r * (c * F.u[0] + n * F.v[0]);
    const py = F.o[1] + F.a[1] * s + r * (c * F.u[1] + n * F.v[1]);
    const pz = F.o[2] + F.a[2] * s + r * (c * F.u[2] + n * F.v[2]);
    out[index] = cam.ox - sx + m[0] * px + m[1] * py + m[2] * pz;
    out[index + 1] = cam.oy - sy + m[3] * px + m[4] * py + m[5] * pz;
  };
  for (let i = 0; i < count; i++) {
    const t = phase + (i / count) * T3_TAU;
    const tm = t + twist / 2;
    const facing = (Math.cos(tm) * uV + Math.sin(tm) * vV - slope * aV) / norm;
    const alpha = t3Step(fade[0], fade[1], facing);
    if (alpha * T3_LEVELS < 0.5) continue;
    at(s0, r0, t, seg, 0);
    at(s1, r1, t + twist, seg, 2);
    lines.d.push(t3Path(seg, 2, false));
    lines.alpha.push(alpha);
    lines.key.push(i);
  }
  f.levels = t3Faded(f, run, "r", lines, lines.d.length);
}


function t3Geo(F, cam) {
  const m = cam.m;
  const V = cam.V;
  const L = cam.L;
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const lin = (w) => [m[0] * w[0] + m[1] * w[1] + m[2] * w[2], m[3] * w[0] + m[4] * w[1] + m[5] * w[2]];
  const O = [cam.ox + m[0] * F.o[0] + m[1] * F.o[1] + m[2] * F.o[2], cam.oy + m[3] * F.o[0] + m[4] * F.o[1] + m[5] * F.o[2]];
  const aV = dot(F.a, V);
  const uV = dot(F.u, V);
  const vV = dot(F.v, V);
  const aL = dot(F.a, L);
  const uL = dot(F.u, L);
  const vL = dot(F.v, L);
  return { O, SA: lin(F.a), SU: lin(F.u), SV: lin(F.v), aV, aL, view: { a: aV, flat: Math.hypot(uV, vV), phi: Math.atan2(vV, uV) }, light: { a: aL, flat: Math.hypot(uL, vL), phi: Math.atan2(vL, uL) } };
}

function t3At(geo, s, r, t, buf, index) {
  const c = Math.cos(t);
  const n = Math.sin(t);
  buf[index] = geo.O[0] + s * geo.SA[0] + r * (c * geo.SU[0] + n * geo.SV[0]);
  buf[index + 1] = geo.O[1] + s * geo.SA[1] + r * (c * geo.SU[1] + n * geo.SV[1]);
}

function t3Arcs(nr, na, view, light) {
  const cuts = [];
  if (Math.abs(nr) > 1e-9) {
    const visibleCut = -(na * view.a) / (nr * view.flat);
    if (visibleCut > -1 && visibleCut < 1) {
      const d = Math.acos(visibleCut);
      cuts.push(view.phi - d, view.phi + d);
    }
    for (let b = 0; b < T3_LB.length; b++) {
      const c = (T3_LB[b] - na * light.a) / (nr * light.flat);
      if (c > -1 && c < 1) {
        const d = Math.acos(c);
        cuts.push(light.phi - d, light.phi + d);
      }
    }
  }
  for (let i = 0; i < cuts.length; i++) {
    const w = ((cuts[i] % T3_TAU) + T3_TAU) % T3_TAU;
    cuts[i] = Math.round(w * 1e9) / 1e9;
  }
  cuts.sort((a, b) => a - b);
  const sorted = [];
  for (let i = 0; i < cuts.length; i++) if (!sorted.length || cuts[i] !== sorted[sorted.length - 1]) sorted.push(cuts[i]);
  const label = (angle) => {
    const facing = nr * view.flat * Math.cos(angle - view.phi) + na * view.a;
    if (facing <= 1e-9) return -1;
    const score = nr * light.flat * Math.cos(angle - light.phi) + na * light.a;
    let tone = 0;
    while (tone < T3_LB.length && score >= T3_LB[tone]) tone++;
    return tone;
  };
  if (!sorted.length) {
    const tone = label(0);
    return tone < 0 ? [] : [{ tone, from: 0, to: T3_TAU, full: true }];
  }
  const merged = [];
  for (let index = 0; index < sorted.length; index++) {
    const from = sorted[index];
    const to = index + 1 < sorted.length ? sorted[index + 1] : sorted[0] + T3_TAU;
    const tone = label((from + to) / 2);
    const last = merged[merged.length - 1];
    if (last && last.tone === tone && Math.abs(last.to - from) < 1e-9) last.to = to;
    else merged.push({ tone, from, to });
  }
  if (merged.length > 1 && merged[0].tone === merged[merged.length - 1].tone && Math.abs(merged[merged.length - 1].to - T3_TAU - merged[0].from) < 1e-9) {
    const last = merged.pop();
    merged[0].from = last.from - T3_TAU;
  }
  const out = [];
  for (const arc of merged) if (arc.tone >= 0) out.push(arc);
  return out;
}

function t3Strip(geo, s0, r0, s1, r1, from, to, step) {
  const count = Math.max(1, Math.ceil((to - from) / step));
  const buf = t3Scratch("c", 4 * count + 8);
  for (let j = 0; j <= count; j++) {
    const t = from + ((to - from) * j) / count;
    t3At(geo, s0, r0, t, buf, 2 * j);
    t3At(geo, s1, r1, t, buf, 2 * (2 * count + 1 - j));
  }
  return t3Path(t3Oriented(buf, 2 * count + 2), 2 * count + 2, true);
}

function t3Oriented(buf, count) {
  let area = 0;
  for (let i = 0; i < count; i++) {
    const j = (i + 1) % count;
    area += buf[2 * i] * buf[2 * j + 1] - buf[2 * j] * buf[2 * i + 1];
  }
  if (area >= 0) return buf;
  for (let i = 0, j = count - 1; i < j; i++, j--) {
    const x = buf[2 * i];
    const y = buf[2 * i + 1];
    buf[2 * i] = buf[2 * j];
    buf[2 * i + 1] = buf[2 * j + 1];
    buf[2 * j] = x;
    buf[2 * j + 1] = y;
  }
  return buf;
}

function t3Hull(points) {
  const sorted = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (sorted.length < 3) return sorted;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 1e-12) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 1e-12) upper.pop();
    upper.push(p);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

function t3PathOf(points, closed) {
  if (points.length < 2) return "";
  let s = "M" + t3Num(points[0][0]) + " " + t3Num(points[0][1]);
  for (let i = 1; i < points.length; i++) s += "L" + t3Num(points[i][0]) + " " + t3Num(points[i][1]);
  return closed ? s + "Z" : s;
}

function t3Basis(w) {
  const helper = Math.abs(w[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1];
  const u = t3Unit([helper[1] * w[2] - helper[2] * w[1], helper[2] * w[0] - helper[0] * w[2], helper[0] * w[1] - helper[1] * w[0]]);
  return [u, [w[1] * u[2] - w[2] * u[1], w[2] * u[0] - w[0] * u[2], w[0] * u[1] - w[1] * u[0]]];
}

function t3Meet(A, a, B, b) {
  const ab = A[0] * B[0] + A[1] * B[1] + A[2] * B[2];
  const det = 1 - ab * ab;
  if (det < 1e-12) return [];
  const alpha = (a - b * ab) / det;
  const beta = (b - a * ab) / det;
  const base = [A[0] * alpha + B[0] * beta, A[1] * alpha + B[1] * beta, A[2] * alpha + B[2] * beta];
  const rest = 1 - (base[0] * base[0] + base[1] * base[1] + base[2] * base[2]);
  if (rest < 0) return [];
  const cr = [A[1] * B[2] - A[2] * B[1], A[2] * B[0] - A[0] * B[2], A[0] * B[1] - A[1] * B[0]];
  const k = Math.sqrt(rest / det);
  return [
    [base[0] + cr[0] * k, base[1] + cr[1] * k, base[2] + cr[2] * k],
    [base[0] - cr[0] * k, base[1] - cr[1] * k, base[2] - cr[2] * k],
  ];
}

const t3Tables = new Map();
function t3Table(count) {
  let table = t3Tables.get(count);
  if (!table) {
    table = new Float64Array(2 * count);
    for (let j = 0; j < count; j++) {
      table[2 * j] = Math.cos((j / count) * T3_TAU);
      table[2 * j + 1] = Math.sin((j / count) * T3_TAU);
    }
    t3Tables.set(count, table);
  }
  return table;
}

function t3Dome(cam, C, e, r, count, sheets) {
  const m = cam.m;
  const V = cam.V;
  const L = cam.L;
  const Sx = cam.ox + m[0] * C[0] + m[1] * C[1] + m[2] * C[2];
  const Sy = cam.oy + m[3] * C[0] + m[4] * C[1] + m[5] * C[2];
  const flat = (n) => [Sx + r * (m[0] * n[0] + m[1] * n[1] + m[2] * n[2]), Sy + r * (m[3] * n[0] + m[4] * n[1] + m[5] * n[2])];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const table = t3Table(count);
  const circle = (W, value, keep) => {
    const [U, Q] = t3Basis(W);
    const rad = Math.sqrt(Math.max(0, 1 - value * value));
    const out = [];
    for (let j = 0; j < count; j++) {
      const cs = table[2 * j] * rad;
      const sn = table[2 * j + 1] * rad;
      const n = [W[0] * value + U[0] * cs + Q[0] * sn, W[1] * value + U[1] * cs + Q[1] * sn, W[2] * value + U[2] * cs + Q[2] * sn];
      if (keep(n)) out.push(n);
    }
    return out;
  };
  const rim = circle(V, 0, (n) => dot(n, e) >= -1e-9).map((n) => [flat(n), dot(n, L)]);
  const base = circle(e, 0, (n) => dot(n, V) >= -1e-9).map((n) => [flat(n), dot(n, L)]);
  const corners = t3Meet(V, 0, e, 0).map((n) => [flat(n), dot(n, L)]);
  for (let tone = 0; tone < 5; tone++) {
    const tau = tone === 0 ? -Infinity : T3_LB[tone - 1];
    const candidates = [];
    for (const list of [rim, base, corners]) for (const [p, lit] of list) if (lit >= tau - 1e-9) candidates.push(p);
    if (tone > 0) {
      for (const n of circle(L, tau, (n) => dot(n, V) >= -1e-9 && dot(n, e) >= -1e-9)) candidates.push(flat(n));
      for (const n of t3Meet(L, tau, V, 0)) if (dot(n, e) >= -1e-9) candidates.push(flat(n));
      for (const n of t3Meet(L, tau, e, 0)) if (dot(n, V) >= -1e-9) candidates.push(flat(n));
    }
    if (candidates.length < 3) continue;
    const region = t3Hull(candidates);
    if (region.length >= 3) sheets[tone] += t3PathOf(region, true);
  }
}

function t3BoxOf(pts, box) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of pts) {
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  box[0] = x0;
  box[1] = y0;
  box[2] = x1;
  box[3] = y1;
}

function t3Thin(points, most) {
  if (points.length <= most) return points;
  const n = points.length;
  const picks = [];
  for (let i = 0; i < most; i++) picks.push(Math.floor((i * n) / most));
  const thin = picks.map((i) => points[i]);
  let err = 0;
  for (let j = 0; j < most; j++) {
    const a = thin[j];
    const b = thin[(j + 1) % most];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    const end = j + 1 < most ? picks[j + 1] : picks[0] + n;
    for (let i = picks[j] + 1; i < end; i++) {
      const p = points[i % n];
      const out = ((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) / l;
      if (Math.abs(out) > err) err = Math.abs(out);
    }
  }
  return t3Grown(thin, err);
}

function t3Grown(poly, by) {
  if (!(by > 0)) return poly;
  let area = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    area += a[0] * b[1] - b[0] * a[1];
  }
  const sign = area >= 0 ? 1 : -1;
  const n = poly.length;
  const normals = poly.map((a, i) => {
    const b = poly[(i + 1) % n];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [(sign * (b[1] - a[1])) / l, (-sign * (b[0] - a[0])) / l];
  });
  return poly.map((p, i) => {
    const na = normals[(i - 1 + n) % n];
    const nb = normals[i];
    const mx = na[0] + nb[0];
    const my = na[1] + nb[1];
    const dd = (mx * mx + my * my) / 2 || 1;
    return [p[0] + (mx * by) / dd, p[1] + (my * by) / dd];
  });
}

function t3HullOut(f, points, most = 32) {
  const thin = t3Thin(points, most);
  const hull = t3Grow(f, "hull", 2 * thin.length, Float64Array);
  for (let i = 0; i < thin.length; i++) {
    hull[2 * i] = thin[i][0];
    hull[2 * i + 1] = thin[i][1];
  }
  f.hullN = thin.length;
}

function t3SupportHull(geo, cam, components, dirs) {
  const table = t3Table(dirs);
  const pts = [];
  const { O, SA, SU, SV } = geo;
  for (let j = 0; j < dirs; j++) {
    const dx = table[2 * j];
    const dy = table[2 * j + 1];
    const pa = SA[0] * dx + SA[1] * dy;
    const pu = SU[0] * dx + SU[1] * dy;
    const pv = SV[0] * dx + SV[1] * dy;
    const w = Math.hypot(pu, pv);
    let best = -Infinity;
    let px = 0;
    let py = 0;
    for (let c = 0; c < components.length; c += 3) {
      const kind = components[c];
      const s = components[c + 1];
      const r = components[c + 2];
      if (kind === 0) {
        const value = s * pa + r * w;
        if (value > best) {
          best = value;
          const cs = w > 1e-12 ? pu / w : 1;
          const sn = w > 1e-12 ? pv / w : 0;
          px = O[0] + s * SA[0] + r * (cs * SU[0] + sn * SV[0]);
          py = O[1] + s * SA[1] + r * (cs * SU[1] + sn * SV[1]);
        }
      } else {
        const rk = r * cam.k;
        const value = s * pa + rk;
        if (value > best) {
          best = value;
          px = O[0] + s * SA[0] + rk * dx;
          py = O[1] + s * SA[1] + rk * dy;
        }
      }
    }
    const last = pts[pts.length - 1];
    if (!last || Math.abs(last[0] - px) + Math.abs(last[1] - py) > 0.02) pts.push([px, py]);
  }
  if (pts.length > 2) {
    const a = pts[0];
    const b = pts[pts.length - 1];
    if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) <= 0.02) pts.pop();
  }
  return pts;
}

function t3ArcPoints(geo, s, r, from, to, k, out, cut = false) {
  const count = Math.max(2, Math.ceil((Math.abs(to - from) * 48) / T3_TAU), Math.ceil((Math.abs(to - from) * Math.max(r, 1e-6) * k) / 1.5));
  for (let j = 0; j <= count; j++) {
    const t = from + ((to - from) * j) / count;
    const c = Math.cos(t);
    const n = Math.sin(t);
    const p = [geo.O[0] + s * geo.SA[0] + r * (c * geo.SU[0] + n * geo.SV[0]), geo.O[1] + s * geo.SA[1] + r * (c * geo.SU[1] + n * geo.SV[1])];
    if (cut) p.cut = true;
    out.push(p);
  }
}

function t3RoundOutline(run, geo, cam) {
  const k = cam.k;
  const { s0, s1, r0, r1, ends } = run;
  const domes = (ends[0] === "dome" ? 1 : 0) + (ends[1] === "dome" ? 1 : 0);
  if (domes === 2) {
    const c0 = [geo.O[0] + s0 * geo.SA[0], geo.O[1] + s0 * geo.SA[1]];
    const c1 = [geo.O[0] + s1 * geo.SA[0], geo.O[1] + s1 * geo.SA[1]];
    const rk = r0 * k;
    const dx = c1[0] - c0[0];
    const dy = c1[1] - c0[1];
    const l = Math.hypot(dx, dy);
    const count = Math.max(24, Math.ceil((Math.PI * rk) / 1.5));
    const out = [];
    if (l < 1e-6) {
      for (let j = 0; j < 2 * count; j++) {
        const t = (j / (2 * count)) * T3_TAU;
        out.push([c1[0] + rk * Math.cos(t), c1[1] + rk * Math.sin(t)]);
      }
      return out;
    }
    const beta = Math.atan2(dy, dx);
    for (let j = 0; j <= count; j++) {
      const t = beta - Math.PI / 2 + (Math.PI * j) / count;
      out.push([c1[0] + rk * Math.cos(t), c1[1] + rk * Math.sin(t)]);
    }
    for (let j = 0; j <= count; j++) {
      const t = beta + Math.PI / 2 + (Math.PI * j) / count;
      out.push([c0[0] + rk * Math.cos(t), c0[1] + rk * Math.sin(t)]);
    }
    return out;
  }
  if (domes === 1) {
    const pts = [];
    for (const [end, s, r] of [[0, s0, r0], [1, s1, r1]]) {
      t3ArcPoints(geo, s, r, 0, T3_TAU, k, pts);
      if (ends[end] !== "dome") continue;
      const sign = end ? 1 : -1;
      const c = [geo.O[0] + s * geo.SA[0], geo.O[1] + s * geo.SA[1]];
      const rk = r * k;
      const beta = Math.atan2(sign * geo.SA[1], sign * geo.SA[0]);
      const count = Math.max(24, Math.ceil((Math.PI * rk) / 1.5));
      for (let j = 0; j <= count; j++) {
        const t = beta - Math.PI / 2 + (Math.PI * j) / count;
        pts.push([c[0] + rk * Math.cos(t), c[1] + rk * Math.sin(t)]);
      }
    }
    return t3Hull(pts);
  }
  const view = geo.view;
  const out = [];
  let c;
  if (view.flat < 1e-9) c = run.na * view.a > 0 ? -2 : 2;
  else c = -(run.na * view.a) / (run.nr * view.flat);
  if (c <= -1 || c >= 1) {
    const side = c <= -1;
    const capFirst = -geo.aV > 0;
    const keepFirst = side ? !capFirst : capFirst;
    const s = keepFirst ? s0 : s1;
    const r = keepFirst ? r0 : r1;
    t3ArcPoints(geo, s, r, 0, T3_TAU, k, out, run.cutS !== null && Math.abs(run.cutS - s) < 1e-6);
    out.pop();
    return out;
  }
  const d = Math.acos(c);
  const lo = view.phi - d;
  const hi = view.phi + d;
  const cut0 = run.cutS !== null && Math.abs(run.cutS - s0) < 1e-6;
  const cut1 = run.cutS !== null && Math.abs(run.cutS - s1) < 1e-6;
  if (-geo.aV > 0) t3ArcPoints(geo, s0, r0, hi, lo + T3_TAU, k, out, cut0);
  else t3ArcPoints(geo, s0, r0, lo, hi, k, out, cut0);
  const tail = [];
  if (geo.aV > 0) t3ArcPoints(geo, s1, r1, hi, lo + T3_TAU, k, tail, cut1);
  else t3ArcPoints(geo, s1, r1, lo, hi, k, tail, cut1);
  const first = out[out.length - 1];
  const a = tail[0];
  const b = tail[tail.length - 1];
  if (Math.hypot(a[0] - first[0], a[1] - first[1]) > Math.hypot(b[0] - first[0], b[1] - first[1])) tail.reverse();
  for (const p of tail) out.push(p);
  return out;
}

function t3LatheMid(a, b) {
  const h = b.s - a.s;
  const ga = -a.na / a.nr;
  const gb = -b.na / b.nr;
  const nr = a.nr + b.nr;
  const na = a.na + b.na;
  const l = Math.hypot(nr, na) || 1;
  return { s: (a.s + b.s) / 2, r: (a.r + b.r) / 2 + (h * (ga - gb)) / 8, nr: nr / l, na: na / l };
}

function t3LatheOutline(run, geo, cam) {
  const k = cam.k;
  const view = geo.view;
  const lv = run.levels;
  const pts = [];
  const cut = (L) => (view.flat < 1e-9 ? Infinity : -(L.na * view.a) / (L.nr * view.flat));
  const inside = (L) => L.r <= 1e-9 || Math.abs(cut(L)) < 1;
  const sides = (L) => {
    if (L.r <= 1e-9) {
      const p = [geo.O[0] + L.s * geo.SA[0], geo.O[1] + L.s * geo.SA[1]];
      return [p, p];
    }
    const c = Math.max(-1, Math.min(1, cut(L)));
    const d = Math.acos(c);
    return [view.phi - d, view.phi + d].map((t) => {
      const cs = Math.cos(t);
      const sn = Math.sin(t);
      return [geo.O[0] + L.s * geo.SA[0] + L.r * (cs * geo.SU[0] + sn * geo.SV[0]), geo.O[1] + L.s * geo.SA[1] + L.r * (cs * geo.SU[1] + sn * geo.SV[1])];
    });
  };
  const span = (a, b) => {
    const pa = sides(a);
    const pb = sides(b);
    return Math.max(Math.hypot(pa[0][0] - pb[0][0], pa[0][1] - pb[0][1]), Math.hypot(pa[1][0] - pb[1][0], pa[1][1] - pb[1][1]));
  };
  const refine = (a, b, depth) => {
    if (depth >= 10 || span(a, b) < 1.2) return;
    const mid = t3LatheMid(a, b);
    refine(a, mid, depth + 1);
    pts.push(...sides(mid));
    refine(mid, b, depth + 1);
  };
  let previous = null;
  for (let i = 0; i < lv.length; i += 4) {
    const L = { s: lv[i], r: lv[i + 1], nr: lv[i + 2], na: lv[i + 3] };
    if (inside(L)) pts.push(...sides(L));
    if (previous) {
      const pin = inside(previous);
      const lin = inside(L);
      if (pin && lin) refine(previous, L, 0);
      else if (pin !== lin) {
        let a = pin ? previous : L;
        let b = pin ? L : previous;
        const start = a;
        for (let it = 0; it < 14; it++) {
          const mid = t3LatheMid(a.s < b.s ? a : b, a.s < b.s ? b : a);
          if (inside(mid)) a = mid;
          else b = mid;
        }
        pts.push(...sides(a));
        refine(start.s < a.s ? start : a, start.s < a.s ? a : start, 0);
      }
    }
    previous = L;
  }
  for (const i of [0, lv.length - 4]) if (lv[i + 1] > 1e-9) t3ArcPoints(geo, lv[i], lv[i + 1], 0, T3_TAU, k, pts);
  return t3Hull(pts);
}

function t3SeamArc(geo, s, r, slope, k, trim = 0.3) {
  const view = geo.view;
  const norm = Math.hypot(1, slope);
  let lo;
  let hi;
  if (view.flat < 1e-9) {
    if (!((-slope * view.a) / norm > 0)) return "";
    lo = view.phi;
    hi = view.phi + T3_TAU;
  } else {
    const cc = (slope * view.a) / view.flat;
    if (cc >= 1) return "";
    if (cc <= -1) {
      lo = view.phi;
      hi = view.phi + T3_TAU;
    } else {
      const d = Math.acos(cc);
      lo = view.phi - d;
      hi = view.phi + d;
    }
  }
  const full = hi - lo >= T3_TAU - 1e-9;
  const buf = t3Scratch("c", 2 * 520);
  if (!full) {
    const span = hi - lo;
    const cutAt = (from, sign) => {
      t3At(geo, s, r, from, buf, 0);
      const px = buf[0];
      const py = buf[1];
      let a = 0;
      let b = span * 0.25;
      t3At(geo, s, r, from + sign * b, buf, 0);
      if (Math.hypot(buf[0] - px, buf[1] - py) <= trim) return b;
      for (let it = 0; it < 18; it++) {
        const mid = (a + b) / 2;
        t3At(geo, s, r, from + sign * mid, buf, 0);
        if (Math.hypot(buf[0] - px, buf[1] - py) < trim) a = mid;
        else b = mid;
      }
      return (a + b) / 2;
    };
    const d0 = cutAt(lo, 1);
    const d1 = cutAt(hi, -1);
    lo += d0;
    hi -= d1;
  }
  const count = Math.min(512, Math.max(4, Math.ceil(((hi - lo) * r * k) / 1.5)));
  for (let j = 0; j <= count; j++) t3At(geo, s, r, lo + ((hi - lo) * j) / count, buf, 2 * j);
  return t3Path(buf, full ? count : count + 1, full);
}

function t3RibLines(geo, F, cam, ribs, sx, sy) {
  const lines = t3Lines;
  lines.d.length = 0;
  lines.alpha.length = 0;
  lines.key.length = 0;
  const { s0, s1, count, phase = 0, twist = 0, fade = [0.1, 0.55] } = ribs;
  const r0 = ribs.r0 ?? ribs.r;
  const r1 = ribs.r1 ?? r0;
  const slope = (r1 - r0) / (s1 - s0 || 1);
  const norm = Math.hypot(1, slope);
  const view = geo.view;
  const seg = new Float64Array(4);
  for (let i = 0; i < count; i++) {
    const t = phase + (i / count) * T3_TAU;
    const tm = t + twist / 2;
    const facing = (view.flat * Math.cos(tm - view.phi) - slope * view.a) / norm;
    const alpha = t3Step(fade[0], fade[1], facing);
    if (alpha * T3_LEVELS < 0.5) continue;
    t3At(geo, s0, r0, t, seg, 0);
    t3At(geo, s1, r1, t + twist, seg, 2);
    seg[0] -= sx;
    seg[1] -= sy;
    seg[2] -= sx;
    seg[3] -= sy;
    lines.d.push(t3Path(seg, 2, false));
    lines.alpha.push(alpha);
    lines.key.push(i);
  }
  return lines;
}

function t3PrepareRound(run, part, P, unit) {
  const spec = part.spec;
  const k = P.scale * T3_ROOT;
  run.F = spec.F;
  run.s0 = spec.s0;
  run.s1 = spec.s1;
  run.r0 = spec.r0;
  run.r1 = spec.r1;
  run.ends = spec.ends;
  const g = (spec.r1 - spec.r0) / (spec.s1 - spec.s0 || 1);
  const norm = Math.hypot(1, g);
  run.nr = 1 / norm;
  run.na = -g / norm;
  run.g = g;
  const rmax = Math.max(spec.r0, spec.r1);
  const around = T3_TAU * rmax * k * unit;
  run.fine = Math.max(around < 30 ? 16 : 24, Math.min(96, Math.ceil(around / 2.2)));
  run.dirs = Math.max(around < 30 ? 16 : 32, Math.min(256, Math.ceil(around / 1.5)));
  run.capCount = Math.max(around < 30 ? 16 : 24, Math.min(160, Math.ceil(around / 1.5)));
  run.domeCount = Math.max(around < 30 ? 12 : 16, Math.min(48, Math.round(run.fine * 0.75)));
  const comps = [];
  for (const [end, s, r] of [[0, spec.s0, spec.r0], [1, spec.s1, spec.r1]]) comps.push(spec.ends[end] === "dome" ? 1 : 0, s, r);
  run.components = comps;
  const details = part.details ?? {};
  run.seams = (details.seams ?? []).map((s) => ({ s, r: spec.r0 + g * (s - spec.s0), slope: g }));
  run.ribs = details.ribs ? { ...details.ribs, r0: details.ribs.r0 ?? spec.r0 + g * (details.ribs.s0 - spec.s0), r1: details.ribs.r1 ?? spec.r0 + g * (details.ribs.s1 - spec.s0) } : null;
  run.cutS = null;
  for (const cut of spec.cuts ?? []) {
    const along = cut.n[0] * spec.F.a[0] + cut.n[1] * spec.F.a[1] + cut.n[2] * spec.F.a[2];
    const sCut = (cut.d - (cut.n[0] * spec.F.o[0] + cut.n[1] * spec.F.o[1] + cut.n[2] * spec.F.o[2])) / along;
    if (Math.abs(sCut - spec.s0) < 1e-6 || Math.abs(sCut - spec.s1) < 1e-6) run.cutS = sCut;
  }
}

function t3EmitRound(run, cam, f) {
  const geo = t3Geo(run.F, cam);
  const k = cam.k;
  const step = T3_TAU / run.fine;
  const sheets = ["", "", "", "", ""];
  const { s0, s1, r0, r1 } = run;
  for (const arc of t3Arcs(run.nr, run.na, geo.view, geo.light)) sheets[arc.tone] += t3Strip(geo, s0, r0, s1, r1, arc.from, arc.to, step);
  const F = run.F;
  for (let end = 0; end < 2; end++) {
    if (run.ends[end] !== "dome") continue;
    const s = end ? s1 : s0;
    const sign = end ? 1 : -1;
    const C = [F.o[0] + F.a[0] * s, F.o[1] + F.a[1] * s, F.o[2] + F.a[2] * s];
    t3Dome(cam, C, [F.a[0] * sign, F.a[1] * sign, F.a[2] * sign], end ? r1 : r0, run.domeCount, sheets);
  }
  for (let t = 0; t < 5; t++) f.d[run.role[`s${t}`]] = sheets[t];
  const pts = t3RoundOutline(run, geo, cam);
  const outline = t3PathOf(pts, true);
  f.d[run.role.fill] = outline;
  if (run.cutS !== null) {
    const buf = new Float64Array(2 * pts.length);
    const skip = new Uint8Array(pts.length);
    pts.forEach((p, j) => {
      buf[2 * j] = p[0];
      buf[2 * j + 1] = p[1];
    });
    for (let j = 0; j < pts.length; j++) skip[j] = pts[j].cut && pts[(j + 1) % pts.length].cut ? 1 : 0;
    f.d[run.role.edge] = t3Broken(buf, pts.length, skip);
  } else f.d[run.role.edge] = outline;
  t3BoxOf(pts, f.box);
  t3HullOut(f, pts);
  const view = geo.view;
  let crease = "";
  for (let end = 0; end < 2; end++) {
    if (run.ends[end] !== "flat") continue;
    const role = run.role[`k${end}`];
    const sign = end ? 1 : -1;
    const s = end ? s1 : s0;
    const r = end ? r1 : r0;
    const face = sign * geo.aV;
    if (!(face > 1e-9)) {
      f.d[role] = "";
      continue;
    }
    const n = run.capCount;
    const buf = t3Scratch("c", 2 * n);
    const table = t3Table(n);
    for (let j = 0; j < n; j++) {
      const c = table[2 * j];
      const q = table[2 * j + 1];
      buf[2 * j] = geo.O[0] + s * geo.SA[0] + r * (c * geo.SU[0] + q * geo.SV[0]);
      buf[2 * j + 1] = geo.O[1] + s * geo.SA[1] + r * (c * geo.SU[1] + q * geo.SV[1]);
    }
    f.d[role] = t3Path(buf, n, true);
    f.q[role] = t3Level(sign * geo.aL, T3_LB);
    const minor = 2 * r * k * Math.abs(face);
    f.w[role] = minor < 0.4 ? Math.round(minor * 100) / 100 : -1;
    if (run.role.crease === undefined) continue;
    let lo;
    let hi;
    if (view.flat < 1e-9) {
      if (!(run.na * view.a > 1e-9)) continue;
      lo = 0;
      hi = T3_TAU;
    } else {
      const cc = -(run.na * view.a) / (run.nr * view.flat);
      if (cc >= 1) continue;
      if (cc <= -1) {
        lo = view.phi;
        hi = view.phi + T3_TAU;
      } else {
        const d = Math.acos(cc);
        lo = view.phi - d;
        hi = view.phi + d;
      }
    }
    const count = Math.min(400, Math.max(4, Math.ceil(((hi - lo) * r * k) / 1.5)));
    const arc = t3Scratch("c", 2 * count + 2);
    for (let j = 0; j <= count; j++) t3At(geo, s, r, lo + ((hi - lo) * j) / count, arc, 2 * j);
    crease += t3Path(arc, count + 1, false);
  }
  if (run.role.crease !== undefined) f.d[run.role.crease] = crease;
  if (run.role.inner !== undefined) {
    let inner = "";
    for (const seam of run.seams) inner += t3SeamArc(geo, seam.s, seam.r, seam.slope, k);
    if (run.ribs && run.ribs.seams) {
      const rs = run.ribs;
      const slope = (rs.r1 - rs.r0) / (rs.s1 - rs.s0 || 1);
      if (rs.seams !== "last") inner += t3SeamArc(geo, rs.s0, rs.r0, slope, k);
      if (rs.seams !== "first") inner += t3SeamArc(geo, rs.s1, rs.r1, slope, k);
    }
    f.d[run.role.inner] = inner;
  }
  if (run.ribs) {
    const lines = t3State.detail < 0.01 ? t3None : t3RibLines(geo, run.F, cam, run.ribs, 0, 0);
    f.levels = t3Faded(f, run, "r", lines, lines.d.length);
  }
}

function t3PrepareBall(run, part, P, unit) {
  const spec = part.spec;
  const k = P.scale * T3_ROOT;
  run.c = spec.c;
  run.r = spec.r;
  run.flats = spec.flats.map((flat) => {
    const n = t3Unit(flat.n);
    const rho = Math.sqrt(Math.max(0, spec.r * spec.r - flat.d * flat.d));
    const [u, v] = t3Basis(n);
    return { n, d: flat.d, rho, u, v };
  });
  run.limb = Math.max(32, Math.min(160, Math.ceil((T3_TAU * spec.r * k * unit) / 1.5)));
  run.rimCount = run.flats.map((flat) => Math.max(20, Math.min(120, Math.ceil((T3_TAU * flat.rho * k * unit) / 1.5))));
}

function t3ClipConvex(subject, clip) {
  if (subject.length < 3 || clip.length < 3) return [];
  let area = 0;
  for (let i = 0; i < clip.length; i++) {
    const a = clip[i];
    const b = clip[(i + 1) % clip.length];
    area += a[0] * b[1] - b[0] * a[1];
  }
  const sign = area >= 0 ? 1 : -1;
  let out = subject;
  for (let i = 0; i < clip.length && out.length; i++) {
    const a = clip[i];
    const b = clip[(i + 1) % clip.length];
    const side = (p) => sign * ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]));
    const input = out;
    out = [];
    for (let j = 0; j < input.length; j++) {
      const p = input[j];
      const q = input[(j + 1) % input.length];
      const sp = side(p);
      const sq = side(q);
      if (sp >= 0) out.push(p);
      if ((sp >= 0) !== (sq >= 0)) {
        const t = sp / (sp - sq);
        out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
      }
    }
  }
  return out;
}

function t3EmitBall(run, cam, f) {
  const m = cam.m;
  const V = cam.V;
  const L = cam.L;
  const { c, r, flats } = run;
  const Cx = cam.ox + m[0] * c[0] + m[1] * c[1] + m[2] * c[2];
  const Cy = cam.oy + m[3] * c[0] + m[4] * c[1] + m[5] * c[2];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const flat = (w) => [Cx + r * (m[0] * w[0] + m[1] * w[1] + m[2] * w[2]), Cy + r * (m[3] * w[0] + m[4] * w[1] + m[5] * w[2])];
  const inside = (w, skip = -1) => {
    for (let i = 0; i < flats.length; i++) if (i !== skip && dot(w, flats[i].n) * r > flats[i].d + 1e-7) return false;
    return true;
  };
  const [U, W] = t3Basis(V);
  const n = run.limb;
  const table = t3Table(n);
  const limb = [];
  for (let j = 0; j < n; j++) limb.push([U[0] * table[2 * j] + W[0] * table[2 * j + 1], U[1] * table[2 * j] + W[1] * table[2 * j + 1], U[2] * table[2 * j] + W[2] * table[2 * j + 1]]);
  const sil = [];
  for (const w of limb) if (inside(w)) sil.push(flat(w));
  const rims = flats.map((cut, ci) => {
    const count = run.rimCount[ci];
    const t = t3Table(count);
    const list = [];
    for (let j = 0; j < count; j++) {
      const w = [(cut.n[0] * cut.d + cut.rho * (cut.u[0] * t[2 * j] + cut.v[0] * t[2 * j + 1])) / r, (cut.n[1] * cut.d + cut.rho * (cut.u[1] * t[2 * j] + cut.v[1] * t[2 * j + 1])) / r, (cut.n[2] * cut.d + cut.rho * (cut.u[2] * t[2 * j] + cut.v[2] * t[2 * j + 1])) / r];
      list.push({ w, keep: inside(w, ci), p: flat(w) });
    }
    return list;
  });
  flats.forEach((cut, ci) => {
    for (const w of t3Meet(V, 0, cut.n, cut.d / r)) if (inside(w, ci)) sil.push(flat(w));
    rims[ci].forEach(({ keep, p }) => keep && sil.push(p));
  });
  const hull = t3Hull(sil);
  const outline = t3PathOf(hull, true);
  f.d[run.role.fill] = outline;
  f.d[run.role.edge] = outline;
  f.d[run.role.s0] = outline;
  const capOf = (threshold) => {
    const points = [];
    for (const w of limb) if (dot(w, L) >= threshold && inside(w)) points.push(flat(w));
    const radius = Math.sqrt(Math.max(0, 1 - threshold * threshold));
    const [LU, LW] = t3Basis(L);
    for (let j = 0; j < n; j++) {
      const w = [L[0] * threshold + radius * (LU[0] * table[2 * j] + LW[0] * table[2 * j + 1]), L[1] * threshold + radius * (LU[1] * table[2 * j] + LW[1] * table[2 * j + 1]), L[2] * threshold + radius * (LU[2] * table[2 * j] + LW[2] * table[2 * j + 1])];
      if (dot(w, V) >= -1e-9) points.push(flat(w));
    }
    if (dot(L, V) > threshold) points.push(flat(V));
    for (const w of t3Meet(L, threshold, V, 0)) if (inside(w)) points.push(flat(w));
    flats.forEach((cut, ci) => {
      for (const w of t3Meet(V, 0, cut.n, cut.d / r)) if (inside(w, ci) && dot(w, L) >= threshold) points.push(flat(w));
      for (const w of t3Meet(L, threshold, cut.n, cut.d / r)) if (inside(w, ci) && dot(w, V) >= -1e-9) points.push(flat(w));
      for (const { w, keep, p } of rims[ci]) if (keep && dot(w, L) >= threshold && dot(w, V) >= -1e-9) points.push(p);
    });
    if (points.length < 3) return "";
    const region = t3ClipConvex(t3Hull(points), hull);
    return region.length >= 3 ? t3PathOf(region, true) : "";
  };
  f.d[run.role.s1] = capOf(T3_LB[1]);
  f.d[run.role.s2] = capOf(T3_LB[2]);
  f.d[run.role.s3] = capOf(T3_LB[3]);
  let crease = "";
  flats.forEach((cut, ci) => {
    const role = run.role[`f${ci}`];
    const face = dot(cut.n, V);
    if (!(face > 1e-9)) {
      f.d[role] = "";
      return;
    }
    const pts = t3ClipConvex(rims[ci].map(({ p }) => p), hull);
    f.d[role] = t3PathOf(pts, true);
    f.q[role] = t3Level(dot(cut.n, L), T3_LB);
    const minor = 2 * cut.rho * cam.k * face;
    f.w[role] = minor < 0.4 ? Math.round(minor * 100) / 100 : -1;
    const list = rims[ci];
    const seen = list.map(({ w, keep }) => keep && dot(w, V) > 0);
    const start = seen.indexOf(false);
    if (start < 0) {
      crease += t3PathOf(list.map(({ p }) => p), true);
      return;
    }
    let cur = null;
    for (let s = 1; s <= list.length; s++) {
      const i = (start + s) % list.length;
      if (seen[i]) (cur ??= []).push(list[i].p);
      else if (cur) {
        if (cur.length > 1) crease += t3PathOf(cur, false);
        cur = null;
      }
    }
    if (cur && cur.length > 1) crease += t3PathOf(cur, false);
  });
  if (run.role.crease !== undefined) f.d[run.role.crease] = crease;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of hull) {
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  f.box[0] = x0;
  f.box[1] = y0;
  f.box[2] = x1;
  f.box[3] = y1;
  t3HullOut(f, hull);
}

function t3PrepareLathe(run, part, P, unit) {
  const spec = part.spec;
  const k = P.scale * T3_ROOT;
  run.F = spec.F;
  run.levels = spec.levels;
  run.caps = spec.caps;
  let rmax = 0;
  for (let i = 0; i < spec.levels.length; i += 4) rmax = Math.max(rmax, spec.levels[i + 1]);
  run.fine = Math.max(24, Math.min(96, Math.ceil((T3_TAU * rmax * k * unit) / 2.2)));
  run.dirs = Math.max(32, Math.min(256, Math.ceil((T3_TAU * rmax * k * unit) / 1.5)));
  run.capCount = Math.max(24, Math.min(160, Math.ceil((T3_TAU * rmax * k * unit) / 1.5)));
  const comps = [];
  for (let i = 0; i < spec.levels.length; i += 4) comps.push(0, spec.levels[i], spec.levels[i + 1]);
  run.components = comps;
  const details = part.details ?? {};
  run.seams = (details.seams ?? []).map((seam) => (typeof seam === "number" ? t3LatheSeam(spec.levels, seam) : seam));
  run.ribs = details.ribs ?? null;
}

function t3LatheSeam(levels, s) {
  for (let i = 0; i + 4 < levels.length; i += 4) {
    const sa = levels[i];
    const sb = levels[i + 4];
    if ((s - sa) * (s - sb) <= 0 && sa !== sb) {
      const t = (s - sa) / (sb - sa);
      const r = levels[i + 1] + (levels[i + 5] - levels[i + 1]) * t;
      const slope = (levels[i + 5] - levels[i + 1]) / (sb - sa);
      return { s, r, slope };
    }
  }
  return { s, r: levels[1], slope: 0 };
}

function t3LatheSheets(levels, geo, step, buckets) {
  const at = (L, t) => {
    const c = Math.cos(t);
    const n = Math.sin(t);
    return [geo.O[0] + L.s * geo.SA[0] + L.r * (c * geo.SU[0] + n * geo.SV[0]), geo.O[1] + L.s * geo.SA[1] + L.r * (c * geo.SU[1] + n * geo.SV[1])];
  };
  const arcPoints = (L, from, to) => {
    const count = Math.max(1, Math.ceil((to - from) / step));
    const out = new Array(count + 1);
    for (let index = 0; index <= count; index++) out[index] = at(L, from + ((to - from) * index) / count);
    return out;
  };
  const oriented = (points) => {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      area += a[0] * b[1] - b[0] * a[1];
    }
    return area < 0 ? points.reverse() : points;
  };
  const centreOf = (arc, reference) => {
    let mid = (arc.from + arc.to) / 2 - reference;
    mid = ((mid % T3_TAU) + T3_TAU) % T3_TAU;
    return mid;
  };
  const present = [false, false, false, false, false];
  for (const L of levels) {
    const groups = [null, null, null, null, null];
    for (const arc of L.arcs) {
      if (!groups[arc.tone]) groups[arc.tone] = [];
      groups[arc.tone].push(arc);
      present[arc.tone] = true;
    }
    for (const list of groups) if (list && list.length > 1) list.sort((x, y) => centreOf(x, geo.light.phi) - centreOf(y, geo.light.phi));
    L.groups = groups;
  }
  const align = (reference, arc) => {
    const out = { ...arc };
    const centre = (reference.from + reference.to) / 2;
    while ((out.from + out.to) / 2 - centre > Math.PI) {
      out.from -= T3_TAU;
      out.to -= T3_TAU;
    }
    while (centre - (out.from + out.to) / 2 > Math.PI) {
      out.from += T3_TAU;
      out.to += T3_TAU;
    }
    return out;
  };
  const overlap = (x, y) => Math.min(x.to, y.to) - Math.max(x.from, y.from);
  const sheet = (tone, run) => {
    const chains = run[0].groups[tone].map((arc) => [arc]);
    for (let q = 1; q < run.length; q++) {
      const next = run[q].groups[tone];
      const used = new Uint8Array(next.length);
      for (const chain of chains) {
        const prev = chain[q - 1];
        let best = -1;
        let score = -Infinity;
        for (let j = 0; j < next.length; j++) {
          if (used[j]) continue;
          const value = overlap(prev, align(prev, next[j]));
          if (value > score) {
            score = value;
            best = j;
          }
        }
        used[best] = 1;
        chain.push(align(prev, next[best]));
      }
    }
    chains.forEach((chain) => {
      const last = run.length - 1;
      const points = arcPoints(run[0], chain[0].from, chain[0].to);
      for (let q = 1; q < last; q++) points.push(at(run[q], chain[q].to));
      points.push(...arcPoints(run[last], chain[last].from, chain[last].to).reverse());
      for (let q = last - 1; q >= 1; q--) points.push(at(run[q], chain[q].from));
      buckets[tone] += t3PathOf(oriented(points), true);
    });
  };
  const strip = (tone, a, b) => {
    const below = a.groups[tone] ?? [];
    const above = b.groups[tone] ?? [];
    const whole = (arc) => arc.to - arc.from >= T3_TAU - 1e-6;
    const seat = (ring, arc) => {
      const gap = T3_TAU - (arc.to - arc.from);
      return { from: arc.from - gap / 2, to: arc.to + gap / 2 };
    };
    const quad = (lo, hi) => {
      if (whole(hi) && !whole(lo)) hi = seat(hi, lo);
      else if (whole(lo) && !whole(hi)) lo = seat(lo, hi);
      const points = [...arcPoints(a, lo.from, lo.to), ...arcPoints(b, hi.from, hi.to).reverse()];
      buckets[tone] += t3PathOf(oriented(points), true);
    };
    const links = below.map(() => []);
    const back = above.map(() => []);
    below.forEach((lo, i) =>
      above.forEach((hi, j) => {
        if (overlap(lo, align(lo, hi)) > -0.05) {
          links[i].push(j);
          back[j].push(i);
        }
      }),
    );
    const doneLo = new Uint8Array(below.length);
    const doneHi = new Uint8Array(above.length);
    const share = (span, parts, flip) => {
      if (whole(span)) {
        const base = parts[0].from;
        const sorted = parts.map((arc) => {
          const shift = T3_TAU * Math.floor((arc.from - base) / T3_TAU);
          return { from: arc.from - shift, to: arc.to - shift };
        }).sort((x, y) => x.from - y.from);
        const n = sorted.length;
        const cuts = sorted.map((arc, q) => {
          const next = q + 1 < n ? sorted[q + 1].from : sorted[0].from + T3_TAU;
          return (arc.to + next) / 2;
        });
        sorted.forEach((arc, q) => {
          const piece = { from: q ? cuts[q - 1] : cuts[n - 1] - T3_TAU, to: cuts[q] };
          if (flip) quad(arc, piece);
          else quad(piece, arc);
        });
        return;
      }
      const sorted = parts.map((arc) => align(span, arc)).sort((x, y) => x.from - y.from);
      const cuts = [span.from];
      for (let q = 1; q < sorted.length; q++) cuts.push(Math.min(span.to, Math.max(span.from, (sorted[q - 1].to + sorted[q].from) / 2)));
      cuts.push(span.to);
      sorted.forEach((arc, q) => {
        const piece = { from: cuts[q], to: cuts[q + 1] };
        if (flip) quad(arc, piece);
        else quad(piece, arc);
      });
    };
    for (let j = 0; j < above.length; j++) {
      if (back[j].length < 2 || back[j].some((i) => links[i].length !== 1)) continue;
      share(above[j], back[j].map((i) => below[i]), false);
      doneHi[j] = 1;
      for (const i of back[j]) doneLo[i] = 1;
    }
    for (let i = 0; i < below.length; i++) {
      if (doneLo[i] || links[i].length < 2 || links[i].some((j) => back[j].length !== 1)) continue;
      share(below[i], links[i].map((j) => above[j]), true);
      doneLo[i] = 1;
      for (const j of links[i]) doneHi[j] = 1;
    }
    for (let i = 0; i < below.length; i++) {
      if (doneLo[i]) continue;
      const lo = below[i];
      let best = -1;
      let score = -Infinity;
      for (const j of links[i]) {
        if (doneHi[j]) continue;
        const value = overlap(lo, align(lo, above[j]));
        if (value > score) {
          score = value;
          best = j;
        }
      }
      if (best >= 0) {
        doneHi[best] = 1;
        quad(lo, align(lo, above[best]));
      } else {
        const centre = (lo.from + lo.to) / 2;
        quad(lo, { from: centre, to: centre });
      }
    }
    for (let j = 0; j < above.length; j++) {
      if (doneHi[j]) continue;
      const centre = (above[j].from + above[j].to) / 2;
      quad({ from: centre, to: centre }, above[j]);
    }
  };
  for (let tone = 0; tone < 5; tone++) {
    if (!present[tone]) continue;
    for (let q = 1; q < levels.length; q++) strip(tone, levels[q - 1], levels[q]);
  }
  void sheet;
}

function t3EmitLathe(run, cam, f) {
  const geo = t3Geo(run.F, cam);
  const k = cam.k;
  const step = T3_TAU / run.fine;
  const sheets = ["", "", "", "", ""];
  const lv = run.levels;
  const levelAt = (s, r, nr, na) => ({ s, r, nr, na, arcs: t3Arcs(nr, na, geo.view, geo.light) });
  const same = (a, b) => {
    if (a.arcs.length !== b.arcs.length) return false;
    for (let i = 0; i < a.arcs.length; i++) if (a.arcs[i].tone !== b.arcs[i].tone || Boolean(a.arcs[i].full) !== Boolean(b.arcs[i].full)) return false;
    return true;
  };
  const reach = (a, b) => Math.hypot((b.s - a.s) * Math.hypot(geo.SA[0], geo.SA[1]), (b.r - a.r) * k) + Math.abs(b.r - a.r) * k;
  const levels = [];
  const wrap = (x, ref) => x + T3_TAU * Math.round((ref - x) / T3_TAU);
  const close = (a, mid, b) => {
    const r = Math.max(a.r, b.r) * k;
    for (let i = 0; i < mid.arcs.length; i++) {
      const m = mid.arcs[i];
      if (m.full) continue;
      for (const key of ["from", "to"]) {
        const x = m[key];
        const guess = (wrap(a.arcs[i][key], x) + wrap(b.arcs[i][key], x)) / 2;
        if (Math.abs(guess - x) * r > 0.25) return false;
      }
    }
    return true;
  };
  const refine = (a, b, depth) => {
    if (depth >= 8 || reach(a, b) < 0.1) {
      levels.push(b);
      return;
    }
    const m = t3LatheMid(a, b);
    const mid = levelAt(m.s, m.r, m.nr, m.na);
    if (same(a, b) && same(a, mid) && close(a, mid, b)) {
      levels.push(b);
      return;
    }
    refine(a, mid, depth + 1);
    refine(mid, b, depth + 1);
  };
  let previous = levelAt(lv[0], lv[1], lv[2], lv[3]);
  levels.push(previous);
  for (let i = 4; i < lv.length; i += 4) {
    const next = levelAt(lv[i], lv[i + 1], lv[i + 2], lv[i + 3]);
    refine(previous, next, 0);
    previous = next;
  }
  t3LatheSheets(levels, geo, step, sheets);
  for (let t = 0; t < 5; t++) f.d[run.role[`s${t}`]] = sheets[t];
  const pts = t3LatheOutline(run, geo, cam);
  const outline = t3PathOf(pts, true);
  f.d[run.role.fill] = outline;
  f.d[run.role.edge] = outline;
  t3BoxOf(pts, f.box);
  t3HullOut(f, pts);
  let crease = "";
  const view = geo.view;
  const ends = [[0, lv[0], lv[1], -1, 4], [1, lv[lv.length - 4], lv[lv.length - 3], 1, lv.length - 8]];
  for (const [end, s, r, sign, near] of ends) {
    const role = run.role[`k${end}`];
    if (role === undefined) continue;
    const face = sign * geo.aV;
    if (!(face > 1e-9) || r <= 1e-9) {
      f.d[role] = "";
      continue;
    }
    const n = run.capCount;
    const buf = t3Scratch("c", 2 * n);
    const table = t3Table(n);
    for (let j = 0; j < n; j++) {
      const c = table[2 * j];
      const q = table[2 * j + 1];
      buf[2 * j] = geo.O[0] + s * geo.SA[0] + r * (c * geo.SU[0] + q * geo.SV[0]);
      buf[2 * j + 1] = geo.O[1] + s * geo.SA[1] + r * (c * geo.SU[1] + q * geo.SV[1]);
    }
    f.d[role] = t3Path(buf, n, true);
    f.q[role] = t3Level(sign * geo.aL, T3_LB);
    const minor = 2 * r * k * Math.abs(face);
    f.w[role] = minor < 0.4 ? Math.round(minor * 100) / 100 : -1;
    if (run.role.crease === undefined) continue;
    const nr = lv[near + 2];
    const na = lv[near + 3];
    let lo;
    let hi;
    if (view.flat < 1e-9) {
      if (!(na * view.a > 1e-9)) continue;
      lo = 0;
      hi = T3_TAU;
    } else {
      const cc = -(na * view.a) / (nr * view.flat);
      if (cc >= 1) continue;
      if (cc <= -1) {
        lo = view.phi;
        hi = view.phi + T3_TAU;
      } else {
        const d = Math.acos(cc);
        lo = view.phi - d;
        hi = view.phi + d;
      }
    }
    const count = Math.min(400, Math.max(4, Math.ceil(((hi - lo) * r * k) / 1.5)));
    const arc = t3Scratch("c", 2 * count + 2);
    for (let j = 0; j <= count; j++) t3At(geo, s, r, lo + ((hi - lo) * j) / count, arc, 2 * j);
    crease += t3Path(arc, count + 1, false);
  }
  if (run.role.crease !== undefined) f.d[run.role.crease] = crease;
  if (run.role.inner !== undefined) {
    let inner = "";
    for (const seam of run.seams) inner += t3SeamArc(geo, seam.s, seam.r, seam.slope, k);
    f.d[run.role.inner] = inner;
  }
  if (run.ribs) {
    const lines = t3State.detail < 0.01 ? t3None : t3RibLines(geo, run.F, cam, run.ribs, 0, 0);
    f.levels = t3Faded(f, run, "r", lines, lines.d.length);
  }
}

const T3_SHINE = (() => {
  const l = Math.hypot(-0.55, -0.835);
  return [-0.55 / l, -0.835 / l];
})();

function t3RouteOf(flat) {
  const n = flat.length / 3;
  const along = new Float64Array(n);
  for (let i = 1; i < n; i++) along[i] = along[i - 1] + Math.hypot(flat[3 * i] - flat[3 * i - 3], flat[3 * i + 1] - flat[3 * i - 2], flat[3 * i + 2] - flat[3 * i - 1]);
  return { flat, n, along, total: along[n - 1] };
}

function t3PointAlong(route, at) {
  const { flat, n, along } = route;
  if (at <= 0) return [flat[0], flat[1], flat[2]];
  if (at >= along[n - 1]) return [flat[3 * n - 3], flat[3 * n - 2], flat[3 * n - 1]];
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (along[mid] <= at) lo = mid;
    else hi = mid;
  }
  const span = along[hi] - along[lo] || 1;
  const t = (at - along[lo]) / span;
  return [flat[3 * lo] + (flat[3 * hi] - flat[3 * lo]) * t, flat[3 * lo + 1] + (flat[3 * hi + 1] - flat[3 * lo + 1]) * t, flat[3 * lo + 2] + (flat[3 * hi + 2] - flat[3 * lo + 2]) * t];
}

function t3Cut(route, from, to) {
  const { flat, n, along } = route;
  const out = [];
  for (let i = 1; i < n; i++) {
    const start = along[i - 1];
    const end = along[i];
    if (end >= from && start <= to) {
      const length = end - start || 1;
      const t0 = Math.max(0, (from - start) / length);
      const t1 = Math.min(1, (to - start) / length);
      const at = (t) => [flat[3 * i - 3] + (flat[3 * i] - flat[3 * i - 3]) * t, flat[3 * i - 2] + (flat[3 * i + 1] - flat[3 * i - 2]) * t, flat[3 * i - 1] + (flat[3 * i + 2] - flat[3 * i - 1]) * t];
      if (!out.length) out.push(at(t0));
      out.push(at(t1));
    }
  }
  return out;
}

function t3TangentAlong(route, at) {
  const a = t3PointAlong(route, Math.max(0, at - 0.6));
  const b = t3PointAlong(route, Math.min(route.total, at + 0.6));
  return t3Unit([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
}

const t3RouteCache = new WeakMap();

function t3PrepareTube(run, part, data) {
  const spec = part.spec;
  const source = data.routes[spec.route];
  let route = t3RouteCache.get(source);
  if (!route) {
    route = t3RouteOf(source.points);
    t3RouteCache.set(source, route);
  }
  const total = route.total;
  const r = source.r;
  const step = Math.max(0.05, Math.min(source.spacing, total / 4) * 0.5);
  const lead = 0.5;
  run.r = r;
  run.wide = Boolean(source.wide);
  run.hue = source.hue ?? null;
  const partOf = (start, end) => {
    const points = t3Cut(route, Math.max(0, start), Math.min(total, end));
    let walked = Math.max(0, start);
    const count = points.length;
    const P3 = new Float64Array(3 * count);
    const D3 = new Float64Array(3 * count);
    for (let i = 0; i < count; i++) {
      if (i > 0) walked += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1], points[i][2] - points[i - 1][2]);
      const a = t3PointAlong(route, Math.max(0, Math.min(total, walked - step)));
      const b = t3PointAlong(route, Math.max(0, Math.min(total, walked + step)));
      for (let c = 0; c < 3; c++) {
        P3[3 * i + c] = points[i][c];
        D3[3 * i + c] = b[c] - a[c];
      }
    }
    return { count, P3, D3 };
  };
  const openStart = spec.open0 && spec.from > 0;
  const openEnd = spec.open1 && spec.to < total;
  run.body = partOf(openStart ? spec.from - lead : spec.from, openEnd ? spec.to + lead : spec.to);
  run.stripe = openStart || openEnd ? partOf(openStart ? spec.from - 2 * lead : spec.from, openEnd ? spec.to + 2 * lead : spec.to) : run.body;
  const ends = [!spec.open0 && (spec.from <= 1e-6 || spec.gap0), !spec.open1 && (spec.to >= total - 1e-6 || spec.gap1)];
  run.capped = [ends[0] && (spec.gap0 || spec.caps[0]), ends[1] && (spec.gap1 || spec.caps[1])];
  const P3 = run.body.P3;
  const last = run.body.count - 1;
  const vec = (i, j) => t3Unit([P3[3 * i] - P3[3 * j], P3[3 * i + 1] - P3[3 * j + 1], P3[3 * i + 2] - P3[3 * j + 2]]);
  run.tips = [vec(1, 0), vec(last, last - 1)];
  run.rings = null;
  if (source.rings) {
    const { pitch = 3, twist = 0, cross = false, fade = [0.1, 0.55], phase = 0, steps = 16 } = source.rings;
    const lo = openStart ? spec.from - 2 * lead : spec.from;
    const hi = openEnd ? spec.to + 2 * lead : spec.to;
    const margin = twist ? 0 : Math.min(pitch * 0.35, (hi - lo) / 2);
    const from = Math.max(lo, !openStart ? lo + margin : lo);
    const to = Math.min(hi, !openEnd ? hi - margin : hi);
    const segments = [];
    if (to > from) {
      const hands = twist ? (cross ? [1, -1] : [1]) : [0];
      const reach = Math.abs(twist) * r;
      const first = Math.ceil((from - reach - phase) / pitch);
      const lastIndex = Math.floor((to + reach - phase) / pitch);
      const surface = (t, theta) => {
        const at = Math.max(0, Math.min(total, t));
        return { c: t3PointAlong(route, at), T: t3TangentAlong(route, at), theta };
      };
      for (let index = first; index <= lastIndex; index++) {
        const station = phase + index * pitch;
        for (const hand of hands) {
          const samples = [];
          for (let k = 0; k <= steps; k++) {
            const theta = (k / steps) * Math.PI;
            const t = station + hand * twist * r * (k / steps - 0.5);
            samples.push({ t, theta });
          }
          for (let k = 0; k < steps; k++) {
            let a = samples[k];
            let b = samples[k + 1];
            if ((a.t < from && b.t < from) || (a.t > to && b.t > to)) continue;
            const clipTo = (x, y, edge) => ({ t: edge, theta: x.theta + ((y.theta - x.theta) * (edge - x.t)) / (y.t - x.t || 1e-9) });
            if (a.t < from) a = clipTo(a, b, from);
            if (b.t < from) b = clipTo(b, a, from);
            if (a.t > to) a = clipTo(a, b, to);
            if (b.t > to) b = clipTo(b, a, to);
            segments.push([surface(a.t, a.theta), surface(b.t, b.theta)]);
          }
        }
      }
    }
    run.rings = { segments, fade, tone: source.rings.tone ?? "lo" };
  }
}

function t3Sides(part, cam, r) {
  const m = cam.m;
  const k = cam.k;
  const n = part.count;
  const out = { n, flat: new Float64Array(2 * n), left: new Float64Array(2 * n), right: new Float64Array(2 * n), shineA: new Float64Array(2 * n), shineB: new Float64Array(2 * n), shadeA: new Float64Array(2 * n), shadeB: new Float64Array(2 * n), frames: [] };
  const half = r * k;
  for (let i = 0; i < n; i++) {
    const x = part.P3[3 * i];
    const y = part.P3[3 * i + 1];
    const z = part.P3[3 * i + 2];
    const px = cam.ox + m[0] * x + m[1] * y + m[2] * z;
    const py = cam.oy + m[3] * x + m[4] * y + m[5] * z;
    const dx = m[0] * part.D3[3 * i] + m[1] * part.D3[3 * i + 1] + m[2] * part.D3[3 * i + 2];
    const dy = m[3] * part.D3[3 * i] + m[4] * part.D3[3 * i + 1] + m[5] * part.D3[3 * i + 2];
    const l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l;
    const ny = dx / l;
    out.flat[2 * i] = px;
    out.flat[2 * i + 1] = py;
    out.frames.push({ p: [px, py], nx, ny, half });
    out.left[2 * i] = px + nx * half;
    out.left[2 * i + 1] = py + ny * half;
    out.right[2 * i] = px - nx * half;
    out.right[2 * i + 1] = py - ny * half;
    const toward = nx * T3_SHINE[0] + ny * T3_SHINE[1];
    const shineAt = half * 0.44 * toward;
    const shineHalf = half * 0.24;
    out.shineA[2 * i] = px + nx * (shineAt + shineHalf);
    out.shineA[2 * i + 1] = py + ny * (shineAt + shineHalf);
    out.shineB[2 * i] = px + nx * (shineAt - shineHalf);
    out.shineB[2 * i + 1] = py + ny * (shineAt - shineHalf);
    const shadeAt = -half * 0.62 * toward;
    const shadeHalf = half * 0.2;
    out.shadeA[2 * i] = px + nx * (shadeAt + shadeHalf);
    out.shadeA[2 * i + 1] = py + ny * (shadeAt + shadeHalf);
    out.shadeB[2 * i] = px + nx * (shadeAt - shadeHalf);
    out.shadeB[2 * i + 1] = py + ny * (shadeAt - shadeHalf);
  }
  return out;
}

const t3Pts = (buf, n) => {
  const out = new Array(n);
  for (let i = 0; i < n; i++) out[i] = [buf[2 * i], buf[2 * i + 1]];
  return out;
};

function t3TubeCap(cam, centre, tangent, radius, inward) {
  const V = cam.V;
  const m = cam.m;
  let n1 = [tangent[1] * V[2] - tangent[2] * V[1], tangent[2] * V[0] - tangent[0] * V[2], tangent[0] * V[1] - tangent[1] * V[0]];
  if (Math.hypot(n1[0], n1[1], n1[2]) < 1e-6) {
    const helper = Math.abs(tangent[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1];
    n1 = [helper[1] * tangent[2] - helper[2] * tangent[1], helper[2] * tangent[0] - helper[0] * tangent[2], helper[0] * tangent[1] - helper[1] * tangent[0]];
  }
  n1 = t3Unit(n1);
  const n2 = t3Unit([tangent[1] * n1[2] - tangent[2] * n1[1], tangent[2] * n1[0] - tangent[0] * n1[2], tangent[0] * n1[1] - tangent[1] * n1[0]]);
  const steps = 28;
  const proj = (p) => [cam.ox + m[0] * p[0] + m[1] * p[1] + m[2] * p[2], cam.oy + m[3] * p[0] + m[4] * p[1] + m[5] * p[2]];
  const ring = new Array(steps);
  for (let index = 0; index < steps; index++) {
    const angle = (index / steps) * T3_TAU;
    const cs = radius * Math.cos(angle);
    const sn = radius * Math.sin(angle);
    ring[index] = proj([centre[0] + n1[0] * cs + n2[0] * sn, centre[1] + n1[1] * cs + n2[1] * sn, centre[2] + n1[2] * cs + n2[2] * sn]);
  }
  const C = proj(centre);
  const probe = proj([centre[0] + n2[0], centre[1] + n2[1], centre[2] + n2[2]]);
  const along = (probe[0] - C[0]) * inward[0] + (probe[1] - C[1]) * inward[1];
  const from = along > 0 ? steps / 2 : 0;
  const half = (start) => Array.from({ length: steps / 2 + 1 }, (_, index) => ring[(start + index) % steps]);
  return { ring, arc: half(from), inner: half((from + steps / 2) % steps) };
}

function t3StripeEnd(half, centre, nx, ny, from, to) {
  const offset = (p) => (p[0] - centre[0]) * nx + (p[1] - centre[1]) * ny;
  const values = half.map(offset);
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  const points = [];
  const cross = (k, level) => {
    const t = (level - values[k]) / (values[k + 1] - values[k] || 1e-9);
    return [half[k][0] + (half[k + 1][0] - half[k][0]) * t, half[k][1] + (half[k + 1][1] - half[k][1]) * t];
  };
  for (let k = 0; k < half.length; k++) {
    if (values[k] >= lo && values[k] <= hi) points.push(half[k]);
    if (k < half.length - 1) for (const level of [lo, hi]) if ((values[k] - level) * (values[k + 1] - level) < 0) points.push(cross(k, level));
  }
  return points
    .map((p) => [p, offset(p)])
    .sort((x, y) => (from > to ? y[1] - x[1] : x[1] - y[1]))
    .map(([p]) => p);
}

function t3EmitTube(run, cam, f) {
  const r = run.r;
  const sides = t3Sides(run.body, cam, r);
  const bands = run.stripe === run.body ? sides : t3Sides(run.stripe, cam, r);
  const n = sides.n;
  const left = t3Pts(sides.left, n);
  const right = t3Pts(sides.right, n);
  const loop = left.concat(right.slice().reverse());
  let area = 0;
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i];
    const b = loop[(i + 1) % loop.length];
    area += a[0] * b[1] - b[0] * a[1];
  }
  const sign = Math.sign(area);
  let body = t3PathOf(loop, true);
  let edges = t3PathOf(left, false) + t3PathOf(right, false);
  const tips = [null, null];
  const last = n - 1;
  const quads = [];
  for (let i = 0; i < last; i++) quads.push([left[i], left[i + 1], right[i + 1], right[i]]);
  for (const side of [0, 1]) {
    if (!run.capped[side]) continue;
    const at = side ? last : 0;
    const other = side ? last - 1 : 1;
    const tangent = run.tips[side];
    const outward = side ? tangent : [-tangent[0], -tangent[1], -tangent[2]];
    const inward = [sides.flat[2 * other] - sides.flat[2 * at], sides.flat[2 * other + 1] - sides.flat[2 * at + 1]];
    const centre = [run.body.P3[3 * at], run.body.P3[3 * at + 1], run.body.P3[3 * at + 2]];
    const { ring, arc, inner } = t3TubeCap(cam, centre, tangent, r, inward);
    let ringArea = 0;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      ringArea += a[0] * b[1] - b[0] * a[1];
    }
    body += t3PathOf(Math.sign(ringArea) === sign ? ring : ring.slice().reverse(), true);
    edges += t3PathOf(arc, false);
    const V = cam.V;
    const open = outward[0] * V[0] + outward[1] * V[1] + outward[2] * V[2] > 0;
    if (open) edges += t3PathOf(inner, false);
    tips[side] = { half: open ? inner : arc, frame: sides.frames[at] };
    quads.push(ring);
  }
  f.d[run.role.body] = body;
  f.d[run.role.edges] = edges;
  if (run.wide) {
    const toward = (frame) => frame.nx * T3_SHINE[0] + frame.ny * T3_SHINE[1];
    const shineOffsets = (frame) => [frame.half * 0.44 * toward(frame) + frame.half * 0.24, frame.half * 0.44 * toward(frame) - frame.half * 0.24];
    const shadeOffsets = (frame) => [-frame.half * 0.62 * toward(frame) + frame.half * 0.2, -frame.half * 0.62 * toward(frame) - frame.half * 0.2];
    const bn = bands.n;
    const band = (A, B, offsets) => {
      const head = tips[1] ? t3StripeEnd(tips[1].half, tips[1].frame.p, tips[1].frame.nx, tips[1].frame.ny, offsets(tips[1].frame)[0], offsets(tips[1].frame)[1]) : [];
      const tail = tips[0] ? t3StripeEnd(tips[0].half, tips[0].frame.p, tips[0].frame.nx, tips[0].frame.ny, offsets(tips[0].frame)[1], offsets(tips[0].frame)[0]) : [];
      return t3PathOf([...t3Pts(A, bn), ...head, ...t3Pts(B, bn).reverse(), ...tail], true);
    };
    f.d[run.role.shine] = band(bands.shineA, bands.shineB, shineOffsets);
    f.d[run.role.shade] = band(bands.shadeA, bands.shadeB, shadeOffsets);
  }
  if (run.rings) {
    const lines = t3Lines;
    lines.d.length = 0;
    lines.alpha.length = 0;
  lines.key.length = 0;
    lines.key.length = 0;
    const V = cam.V;
    const m = cam.m;
    const seg = new Float64Array(4);
    const surface = (sample, out, index) => {
      const T = sample.T;
      let n1 = [T[1] * V[2] - T[2] * V[1], T[2] * V[0] - T[0] * V[2], T[0] * V[1] - T[1] * V[0]];
      const l1 = Math.hypot(n1[0], n1[1], n1[2]);
      if (l1 < 1e-6) return null;
      n1 = [n1[0] / l1, n1[1] / l1, n1[2] / l1];
      let n2 = t3Unit([T[1] * n1[2] - T[2] * n1[1], T[2] * n1[0] - T[0] * n1[2], T[0] * n1[1] - T[1] * n1[0]]);
      if (n2[0] * V[0] + n2[1] * V[1] + n2[2] * V[2] < 0) n2 = [-n2[0], -n2[1], -n2[2]];
      const cs = Math.cos(sample.theta);
      const sn = Math.sin(sample.theta);
      const normal = [n1[0] * cs + n2[0] * sn, n1[1] * cs + n2[1] * sn, n1[2] * cs + n2[2] * sn];
      const p = [sample.c[0] + normal[0] * r, sample.c[1] + normal[1] * r, sample.c[2] + normal[2] * r];
      out[index] = cam.ox + m[0] * p[0] + m[1] * p[1] + m[2] * p[2];
      out[index + 1] = cam.oy + m[3] * p[0] + m[4] * p[1] + m[5] * p[2];
      return normal[0] * V[0] + normal[1] * V[1] + normal[2] * V[2];
    };
    const fade = run.rings.fade;
    let index = -1;
    for (const [a, b] of run.rings.segments) {
      index++;
      const fa = surface(a, seg, 0);
      const fb = surface(b, seg, 2);
      if (fa === null || fb === null) continue;
      const alpha = fade ? t3Step(fade[0], fade[1], (fa + fb) / 2) : 1;
      if (alpha * T3_LEVELS < 0.5) continue;
      lines.d.push(t3Path(seg, 2, false));
      lines.alpha.push(alpha);
      lines.key.push(index);
    }
    f.levels = t3Faded(f, run, "r", lines, lines.d.length);
  }
  const all = left.concat(right);
  t3BoxOf(all, f.box);
  for (const q of quads) for (const p of q) {
    if (p[0] < f.box[0]) f.box[0] = p[0];
    if (p[1] < f.box[1]) f.box[1] = p[1];
    if (p[0] > f.box[2]) f.box[2] = p[0];
    if (p[1] > f.box[3]) f.box[3] = p[1];
  }
  const list = f.quadList && f.quadList.length === quads.length ? f.quadList : (f.quadList = quads.map(() => [new Float64Array(0), 0]));
  for (let qi = 0; qi < quads.length; qi++) {
    const q = quads[qi];
    let entry = list[qi];
    if (entry[0].length < 2 * q.length) entry[0] = new Float64Array(2 * q.length);
    const buf = entry[0];
    for (let i = 0; i < q.length; i++) {
      buf[2 * i] = q[i][0];
      buf[2 * i + 1] = q[i][1];
    }
    entry[1] = q.length;
  }
  f.quadN = quads.length;
  f.quads = f.quadList;
  f.hullN = 0;
}

function t3Emit(run, cam, out) {
  const f = out ?? t3Frame(run);
  if (run.kind === "prism") t3EmitPrism(run, cam, f);
  else if (run.kind === "round") t3EmitRound(run, cam, f);
  else if (run.kind === "ball") t3EmitBall(run, cam, f);
  else if (run.kind === "lathe") t3EmitLathe(run, cam, f);
  else if (run.kind === "tube") {
    t3EmitTube(run, cam, f);
    return f;
  } else if (run.kind === "fixed") {
    t3EmitFixed(run, cam, f);
    return f;
  }
  t3EmitPlanes(run, cam, f);
  t3EmitDots(run, cam, f);
  return f;
}

function t3Overlap(a, b, pad) {
  return a[0] < b[2] - pad && b[0] < a[2] - pad && a[1] < b[3] - pad && b[1] < a[3] - pad;
}

function t3Apart(A, an, B, bn, pad) {
  for (let pass = 0; pass < 2; pass++) {
    const P = pass ? B : A;
    const pn = pass ? bn : an;
    for (let i = 0; i < pn; i++) {
      const j = (i + 1) % pn;
      const nx = P[2 * j + 1] - P[2 * i + 1];
      const ny = P[2 * i] - P[2 * j];
      const l = Math.hypot(nx, ny);
      if (l < 1e-9) continue;
      let a0 = Infinity;
      let a1 = -Infinity;
      for (let q = 0; q < an; q++) {
        const v = (A[2 * q] * nx + A[2 * q + 1] * ny) / l;
        if (v < a0) a0 = v;
        if (v > a1) a1 = v;
      }
      let b0 = Infinity;
      let b1 = -Infinity;
      for (let q = 0; q < bn; q++) {
        const v = (B[2 * q] * nx + B[2 * q + 1] * ny) / l;
        if (v < b0) b0 = v;
        if (v > b1) b1 = v;
      }
      if (a1 < b0 + pad || b1 < a0 + pad) return true;
    }
  }
  return false;
}

function t3Disjoint(fa, fb, pad) {
  const qa = fa.quadN ? fa.quads : null;
  const qb = fb.quadN ? fb.quads : null;
  if (!qa && !qb) return t3Apart(fa.hull, fa.hullN, fb.hull, fb.hullN, pad);
  const listA = qa ? fa.quadList : [[fa.hull, fa.hullN]];
  const listB = qb ? fb.quadList : [[fb.hull, fb.hullN]];
  for (const [A, an] of listA) for (const [B, bn] of listB) if (!t3Apart(A, an, B, bn, pad)) return false;
  return true;
}

function t3Support(cloud, R, t, dir, world) {
  let best = -Infinity;
  let at = 0;
  const n = cloud.length / 3;
  const dx = R[0] * dir[0] + R[3] * dir[1] + R[6] * dir[2];
  const dy = R[1] * dir[0] + R[4] * dir[1] + R[7] * dir[2];
  const dz = R[2] * dir[0] + R[5] * dir[1] + R[8] * dir[2];
  for (let i = 0; i < n; i++) {
    const v = cloud[3 * i] * dx + cloud[3 * i + 1] * dy + cloud[3 * i + 2] * dz;
    if (v > best) {
      best = v;
      at = i;
    }
  }
  const x = cloud[3 * at];
  const y = cloud[3 * at + 1];
  const z = cloud[3 * at + 2];
  world[0] = R[0] * x + R[1] * y + R[2] * z + t[0];
  world[1] = R[3] * x + R[4] * y + R[5] * z + t[1];
  world[2] = R[6] * x + R[7] * y + R[8] * z + t[2];
  return best + dir[0] * t[0] + dir[1] * t[1] + dir[2] * t[2];
}

function t3Gjk(cloudA, camA, cloudB, camB, warm, rounds = 8, hints = null) {
  let w = warm && (warm[0] || warm[1] || warm[2]) ? [warm[0], warm[1], warm[2]] : null;
  const a = [0, 0, 0];
  const b = [0, 0, 0];
  if (!w) {
    t3Support(cloudA, camA.R, camA.t, [1, 0, 0], a);
    t3Support(cloudB, camB.R, camB.t, [-1, 0, 0], b);
    w = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  }
  let margin = -Infinity;
  let best = w;
  const step = (limit) => {
    for (let it = 0; it < limit; it++) {
      const l = Math.hypot(w[0], w[1], w[2]);
      if (l < 1e-12) break;
      const n = [w[0] / l, w[1] / l, w[2] / l];
      const hiA = t3Support(cloudA, camA.R, camA.t, n, a);
      const loB = -t3Support(cloudB, camB.R, camB.t, [-n[0], -n[1], -n[2]], b);
      const value = loB - hiA;
      if (value > margin) {
        margin = value;
        best = n;
      }
      const s = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const ds = [w[0] - s[0], w[1] - s[1], w[2] - s[2]];
      const dd = ds[0] * ds[0] + ds[1] * ds[1] + ds[2] * ds[2];
      if (dd < 1e-14) break;
      const tt = Math.max(0, Math.min(1, (w[0] * ds[0] + w[1] * ds[1] + w[2] * ds[2]) / dd));
      w = [w[0] - ds[0] * tt, w[1] - ds[1] * tt, w[2] - ds[2] * tt];
    }
  };
  step(rounds);
  if (margin < 0) step(24);
  if (margin < 0.05 && hints) {
    if (hints.centroids) {
      const [ca, cb] = hints.centroids;
      const wa = [camA.R[0] * ca[0] + camA.R[1] * ca[1] + camA.R[2] * ca[2] + camA.t[0], camA.R[3] * ca[0] + camA.R[4] * ca[1] + camA.R[5] * ca[2] + camA.t[1], camA.R[6] * ca[0] + camA.R[7] * ca[1] + camA.R[8] * ca[2] + camA.t[2]];
      const wb = [camB.R[0] * cb[0] + camB.R[1] * cb[1] + camB.R[2] * cb[2] + camB.t[0], camB.R[3] * cb[0] + camB.R[4] * cb[1] + camB.R[5] * cb[2] + camB.t[1], camB.R[6] * cb[0] + camB.R[7] * cb[1] + camB.R[8] * cb[2] + camB.t[2]];
      const n = t3Unit([wb[0] - wa[0], wb[1] - wa[1], wb[2] - wa[2]]);
      const hiA = t3Support(cloudA, camA.R, camA.t, n, a);
      const loB = -t3Support(cloudB, camB.R, camB.t, [-n[0], -n[1], -n[2]], b);
      if (loB - hiA > margin) {
        margin = loB - hiA;
        best = n;
      }
    }
    for (const [axis, cam] of hints) {
      const R = cam.R;
      const w0 = [R[0] * axis[0] + R[1] * axis[1] + R[2] * axis[2], R[3] * axis[0] + R[4] * axis[1] + R[5] * axis[2], R[6] * axis[0] + R[7] * axis[1] + R[8] * axis[2]];
      for (const sign of [1, -1]) {
        const n = [w0[0] * sign, w0[1] * sign, w0[2] * sign];
        const hiA = t3Support(cloudA, camA.R, camA.t, n, a);
        const loB = -t3Support(cloudB, camB.R, camB.t, [-n[0], -n[1], -n[2]], b);
        if (loB - hiA > margin) {
          margin = loB - hiA;
          best = n;
        }
      }
    }
  }
  const l = Math.hypot(best[0], best[1], best[2]) || 1;
  return { n: [best[0] / l, best[1] / l, best[2] / l], margin };
}

function t3Order(layer, frames, cams, previous, stats, scene) {
  const parts = layer.parts;
  const count = parts.length;
  const local = layer.local;
  const rank = layer._rank ?? (layer._rank = new Int32Array(count));
  if (previous) for (let at = 0; at < count; at++) rank[local.get(previous[at])] = at;
  else for (let at = 0; at < count; at++) rank[local.get(layer.rest[at])] = at;
  let groupEdges = 0;
  if (layer.groupPairs) for (const gp of layer.groupPairs) groupEdges += gp.a.length * gp.b.length;
  const maxEdges = layer.planar.length / 5 + (layer.framed ? layer.framed.length / 6 : 0) + groupEdges + layer.dynamic.length / 2 + (layer.free ? layer.free.length * count : 0) + 1;
  const head = layer._head ?? (layer._head = new Int32Array(count));
  const next = layer._next && layer._next.length >= maxEdges ? layer._next : (layer._next = new Int32Array(maxEdges));
  const to = layer._to && layer._to.length >= maxEdges ? layer._to : (layer._to = new Int32Array(maxEdges));
  const live = layer._live && layer._live.length >= maxEdges ? layer._live : (layer._live = new Uint8Array(maxEdges));
  const indeg = layer._indeg ?? (layer._indeg = new Int32Array(count));
  head.fill(-1);
  indeg.fill(0);
  let edges = 0;
  const addEdge = (back, front) => {
    to[edges] = front;
    next[edges] = head[back];
    live[edges] = 1;
    head[back] = edges;
    indeg[front]++;
    edges++;
  };
  const runs = scene ? scene.runs : null;
  const groupOf = (global) => (runs ? runs[global].group : -1);
  const planar = layer.planar;
  for (let p = 0; p < planar.length; p += 5) {
    const i = planar[p];
    const j = planar[p + 1];
    const fi = frames[i];
    const fj = frames[j];
    if (!t3Overlap(fi.box, fj.box, -0.05)) continue;
    const g = groupOf(i);
    const V = g >= 0 ? cams[g].V : cams.world.V;
    const s = planar[p + 2] * V[0] + planar[p + 3] * V[1] + planar[p + 4] * V[2];
    if (s < 1e-7 && s > -1e-7) continue;
    const li = local.get(i);
    const lj = local.get(j);
    if (s > 0) addEdge(li, lj);
    else addEdge(lj, li);
  }
  const framed = layer.framed;
  if (framed)
    for (let p = 0; p < framed.length; p += 6) {
      const i = framed[p];
      const j = framed[p + 1];
      if (!t3Overlap(frames[i].box, frames[j].box, -0.05)) continue;
      const g = framed[p + 2];
      const V = g >= 0 ? cams[g].V : cams.world.V;
      const s = framed[p + 3] * V[0] + framed[p + 4] * V[1] + framed[p + 5] * V[2];
      if (s < 1e-7 && s > -1e-7) continue;
      const li = local.get(i);
      const lj = local.get(j);
      if (s > 0) addEdge(li, lj);
      else addEdge(lj, li);
    }
  if (layer.groupPairs)
    for (const gp of layer.groupPairs) {
      const union = (list, box) => {
        box[0] = Infinity;
        box[1] = Infinity;
        box[2] = -Infinity;
        box[3] = -Infinity;
        for (let q = 0; q < list.length; q++) {
          const b = frames[list[q]].box;
          if (b[0] < box[0]) box[0] = b[0];
          if (b[1] < box[1]) box[1] = b[1];
          if (b[2] > box[2]) box[2] = b[2];
          if (b[3] > box[3]) box[3] = b[3];
        }
      };
      union(gp.a, gp.boxA);
      union(gp.b, gp.boxB);
      if (!t3Overlap(gp.boxA, gp.boxB, -0.05)) continue;
      const V = gp.frame >= 0 ? cams[gp.frame].V : cams.world.V;
      const s = gp.n[0] * V[0] + gp.n[1] * V[1] + gp.n[2] * V[2];
      if (s < 1e-7 && s > -1e-7) continue;
      for (let x = 0; x < gp.a.length; x++) {
        const i = gp.a[x];
        const bi = frames[i].box;
        if (!t3Overlap(bi, gp.boxB, -0.05)) continue;
        for (let y = 0; y < gp.b.length; y++) {
          const j = gp.b[y];
          if (!t3Overlap(bi, frames[j].box, -0.05)) continue;
          if (s > 0) addEdge(local.get(i), local.get(j));
          else addEdge(local.get(j), local.get(i));
        }
      }
    }
  const dynamic = layer.dynamic;
  let unseparated = 0;
  let solved = 0;
  const rel = layer.rel ?? (layer.rel = new Map());
  const cross = (i, j) => {
    const ri = runs[i];
    const rj = runs[j];
    const ci = ri.group >= 0 ? cams[ri.group] : cams.world;
    const cj = rj.group >= 0 ? cams[rj.group] : cams.world;
    const A = ci.R;
    const B = cj.R;
    const dx = cj.t[0] - ci.t[0];
    const dy = cj.t[1] - ci.t[1];
    const dz = cj.t[2] - ci.t[2];
    const key = i * 65536 + j;
    let memo = rel.get(key);
    if (!memo) {
      memo = { pose: new Float64Array(12), n: [0, 0, 0], margin: -Infinity, fresh: false };
      rel.set(key, memo);
    }
    const pose = memo.pose;
    let same = memo.fresh;
    let at = 0;
    for (let c = 0; c < 3; c++)
      for (let r = 0; r < 3; r++) {
        const v = A[c] * B[r] + A[3 + c] * B[3 + r] + A[6 + c] * B[6 + r];
        if (same && Math.abs(pose[at] - v) > 1e-12) same = false;
        pose[at++] = v;
      }
    for (let c = 0; c < 3; c++) {
      const v = A[c] * dx + A[3 + c] * dy + A[6 + c] * dz;
      if (same && Math.abs(pose[at] - v) > 1e-9) same = false;
      pose[at++] = v;
    }
    let nx;
    let ny;
    let nz;
    if (same) {
      const n = memo.n;
      nx = A[0] * n[0] + A[1] * n[1] + A[2] * n[2];
      ny = A[3] * n[0] + A[4] * n[1] + A[5] * n[2];
      nz = A[6] * n[0] + A[7] * n[1] + A[8] * n[2];
    } else {
      const n = memo.n;
      const warm = memo.fresh ? [A[0] * n[0] + A[1] * n[1] + A[2] * n[2], A[3] * n[0] + A[4] * n[1] + A[5] * n[2], A[6] * n[0] + A[7] * n[1] + A[8] * n[2]] : null;
      const hints = [...ri.axes.map((axis) => [axis, ci]), ...rj.axes.map((axis) => [axis, cj]), [[0, 0, 1], cams.world]];
      hints.centroids = [ri.centroid, rj.centroid];
      const hit = t3Gjk(ri.cloud, ci, rj.cloud, cj, warm, 8, hints);
      solved++;
      nx = hit.n[0];
      ny = hit.n[1];
      nz = hit.n[2];
      n[0] = A[0] * nx + A[3] * ny + A[6] * nz;
      n[1] = A[1] * nx + A[4] * ny + A[7] * nz;
      n[2] = A[2] * nx + A[5] * ny + A[8] * nz;
      memo.margin = hit.margin;
      memo.fresh = true;
    }
    if (memo.margin < -0.08) unseparated++;
    const V = cams.world.V;
    return nx * V[0] + ny * V[1] + nz * V[2];
  };
  for (let p = 0; p < dynamic.length; p += 2) {
    const i = dynamic[p];
    const j = dynamic[p + 1];
    if (!t3Overlap(frames[i].box, frames[j].box, -0.05)) continue;
    const s = cross(i, j);
    if (s < 1e-7 && s > -1e-7) continue;
    const li = local.get(i);
    const lj = local.get(j);
    if (s > 0) addEdge(li, lj);
    else addEdge(lj, li);
  }
  const loose = layer.free;
  if (loose && loose.length) {
    const isLoose = layer.looseAt;
    for (let a = 0; a < loose.length; a++) {
      const i = loose[a];
      const gi = runs[i].group;
      const bi = frames[i].box;
      for (let b = 0; b < count; b++) {
        const j = parts[b];
        if (j === i || runs[j].group === gi) continue;
        if (isLoose[b] && j < i) continue;
        if (!t3Overlap(bi, frames[j].box, -0.05)) continue;
        const s = cross(i, j);
        if (s < 1e-7 && s > -1e-7) continue;
        const li = local.get(i);
        if (s > 0) addEdge(li, b);
        else addEdge(b, li);
      }
    }
  }
  const heap = layer._heap ?? (layer._heap = new Int32Array(count));
  const done = layer._done ?? (layer._done = new Uint8Array(count));
  done.fill(0);
  let size = 0;
  const less = (a, b) => rank[a] < rank[b];
  const push = (v) => {
    let i = size++;
    heap[i] = v;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!less(heap[i], heap[p])) break;
      const tmp = heap[i];
      heap[i] = heap[p];
      heap[p] = tmp;
      i = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    heap[0] = heap[--size];
    let i = 0;
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let s = i;
      if (l < size && less(heap[l], heap[s])) s = l;
      if (r < size && less(heap[r], heap[s])) s = r;
      if (s === i) break;
      const tmp = heap[i];
      heap[i] = heap[s];
      heap[s] = tmp;
      i = s;
    }
    return top;
  };
  for (let v = 0; v < count; v++) if (indeg[v] === 0) push(v);
  const out = new Int32Array(count);
  let placed = 0;
  let forced = 0;
  let refined = 0;
  let tested = false;
  const mark = layer._mark && layer._mark.length >= count ? layer._mark : (layer._mark = new Uint8Array(count));
  const via = layer._via && layer._via.length >= count ? layer._via : (layer._via = new Int32Array(count));
  const iter = layer._iter && layer._iter.length >= count ? layer._iter : (layer._iter = new Int32Array(count));
  const stack = layer._stack && layer._stack.length >= count ? layer._stack : (layer._stack = new Int32Array(count));
  const checked = layer._checked && layer._checked.length >= maxEdges ? layer._checked : (layer._checked = new Uint8Array(maxEdges));
  checked.fill(0, 0, edges);
  const breakCycle = () => {
    mark.fill(0, 0, count);
    for (let root = 0; root < count; root++) {
      if (done[root] || mark[root]) continue;
      let top = 0;
      stack[top++] = root;
      mark[root] = 1;
      iter[root] = head[root];
      while (top) {
        const v = stack[top - 1];
        let e = iter[v];
        while (e >= 0 && (!live[e] || done[to[e]] || mark[to[e]] === 2)) e = next[e];
        if (e < 0) {
          mark[v] = 2;
          top--;
          continue;
        }
        iter[v] = next[e];
        const w = to[e];
        if (mark[w] === 1) {
          let dropped = false;
          let x = v;
          let edge = e;
          for (;;) {
            if (!checked[edge]) {
              checked[edge] = 1;
              const a = x;
              const b = to[edge];
              if (t3Disjoint(frames[parts[a]], frames[parts[b]], 0.1)) {
                live[edge] = 0;
                indeg[b]--;
                refined++;
                dropped = true;
                if (indeg[b] === 0) push(b);
              }
            }
            if (x === w) break;
            edge = via[x];
            let from = -1;
            for (let s = 0; s < top; s++) if (stack[s] === x) from = s > 0 ? stack[s - 1] : -1;
            if (from < 0) break;
            x = from;
          }
          return dropped ? 1 : 0;
        }
        via[w] = e;
        mark[w] = 1;
        iter[w] = head[w];
        stack[top++] = w;
      }
    }
    return -1;
  };
  while (placed < count) {
    if (size === 0) {
      let broken = 0;
      for (let tries = 0; tries < 64 && size === 0; tries++) {
        const result = breakCycle();
        if (result <= 0) break;
        broken++;
      }
      if (size) continue;
      void broken;
      void tested;
      let pick = -1;
      for (let v = 0; v < count; v++) if (!done[v] && (pick < 0 || indeg[v] < indeg[pick] || (indeg[v] === indeg[pick] && rank[v] < rank[pick]))) pick = v;
      forced++;
      indeg[pick] = 0;
      push(pick);
    }
    const v = pop();
    if (done[v]) continue;
    done[v] = 1;
    out[placed++] = parts[v];
    for (let e = head[v]; e >= 0; e = next[e]) {
      if (!live[e]) continue;
      const w = to[e];
      if (done[w]) continue;
      if (--indeg[w] === 0) push(w);
    }
  }
  if (stats) {
    stats.edges = (stats.edges ?? 0) + edges;
    stats.forced = (stats.forced ?? 0) + forced;
    stats.refined = (stats.refined ?? 0) + refined;
    stats.unseparated = (stats.unseparated ?? 0) + unseparated;
    stats.solved = (stats.solved ?? 0) + solved;
  }
  return out;
}

function t3Keep(values) {
  const n = values.length;
  const tails = [];
  const tailAt = [];
  const back = new Int32Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    let lo = 0;
    let hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tails[mid] < values[i]) lo = mid + 1;
      else hi = mid;
    }
    tails[lo] = values[i];
    tailAt[lo] = i;
    back[i] = lo > 0 ? tailAt[lo - 1] : -1;
  }
  const keep = new Uint8Array(n);
  let k = tails.length ? tailAt[tails.length - 1] : -1;
  while (k >= 0) {
    keep[k] = 1;
    k = back[k];
  }
  return keep;
}

function t3Cams(scene, values) {
  const poses = t3Poses(scene.groups, values);
  const cams = poses.map((pose) => t3Camera(scene.P, pose));
  cams.world = t3Camera(scene.P, null);
  cams.poses = poses;
  return cams;
}

function t3Mount(stage, data, { onHold = null, onFrame = null, follow = null, painter = "svg" } = {}) {
  void painter;
  const layerEls = new Map([...stage.querySelectorAll("svg[data-live]")].map((svg) => [svg.dataset.live, svg]));
  const first = layerEls.values().next().value;
  const viewWidth = first && first.viewBox && first.viewBox.baseVal ? first.viewBox.baseVal.width : 0;
  const unitOf = () => {
    const width = first ? first.getBoundingClientRect().width : 0;
    return viewWidth && width ? Math.round((width / viewWidth) * 100) / 100 : 1;
  };
  let unit = unitOf();
  let scene = t3Prepare(data, { unit });
  const runs = () => scene.runs;
  const count = data.parts.length;
  const nodes = new Array(count);
  const bound = new Array(count);
  const cache = new Array(count);
  const containers = new Map();
  for (const [name, svg] of layerEls) containers.set(name, svg.querySelector(".iso-parts") ?? svg);
  for (const run of scene.runs) {
    const layer = data.layers[run.layer];
    const container = containers.get(layer.name);
    const node = container ? container.querySelector(`[data-p="${run.index}"]`) : null;
    nodes[run.index] = node;
    const map = {};
    if (node) {
      map.move = node;
      node.querySelectorAll("[data-r]").forEach((el) => (map[el.getAttribute("data-r")] = el));
    }
    bound[run.index] = run.roles.map((role) => map[role.name] ?? null);
    cache[run.index] = run.roles.map(() => ({ d: null, q: null, b: null, f: null, w: null, t: null, o: null, cx: null, cy: null }));
  }
  const frames = scene.runs.map((run) => t3Frame(run));
  const values = Object.fromEntries(data.groups.map((g) => [g.name, data.values ? data.values[g.name] ?? 0 : 0]));
  let lastPoses = null;
  let cams = null;
  const orders = scene.layers.map((layer) => Int32Array.from(layer.rest));
  const changes = [];
  const stats = { ms: 0, writes: 0, moved: 0, forced: 0, refined: 0, unseparated: 0, emitted: 0 };
  let writes = 0;
  const write = (index) => {
    const run = scene.runs[index];
    const f = frames[index];
    const els = bound[index];
    const memo = cache[index];
    for (let r = 0; r < run.roles.length; r++) {
      const el = els[r];
      if (!el) continue;
      const role = run.roles[r];
      const c = memo[r];
      const type = role.type;
      if (type === "path" || type === "face" || type === "slot") {
        const d = f.d[r];
        if (c.d !== d) {
          el.setAttribute("d", d);
          c.d = d;
          writes++;
        }
        if (type === "face") {
          const q = f.q[r];
          if (c.q !== q) {
            const band = Math.min(3, Math.floor(q / T3_Q));
            const mix = (q - T3_Q * band) / T3_Q;
            if (c.b !== band) {
              el.setAttribute("data-b", String(band));
              c.b = band;
              writes++;
            }
            if (c.f !== mix) {
              if (mix) el.style.setProperty("--f", String(mix));
              else el.style.removeProperty("--f");
              c.f = mix;
              writes++;
            }
            c.q = q;
          }
          const w = f.w[r];
          if (c.w !== w) {
            if (w < 0) el.style.removeProperty("stroke-width");
            else el.style.strokeWidth = String(w);
            c.w = w;
            writes++;
          }
        } else if (type === "slot") {
          const o = f.o[r];
          if (c.o !== o) {
            el.setAttribute("opacity", String(Math.round(o * 1000) / 1000));
            c.o = o;
            writes++;
          }
        }
      } else if (type === "xform" || type === "self" || type === "plane") {
        const t = f.t[r];
        if (c.t !== t) {
          if (t) el.setAttribute("transform", t);
          else el.removeAttribute("transform");
          c.t = t;
          writes++;
        }
        if (type === "plane") {
          const o = f.o[r];
          if (c.o !== o) {
            el.setAttribute("opacity", String(o));
            c.o = o;
            writes++;
          }
        }
      } else if (type === "dot") {
        const x = Math.round(f.cx[r] * 100) / 100;
        const y = Math.round(f.cy[r] * 100) / 100;
        const o = f.o[r];
        if (c.cx !== x) {
          el.setAttribute("cx", String(x));
          c.cx = x;
          writes++;
        }
        if (c.cy !== y) {
          el.setAttribute("cy", String(y));
          c.cy = y;
          writes++;
        }
        if (c.o !== o) {
          el.setAttribute("fill-opacity", String(o));
          c.o = o;
          writes++;
        }
      }
    }
  };
  const samePose = (a, b) => {
    if (!a || !b) return false;
    for (let i = 0; i < 9; i++) if (a.R[i] !== b.R[i]) return false;
    return a.t[0] === b.t[0] && a.t[1] === b.t[1] && a.t[2] === b.t[2];
  };
  let lastUnit = unit;
  let moved = 0;
  const render = () => {
    const t0 = performance.now();
    writes = 0;
    moved = 0;
    cams = t3Cams(scene, values);
    t3State.detail = detail;
    const poses = cams.poses;
    const fresh = lastUnit !== unit || !lastPoses;
    let emitted = 0;
    for (const run of scene.runs) {
      const g = run.group;
      const changed = fresh || (g >= 0 ? !samePose(poses[g], lastPoses[g]) : false);
      if (!changed) continue;
      t3Emit(run, g >= 0 ? cams[g] : cams.world, frames[run.index]);
      write(run.index);
      emitted++;
    }
    lastPoses = poses;
    lastUnit = unit;
    const orderStats = { forced: 0, refined: 0, unseparated: 0, edges: 0 };
    scene.layers.forEach((layer, index) => {
      const previous = orders[index];
      const order = t3Order(layer, frames, cams, previous, orderStats, scene);
      let same = true;
      for (let j = 0; j < order.length; j++)
        if (order[j] !== previous[j]) {
          same = false;
          break;
        }
      if (same) return;
      const container = containers.get(layer.name);
      const position = new Map();
      previous.forEach((global, at) => position.set(global, at));
      const keep = t3Keep(Array.from(order, (global) => position.get(global)));
      let after = null;
      const shifted = [];
      for (let j = order.length - 1; j >= 0; j--) {
        const node = nodes[order[j]];
        if (!keep[j] && node && container) {
          container.insertBefore(node, after);
          moved++;
          shifted.push(scene.runs[order[j]].name);
        }
        if (node) after = node;
      }
      orders[index] = order;
      if (shifted.length) changes.push({ layer: layer.name, moved: shifted });
    });
    stats.ms = performance.now() - t0;
    stats.writes = writes;
    stats.moved = moved;
    stats.forced = orderStats.forced;
    stats.refined = orderStats.refined;
    stats.unseparated = orderStats.unseparated;
    stats.emitted = emitted;
    t3State.detail = 1;
    if (onFrame) onFrame(controller);
    return { ...stats };
  };
  let detail = 1;
  const set = (next, options) => {
    if (options && options.detail !== undefined) {
      const value = Math.max(0, Math.min(1, options.detail));
      if (value !== detail) {
        detail = value;
        lastPoses = null;
      }
    }
    if (typeof next === "number") {
      const g = data.groups.find((group) => group.kind === "turn");
      if (g) values[g.name] = next;
    } else if (next) for (const [name, value] of Object.entries(next)) values[name] = value;
    if (follow) Object.assign(values, follow({ ...values }));
    return render();
  };
  let unwrap = new Map();
  const angleAt = (clientX, clientY, z = 0, groupName) => {
    const svg = first;
    const box = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    const x = vb.x + ((clientX - box.left) / box.width) * vb.width;
    const y = vb.y + ((clientY - box.top) / box.height) * vb.height;
    const c = t3Camera(scene.P, null);
    const p = (x - c.ox) / c.k;
    const q = (y - c.oy + z * c.ce * c.k) / (c.se * c.k);
    const wx = p * c.sa + q * c.ca;
    const wy = -p * c.ca + q * c.sa;
    const group = data.groups.find((g) => g.name === groupName) ?? data.groups.find((g) => g.kind === "turn");
    const pivot = group ? group.origin : [0, 0, 0];
    const raw = (Math.atan2(wy - pivot[1], wx - pivot[0]) * 180) / Math.PI;
    const key = group ? group.name : "";
    const last = unwrap.get(key);
    let angle = raw;
    if (last !== undefined) angle = last + ((((raw - last) % 360) + 540) % 360) - 180;
    unwrap.set(key, angle);
    return angle;
  };
  const observer = typeof ResizeObserver === "function" && first
    ? new ResizeObserver(() => {
        const next = unitOf();
        if (Math.abs(next - unit) < 0.05) return;
        unit = next;
        scene = t3Prepare(data, { unit });
        render();
      })
    : null;
  if (observer) observer.observe(first);
  if (follow) Object.assign(values, follow({ ...values }));
  const controller = {
    set,
    render,
    angleAt,
    get values() {
      return { ...values };
    },
    cover: (names, options) => t3Cover(controller, names, options),
    order: (name) => {
      const index = name === undefined ? 0 : scene.layers.findIndex((layer) => layer.name === name);
      return index < 0 ? [] : Array.from(orders[index], (global) => scene.runs[global].name);
    },
    orderIndex: (name) => {
      const index = name === undefined ? 0 : scene.layers.findIndex((layer) => layer.name === name);
      return index < 0 ? null : orders[index];
    },
    events: () => changes.splice(0, changes.length),
    stats: () => ({ ...stats }),
    frames: () => frames,
    cams: () => cams,
    scene: () => scene,
    pose: (name) => t3PoseOf(scene, cams, name),
    detach: (name) => {
      const index = scene.groups.findIndex((g) => g.name === name);
      const pose = t3PoseOf(scene, cams, name);
      const o = scene.groups[index].origin;
      return { world: true, R: pose.R, t: [pose.t[0] - o[0], pose.t[1] - o[1], pose.t[2] - o[2]] };
    },
    anchor: (name, point, direction) => t3Anchor(scene, cams, name, point, direction),
    destroy: () => {
      if (observer) observer.disconnect();
      if (typeof window !== "undefined" && window.__isoTurn && window.__isoTurn.controller === controller) delete window.__isoTurn;
    },
  };
  const hold = () => {
    if (onHold) onHold();
  };
  if (typeof window !== "undefined") {
    window.__isoTurn = {
      controller,
      set(next) {
        hold();
        return set(next);
      },
      get() {
        hold();
        return { ...values };
      },
      order(name) {
        hold();
        return controller.order(name);
      },
      events() {
        hold();
        return controller.events();
      },
      stats() {
        hold();
        return controller.stats();
      },
      layers() {
        hold();
        return scene.layers.map((layer) => layer.name);
      },
    };
  }
  render();
  return controller;
}

function t3Enclose(points, edges) {
  const hull = t3Hull(points);
  const n = hull.length;
  if (n < 3) return [];
  let area = 0;
  for (let i = 0; i < n; i++) area += hull[i][0] * hull[(i + 1) % n][1] - hull[(i + 1) % n][0] * hull[i][1];
  const sign = area >= 0 ? 1 : -1;
  let lines = [];
  for (let i = 0; i < n; i++) {
    const p = hull[i];
    const q = hull[(i + 1) % n];
    const dx = q[0] - p[0];
    const dy = q[1] - p[1];
    const l = Math.hypot(dx, dy);
    if (l < 1e-9) continue;
    const nx = (sign * dy) / l;
    const ny = (-sign * dx) / l;
    lines.push([nx, ny, -(nx * p[0] + ny * p[1])]);
  }
  const meet = (A, B) => {
    const det = A[0] * B[1] - A[1] * B[0];
    if (Math.abs(det) < 1e-12) return null;
    return [(-A[2] * B[1] + B[2] * A[1]) / det, (-A[0] * B[2] + B[0] * A[2]) / det];
  };
  while (lines.length > edges) {
    let best = -1;
    let cost = Infinity;
    const m = lines.length;
    for (let i = 0; i < m; i++) {
      const prev = lines[(i - 1 + m) % m];
      const self = lines[i];
      const next = lines[(i + 1) % m];
      const turn = prev[0] * next[1] - prev[1] * next[0];
      if (sign * turn <= 1e-9) continue;
      const apex = meet(prev, next);
      const a = meet(prev, self);
      const b = meet(self, next);
      if (!apex || !a || !b) continue;
      const added = Math.abs((a[0] - apex[0]) * (b[1] - apex[1]) - (a[1] - apex[1]) * (b[0] - apex[0])) / 2;
      if (added < cost) {
        cost = added;
        best = i;
      }
    }
    if (best < 0) break;
    lines.splice(best, 1);
  }
  return lines;
}

function t3Cover(controller, names, { polygons = 6, edges = 10, pad = 0.3, layers = null } = {}) {
  const uCoverEdge = new Float32Array(polygons * edges * 3);
  const uCoverCount = new Float32Array(polygons);
  const scene = controller.scene();
  const frames = controller.frames();
  const sets = Array.isArray(names) ? (names.length && Array.isArray(names[0]) ? names : [names]) : [[names]];
  const candidates = [];
  const taken = new Set();
  for (const list of sets) {
    const targets = scene.runs.filter((run) => list.includes(run.name));
    if (!targets.length) continue;
    const box = [Infinity, Infinity, -Infinity, -Infinity];
    for (const run of targets) {
      const b = frames[run.index].box;
      box[0] = Math.min(box[0], b[0]);
      box[1] = Math.min(box[1], b[1]);
      box[2] = Math.max(box[2], b[2]);
      box[3] = Math.max(box[3], b[3]);
    }
    const home = targets[0].layer;
    scene.layers.forEach((layer, index) => {
      const order = controller.orderIndex(layer.name);
      if (!order) return;
      let from = 0;
      if (index === home) {
        for (let at = 0; at < order.length; at++) if (targets.some((run) => run.index === order[at])) from = at + 1;
      } else if (!(layers && layers.includes(layer.name)) || index < home) return;
      for (let at = from; at < order.length; at++) {
        const run = scene.runs[order[at]];
        if (list.includes(run.name) || taken.has(run.index)) continue;
        const f = frames[run.index];
        const b = f.box;
        if (!(b[0] < box[2] + pad && box[0] < b[2] + pad && b[1] < box[3] + pad && box[1] < b[3] + pad)) continue;
        if (!targets.some((target) => !t3Disjoint(frames[target.index], f, -pad))) continue;
        taken.add(run.index);
        const share = (Math.min(b[2], box[2]) - Math.max(b[0], box[0])) * (Math.min(b[3], box[3]) - Math.max(b[1], box[1]));
        candidates.push({ run, f, share });
      }
    });
  }
  candidates.sort((a, b) => b.share - a.share);
  const parts = [];
  let slot = 0;
  for (const { run, f } of candidates) {
    if (slot >= polygons) break;
    const points = [];
    if (f.quadN) for (const [buf, count] of f.quadList) for (let i = 0; i < count; i++) points.push([buf[2 * i], buf[2 * i + 1]]);
    else for (let i = 0; i < f.hullN; i++) points.push([f.hull[2 * i], f.hull[2 * i + 1]]);
    const lines = t3Enclose(points, edges);
    if (!lines.length) continue;
    lines.forEach((line, e) => {
      const at = (slot * edges + e) * 3;
      uCoverEdge[at] = line[0];
      uCoverEdge[at + 1] = line[1];
      uCoverEdge[at + 2] = line[2] - pad;
    });
    uCoverCount[slot] = lines.length;
    parts.push(run.name);
    slot++;
  }
  return { uCoverEdge, uCoverCount, dropped: Math.max(0, candidates.length - slot), parts };
}

function t3PoseOf(scene, cams, name) {
  const index = scene.groups.findIndex((g) => g.name === name);
  const cam = index >= 0 && cams ? cams[index] : null;
  return { R: cam ? Array.from(cam.R) : Array.from(T3_EYE), t: cam ? [cam.t[0], cam.t[1], cam.t[2]] : [0, 0, 0] };
}

function t3Anchor(scene, cams, name, point, direction) {
  const index = name === null || name === undefined ? -1 : scene.groups.findIndex((g) => g.name === name);
  const cam = index >= 0 ? cams[index] : cams.world;
  const o = index >= 0 ? scene.groups[index].origin : [0, 0, 0];
  const R = cam.R;
  const q = [point[0] - o[0], point[1] - o[1], point[2] - o[2]];
  const world = [R[0] * q[0] + R[1] * q[1] + R[2] * q[2] + cam.t[0], R[3] * q[0] + R[4] * q[1] + R[5] * q[2] + cam.t[1], R[6] * q[0] + R[7] * q[1] + R[8] * q[2] + cam.t[2]];
  const w = cams.world;
  const screen = [w.ox + w.m[0] * world[0] + w.m[1] * world[1] + w.m[2] * world[2], w.oy + w.m[3] * world[0] + w.m[4] * world[1] + w.m[5] * world[2]];
  const out = { world, screen };
  if (direction) out.direction = [R[0] * direction[0] + R[1] * direction[1] + R[2] * direction[2], R[3] * direction[0] + R[4] * direction[1] + R[5] * direction[2], R[6] * direction[0] + R[7] * direction[1] + R[8] * direction[2]];
  return out;
}

function t3FloorOf(scene, name, R = T3_EYE) {
  const index = scene.groups.findIndex((g) => g.name === name);
  let low = Infinity;
  for (const run of scene.runs) {
    if (run.group !== index) continue;
    const c = run.cloud;
    for (let i = 0; i < c.length; i += 3) {
      const z = R[6] * c[i] + R[7] * c[i + 1] + R[8] * c[i + 2];
      if (z < low) low = z;
    }
  }
  return low;
}

function t3Compose(A, B) {
  return Array.from(t3Mul(A, B));
}

function t3PoseUniforms(controller, group, prefix = "uGroup") {
  const scene = controller.scene();
  const index = scene.groups.findIndex((g) => g.name === group);
  const cams = controller.cams();
  const cam = index >= 0 && cams ? cams[index] : null;
  const R = cam ? cam.R : T3_EYE;
  const t = cam ? cam.t : [0, 0, 0];
  const o = index >= 0 ? scene.groups[index].origin : [0, 0, 0];
  const T = [t[0] - (R[0] * o[0] + R[1] * o[1] + R[2] * o[2]), t[1] - (R[3] * o[0] + R[4] * o[1] + R[5] * o[2]), t[2] - (R[6] * o[0] + R[7] * o[1] + R[8] * o[2])];
  return { [`${prefix}X`]: [R[0], R[3], R[6]], [`${prefix}Y`]: [R[1], R[4], R[7]], [`${prefix}Z`]: [R[2], R[5], R[8]], [`${prefix}T`]: T };
}

const T3_MAT_KEYS = ["paper", "face", "top", "shade-0", "shade-1", "shade-2", "shade-3", "lit-top", "lit-shade", "hi", "mid", "lo", "faint", "dot", "lit"];
const T3_MAT_TUBE = ["body", "shine", "shade", "edge"];

const T3_MATERIALS = {
  gold: {
    light: ["#d3bb88", "#e4d2a8", "#f1e5c6", "#a1844f", "#bc9f69", "#d3bb88", "#e4d2a8", "#f8efd8", "#dfcb9c", "#4b3920", "#86693f", "#a98c5b", "#c1a676", "#4a381f", "#2a1d0c", "#cdb07a", "#f3e8cc", "#8e7044", "#4b3920"],
    dark: ["#3f3521", "#4b3f28", "#5a4c31", "#2b2416", "#352c1b", "#3f3521", "#4b3f28", "#6a5a3b", "#4f4329", "#e6d2a3", "#8a7550", "#5e4e33", "#463a26", "#e6d2a3", "#fff3d6", "#4a3e27", "#8c7853", "#251f13", "#e6d2a3"],
  },
  chrome: {
    light: ["#8e959c", "#c3c8cd", "#f7f8f9", "#a2a9b0", "#6f767d", "#454b52", "#cacfd4", "#ffffff", "#bcc2c8", "#202428", "#585e65", "#878d94", "#a9afb5", "#2a2e33", "#000000", "#8b9299", "#fbfcfd", "#3c4248", "#202428"],
    dark: ["#2a2e32", "#4a5056", "#6e757c", "#2e3236", "#24272b", "#1a1d20", "#4a5056", "#848b92", "#3a3f44", "#dfe3e7", "#7c838a", "#4d5359", "#363b40", "#e4e7ea", "#ffffff", "#34393e", "#9aa1a8", "#16191b", "#dfe3e7"],
  },
  steel: {
    light: ["#b8bdc1", "#cdd1d4", "#e5e8ea", "#8f959b", "#a4aaaf", "#b8bdc1", "#cdd1d4", "#f1f3f4", "#c6cacd", "#2b2f33", "#6b7177", "#959ba1", "#aeb3b8", "#33373b", "#000000", "#b3b8bd", "#eef0f2", "#7d8389", "#2b2f33"],
    dark: ["#2c3034", "#34393d", "#3e4348", "#1f2225", "#25292c", "#2c3034", "#34393d", "#4a5056", "#33383c", "#d0d4d8", "#727980", "#4a5056", "#33383d", "#d8dce0", "#ffffff", "#30353a", "#5c6369", "#1a1d20", "#d0d4d8"],
  },
  gunmetal: {
    light: ["#444a51", "#50575e", "#5f666e", "#2f3439", "#393f45", "#444a51", "#50575e", "#6d757d", "#4b5258", "#0f1113", "#1d2125", "#272b30", "#30353a", "#b0b5ba", "#000000", "#3d4349", "#6e757c", "#24282c", "#0f1113"],
    dark: ["#1d2125", "#22272b", "#2a2f34", "#15181b", "#191c20", "#1d2125", "#22272b", "#323840", "#20252a", "#a9b0b7", "#5c636a", "#3a4046", "#2a2f34", "#b8bec4", "#ffffff", "#1f2327", "#3a4046", "#111316", "#a9b0b7"],
  },
  rubber: {
    light: ["#2a2b2e", "#34363a", "#46484d", "#1b1c1e", "#222326", "#2a2b2e", "#34363a", "#55575c", "#2f3134", "#070708", "#111214", "#18191b", "#1f2023", "#6a6c70", "#000000", "#27282b", "#5b5d62", "#121314", "#050506"],
    dark: ["#121213", "#161618", "#1c1c1f", "#0c0c0d", "#0f0f10", "#121213", "#161618", "#232327", "#141416", "#8c8e92", "#4a4c50", "#2c2d30", "#1f2023", "#9a9ca0", "#ffffff", "#131315", "#2b2c30", "#0a0a0b", "#8c8e92"],
  },
  brass: {
    light: ["#bd9646", "#d2ad5b", "#e6c87e", "#8a6a2c", "#a47f38", "#bd9646", "#d2ad5b", "#f0d796", "#c8a252", "#3f2e0e", "#765a24", "#9a7a3c", "#b08c46", "#3a2a0c", "#1f1606", "#b8913f", "#efd795", "#7d5f26", "#3f2e0e"],
    dark: ["#3d3017", "#49391c", "#574523", "#2a210f", "#332813", "#3d3017", "#49391c", "#66522b", "#45371b", "#e9cf8a", "#8e7438", "#5e4c25", "#44371c", "#e9cf8a", "#fff0c8", "#433419", "#8a6f36", "#21190b", "#e9cf8a"],
  },
  copper: {
    light: ["#b3633e", "#c9784f", "#df9670", "#7c4128", "#9a5132", "#b3633e", "#c9784f", "#eaa985", "#be6d46", "#3a1a0c", "#6e3820", "#925037", "#a65d3f", "#3a1a0c", "#1c0b04", "#ad5f3b", "#f0b896", "#6e3720", "#3a1a0c"],
    dark: ["#3d1f13", "#492617", "#582e1c", "#2a160d", "#331a10", "#3d1f13", "#492617", "#673722", "#432215", "#eaa985", "#8f5236", "#5f3624", "#45271a", "#eaa985", "#ffe0cc", "#42221a", "#8a4c31", "#1f0f08", "#eaa985"],
  },
};

function t3MaterialCss() {
  const rules = [];
  const block = (values) => T3_MAT_KEYS.map((key, i) => `--anatomy-${key}:${values[i]}`).concat(T3_MAT_TUBE.map((key, i) => `--mat-${key}:${values[T3_MAT_KEYS.length + i]}`)).join(";");
  for (const [name, { light, dark }] of Object.entries(T3_MATERIALS)) {
    rules.push(`[data-mat="${name}"]{${block(dark)}}`);
    rules.push(`.iso[data-theme="light"] [data-mat="${name}"]{${block(light)}}`);
    rules.push(`.iso[data-theme="dark"] [data-mat="${name}"]{${block(dark)}}`);
  }
  rules.push("[data-mat] .tb-body{fill:var(--mat-body)}");
  rules.push("[data-mat] .tb-shine{fill:var(--mat-shine)}");
  rules.push("[data-mat] .tb-shade{fill:var(--mat-shade)}");
  rules.push("[data-mat] .tb-edge{stroke:var(--mat-edge)}");
  return rules.join("\n");
}

function t3Css() {
  const rules = [];
  const ramp = "--tn-0:var(--anatomy-shade-0);--tn-1:var(--anatomy-shade-1);--tn-2:var(--anatomy-shade-2);--tn-3:var(--anatomy-shade-3);--tn-4:var(--anatomy-top)";
  rules.push(`.iso-live{${ramp}}`);
  rules.push(`.iso-live [data-mat]{${ramp}}`);
  rules.push(".iso-live [data-lit]{--tn-0:var(--anatomy-lit-shade);--tn-1:var(--anatomy-lit-shade);--tn-2:var(--anatomy-lit-shade);--tn-3:var(--anatomy-lit-shade);--tn-4:var(--anatomy-lit-top)}");
  const colour = "color-mix(in srgb,var(--ta) calc(100% - var(--f,0) * 100%),var(--tb))";
  rules.push(`.iso-tn{stroke-width:.4;stroke-linejoin:round;--ta:var(--tn-0);--tb:var(--tn-1);fill:${colour};stroke:${colour}}`);
  for (let i = 1; i < 4; i++) rules.push(`.iso-tn[data-b="${i}"]{--ta:var(--tn-${i});--tb:var(--tn-${i + 1})}`);
  rules.push(t3MaterialCss());
  for (const hue of ["red", "green", "blue"]) rules.push(`.tb[data-hue="${hue}"]{--tb-ink:var(--anatomy-${hue})}`);
  rules.push(".tb[data-hue] .tb-body{fill:color-mix(in srgb,var(--tb-ink) 54%,var(--anatomy-shade-2))}");
  rules.push(".tb[data-hue] .tb-shine{fill:color-mix(in srgb,var(--tb-ink) 16%,var(--anatomy-top))}");
  rules.push(".tb[data-hue] .tb-shade{fill:color-mix(in srgb,var(--tb-ink) 30%,var(--anatomy-hi))}");
  rules.push(".tb[data-hue] .tb-edge{stroke:color-mix(in srgb,var(--tb-ink) 38%,var(--anatomy-hi))}");
  rules.push(".tb[data-hue][data-mat] .tb-body{fill:color-mix(in srgb,var(--tb-ink) 62%,var(--mat-body))}");
  rules.push(".tb[data-hue][data-mat] .tb-shine{fill:color-mix(in srgb,var(--tb-ink) 22%,var(--mat-shine))}");
  rules.push(".tb[data-hue][data-mat] .tb-shade{fill:color-mix(in srgb,var(--tb-ink) 46%,var(--mat-shade))}");
  rules.push(".tb[data-hue][data-mat] .tb-edge{stroke:color-mix(in srgb,var(--tb-ink) 30%,var(--mat-edge))}");
  rules.push(".iso-turn{position:relative}");
  rules.push(".iso-turn>.iso-layer{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}");
  return rules.join("\n");
}

const TURN = { materials: Object.keys(T3_MATERIALS), materialCss: t3MaterialCss, rotation: (axis, degrees) => Array.from(t3Rot(axis, degrees)), quat: (q) => Array.from(t3Quat(q)), compose: t3Compose, floorOf: t3FloorOf, anchor: t3Anchor, camera: t3Camera, poses: t3PosesMap, prepare: t3Prepare, emit: t3Emit, order: t3Order, mount: t3Mount, cover: t3Cover, poseUniforms: t3PoseUniforms, css: t3Css, frame: t3Frame, cams: t3Cams, gjk: t3Gjk, hintsOf: (ri, ci, rj, cj, world) => Object.assign([...ri.axes.map((axis) => [axis, ci]), ...rj.axes.map((axis) => [axis, cj]), [[0, 0, 1], world]], { centroids: [ri.centroid, rj.centroid] }), disjoint: t3Disjoint, levels: T3_LEVELS, q: T3_Q, exact: (on) => { t3State.exact = Boolean(on); } };
const TURN_CSS = t3Css();


const DATA = {"P":{"origin":[300,284.0223],"scale":0.9736,"azimuth":60,"elevation":30},"groups":[{"name":"gato","parent":-1,"kind":"turn","origin":[0,0,0],"pivot":[0,0],"range":null,"upright":true},{"name":"piston","parent":0,"kind":"slide","origin":[0,0,0],"direction":[0,0,1],"travel":12,"range":[0,12],"upright":true},{"name":"embolo","parent":0,"kind":"slide","origin":[0,0,0],"direction":[0,0,1],"travel":12,"range":[0,12],"upright":true},{"name":"palanca","parent":0,"kind":"hinge","origin":[42,0,148],"point":[42,0,148],"axis":[0,1,0],"range":[-18.8346,17.0416],"upright":false},{"name":"biela","parent":3,"kind":"hinge","origin":[62,0,148],"point":[62,0,148],"axis":[0,1,0],"range":[-12,12],"upright":false}],"layers":[{"name":"gato","parts":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51],"rest":[48,46,0,1,2,20,49,21,50,22,28,27,29,26,36,30,38,39,3,41,43,42,44,14,15,13,45,16,12,17,11,18,31,10,32,19,25,51,37,47,23,33,24,9,34,40,35,4,8,5,7,6]}],"parts":[{"name":"base","kind":"prism","group":0,"layer":0,"tone":"mid","mat":"gunmetal","spec":{"up":1,"ring":[96,-50,97.553,-49.796,99,-49.196,100.243,-48.243,101.196,-47,101.796,-45.553,102,-44,102,44,101.796,45.553,101.196,47,100.243,48.243,99,49.196,97.553,49.796,96,50,-96,50,-97.553,49.796,-99,49.196,-100.243,48.243,-101.196,47,-101.796,45.553,-102,44,-102,-44,-101.796,-45.553,-101.196,-47,-100.243,-48.243,-99,-49.196,-97.553,-49.796,-96,-50],"z0":0,"z1":34,"bevel":0},"dots":[{"p":[-92,-40,34],"n":[0,0,1],"size":0.55,"tone":"mid","fade":[0.04,0.42]},{"p":[92,-40,34],"n":[0,0,1],"size":0.55,"tone":"mid","fade":[0.04,0.42]},{"p":[92,40,34],"n":[0,0,1],"size":0.55,"tone":"mid","fade":[0.04,0.42]},{"p":[-92,40,34],"n":[0,0,1],"size":0.55,"tone":"mid","fade":[0.04,0.42]}]},{"name":"botella.cordon","kind":"fixed","group":0,"layer":0,"tone":"mid","mat":"copper","spec":{"anchor":[-20,0,34],"home":[278.669,241.601],"box":[216.6,207.1,340.7,272.9],"hull":[217.09,238.401,217.617,234.383,219.188,230.433,221.778,226.619,225.34,223.007,229.815,219.658,235.126,216.63,241.182,213.975,247.879,211.737,255.104,209.956,262.731,208.661,270.631,207.876,278.669,207.612,286.706,207.876,294.606,208.661,302.234,209.956,309.458,211.737,316.155,213.975,322.211,216.63,327.522,219.658,331.997,223.007,335.56,226.619,338.149,230.433,339.72,234.383,340.247,238.401,340.247,241.601,339.72,245.62,338.149,249.57,335.56,253.384,331.997,256.996,327.522,260.344,322.211,263.372,316.155,266.028,309.458,268.265,302.234,270.047,294.606,271.341,286.706,272.127,278.669,272.39,270.631,272.127,262.731,271.341,255.104,270.047,247.879,268.265,241.182,266.028,235.126,263.372,229.815,260.344,225.34,256.996,221.778,253.384,219.188,249.57,217.617,245.62,217.09,241.601],"F":{"o":[-20,0,0],"a":[0,0,1],"u":[1,0,0],"v":[0,1,0]}},"cloud":[-20,0,34,30,0,34,28.296,12.941,34,26.194,19.134,34,19.668,30.438,34,15.355,35.355,34,5,43.301,34,-0.866,46.194,34,-13.474,49.572,34,-20,50,34,-32.941,48.296,34,-39.134,46.194,34,-50.438,39.668,34,-55.355,35.355,34,-63.301,25,34,-66.194,19.134,34,-69.572,6.526,34,-69.572,-6.526,34,-68.296,-12.941,34,-63.301,-25,34,-59.668,-30.438,34,-50.438,-39.668,34,-45,-43.301,34,-32.941,-48.296,34,-26.526,-49.572,34,-13.474,-49.572,34,-7.059,-48.296,34,5,-43.301,34,10.438,-39.668,34,19.668,-30.438,34,23.301,-25,34,28.296,-12.941,34,30,0,37,29.572,6.526,37,26.194,19.134,37,23.301,25,37,15.355,35.355,37,10.438,39.668,37,-0.866,46.194,37,-7.059,48.296,37,-20,50,37,-26.526,49.572,37,-39.134,46.194,37,-45,43.301,37,-55.355,35.355,37,-59.668,30.438,37,-66.194,19.134,37,-68.296,12.941,37,-70,0,37,-68.296,-12.941,37,-66.194,-19.134,37,-59.668,-30.438,37,-55.355,-35.355,37,-45,-43.301,37,-39.134,-46.194,37,-26.526,-49.572,37,-20,-50,37,-7.059,-48.296,37,-0.866,-46.194,37,10.438,-39.668,37,15.355,-35.355,37,23.301,-25,37,26.194,-19.134,37,29.572,-6.526,37]},{"name":"botella","kind":"fixed","group":0,"layer":0,"crease":"lo","mat":"copper","spec":{"anchor":[-20,0,37],"home":[278.669,238.401],"box":[219.1,79.3,338.3,268.5],"hull":[219.553,109.347,220.059,105.489,221.568,101.696,224.053,98.035,227.473,94.568,231.769,91.353,236.868,88.446,242.682,85.897,249.111,83.749,256.046,82.039,263.368,80.796,270.953,80.042,278.669,79.789,286.385,80.042,293.969,80.796,301.291,82.039,308.226,83.749,314.656,85.897,320.469,88.446,325.568,91.353,329.864,94.568,333.284,98.035,335.77,101.696,337.278,105.489,337.784,109.347,337.784,238.401,337.278,242.259,335.77,246.051,333.284,249.713,329.864,253.18,325.568,256.395,320.469,259.302,314.656,261.851,308.226,263.999,301.291,265.709,293.969,266.952,286.385,267.706,278.669,267.959,270.953,267.706,263.368,266.952,256.046,265.709,249.111,263.999,242.682,261.851,236.868,259.302,231.769,256.395,227.473,253.18,224.053,249.713,221.568,246.051,220.059,242.259,219.553,238.401],"F":{"o":[-20,0,0],"a":[0,0,1],"u":[1,0,0],"v":[0,1,0]}},"cloud":[-20,0,37,28,0,37,26.364,12.423,37,24.346,18.369,37,18.081,29.221,37,13.941,33.941,37,4,41.569,37,-1.631,44.346,37,-13.735,47.589,37,-20,48,37,-32.423,46.364,37,-38.369,44.346,37,-49.22,38.081,37,-53.941,33.941,37,-61.569,24,37,-64.346,18.369,37,-67.589,6.265,37,-67.589,-6.265,37,-66.364,-12.423,37,-61.569,-24,37,-58.081,-29.22,37,-49.22,-38.081,37,-44,-41.569,37,-32.423,-46.364,37,-26.265,-47.589,37,-13.735,-47.589,37,-7.577,-46.364,37,4,-41.569,37,9.221,-38.081,37,18.081,-29.22,37,21.569,-24,37,26.364,-12.423,37,28,0,158,27.589,6.265,158,24.346,18.369,158,21.569,24,158,13.941,33.941,158,9.221,38.081,158,-1.631,44.346,158,-7.577,46.364,158,-20,48,158,-26.265,47.589,158,-38.369,44.346,158,-44,41.569,158,-53.941,33.941,158,-58.081,29.221,158,-64.346,18.369,158,-66.364,12.423,158,-68,0,158,-66.364,-12.423,158,-64.346,-18.369,158,-58.081,-29.22,158,-53.941,-33.941,158,-44,-41.569,158,-38.369,-44.346,158,-26.265,-47.589,158,-20,-48,158,-7.577,-46.364,158,-1.631,-44.346,158,9.221,-38.081,158,13.941,-33.941,158,21.569,-24,158,24.346,-18.369,158,27.589,-6.265,158]},{"name":"tapa.base","kind":"fixed","group":0,"layer":0,"tone":"mid","mat":"gunmetal","spec":{"anchor":[-20,0,158],"home":[278.669,109.347],"box":[215.4,73.2,342,141.3],"hull":[215.859,105.08,216.396,100.981,217.999,96.952,220.64,93.062,224.274,89.378,228.838,85.962,234.255,82.874,240.432,80.165,247.264,77.883,254.632,76.066,262.412,74.745,270.47,73.944,278.669,73.675,286.867,73.944,294.925,74.745,302.705,76.066,310.074,77.883,316.905,80.165,323.082,82.874,328.499,85.962,333.064,89.378,336.697,93.062,339.338,96.952,340.941,100.981,341.479,105.08,341.479,109.347,340.941,113.446,339.338,117.475,336.697,121.365,333.064,125.049,328.499,128.465,323.082,131.553,316.905,134.262,310.074,136.544,302.705,138.361,294.925,139.681,286.867,140.483,278.669,140.752,270.47,140.483,262.412,139.681,254.632,138.361,247.264,136.544,240.432,134.262,234.255,131.553,228.838,128.465,224.274,125.049,220.64,121.365,217.999,117.475,216.396,113.446,215.859,109.347],"F":{"o":[-20,0,0],"a":[0,0,1],"u":[1,0,0],"v":[0,1,0]}},"cloud":[-20,0,158,31,0,158,29.262,13.2,158,27.118,19.517,158,20.461,31.047,158,16.062,36.062,158,5.5,44.167,158,-0.483,47.118,158,-13.343,50.564,158,-20,51,158,-33.2,49.262,158,-39.517,47.118,158,-51.047,40.461,158,-56.062,36.062,158,-64.167,25.5,158,-67.118,19.517,158,-70.564,6.657,158,-70.564,-6.657,158,-69.262,-13.2,158,-64.167,-25.5,158,-60.461,-31.047,158,-51.047,-40.461,158,-45.5,-44.167,158,-33.2,-49.262,158,-26.657,-50.564,158,-13.343,-50.564,158,-6.8,-49.262,158,5.5,-44.167,158,11.047,-40.461,158,20.461,-31.047,158,24.167,-25.5,158,29.262,-13.2,158,31,0,162,30.564,6.657,162,27.118,19.517,162,24.167,25.5,162,16.062,36.062,162,11.047,40.461,162,-0.483,47.118,162,-6.8,49.262,162,-20,51,162,-26.657,50.564,162,-39.517,47.118,162,-45.5,44.167,162,-56.062,36.062,162,-60.461,31.047,162,-67.118,19.517,162,-69.262,13.2,162,-71,0,162,-69.262,-13.2,162,-67.118,-19.517,162,-60.461,-31.047,162,-56.062,-36.062,162,-45.5,-44.167,162,-39.517,-47.118,162,-26.657,-50.564,162,-20,-51,162,-6.8,-49.262,162,-0.483,-47.118,162,11.047,-40.461,162,16.062,-36.062,162,24.167,-25.5,162,27.118,-19.517,162,30.564,-6.657,162]},{"name":"tapa.corona.0","kind":"prism","group":0,"layer":0,"tone":"mid","mat":"gunmetal","spec":{"up":1,"ring":[10.9,0,31,0,30.754,4.999,30.02,9.95,28.804,14.805,27.118,19.517,8.548,11.825],"z0":162,"z1":176,"bevel":0}},{"name":"tapa.corona.1","kind":"prism","group":0,"layer":0,"tone":"mid","mat":"gunmetal","spec":{"up":1,"ring":[8.548,11.825,27.118,19.517,24.978,24.041,22.405,28.334,19.424,32.354,16.062,36.062,1.85,21.85],"z0":162,"z1":176,"bevel":0}},{"name":"tapa.corona.2","kind":"prism","group":0,"layer":0,"tone":"mid","mat":"gunmetal","spec":{"up":1,"ring":[1.85,21.85,16.062,36.062,12.354,39.424,8.334,42.405,4.041,44.978,-0.483,47.118,-8.175,28.548],"z0":162,"z1":176,"bevel":0}},{"name":"tapa.corona.3","kind":"prism","group":0,"layer":0,"tone":"mid","mat":"gunmetal","spec":{"up":1,"ring":[-8.175,28.548,-0.483,47.118,-5.195,48.804,-10.05,50.02,-15.001,50.754,-20,51,-20,30.9],"z0":162,"z1":176,"bevel":0}},{"name":"tapa.corona.4","kind":"prism","group":0,"layer":0,"tone":"mid","mat":"gunmetal","spec":{"up":1,"ring":[-20,30.9,-20,51,-24.999,50.754,-29.95,50.02,-34.805,48.804,-39.517,47.118,-31.825,28.548],"z0":162,"z1":176,"bevel":0}},{"name":"tapa.corona.5","kind":"prism","group":0,"layer":0,"tone":"mid","mat":"gunmetal","spec":{"up":1,"ring":[-31.825,28.548,-39.517,47.118,-44.041,44.978,-48.334,42.405,-52.354,39.424,-56.062,36.062,-41.85,21.85],"z0":162,"z1":176,"bevel":0}},{"name":"tapa.corona.6","kind":"prism","group":0,"layer":0,"tone":"mid","mat":"gunmetal","spec":{"up":1,"ring":[-41.85,21.85,-56.062,36.062,-59.424,32.354,-62.405,28.334,-64.978,24.041,-67.118,19.517,-48.548,11.825],"z0":162,"z1":176,"bevel":0}},{"name":"tapa.corona.7","kind":"prism","group":0,"layer":0,"tone":"mid","mat":"gunmetal","spec":{"up":1,"ring":[-48.548,11.825,-67.118,19.517,-68.804,14.805,-70.02,9.95,-70.754,4.999,-71,0,-50.9,0],"z0":162,"z1":176,"bevel":0}},{"name":"tapa.corona.8","kind":"prism","group":0,"layer":0,"tone":"mid","mat":"gunmetal","spec":{"up":1,"ring":[-50.9,0,-71,0,-70.754,-4.999,-70.02,-9.95,-68.804,-14.805,-67.118,-19.517,-48.548,-11.825],"z0":162,"z1":176,"bevel":0}},{"name":"tapa.corona.9","kind":"prism","group":0,"layer":0,"tone":"mid","mat":"gunmetal","spec":{"up":1,"ring":[-48.548,-11.825,-67.118,-19.517,-64.978,-24.041,-62.405,-28.334,-59.424,-32.354,-56.062,-36.062,-41.85,-21.85],"z0":162,"z1":176,"bevel":0}},{"name":"tapa.corona.10","kind":"prism","group":0,"layer":0,"tone":"mid","mat":"gunmetal","spec":{"up":1,"ring":[-41.85,-21.85,-56.062,-36.062,-52.354,-39.424,-48.334,-42.405,-44.041,-44.978,-39.517,-47.118,-31.825,-28.548],"z0":162,"z1":176,"bevel":0}},{"name":"tapa.corona.11","kind":"prism","group":0,"layer":0,"tone":"mid","mat":"gunmetal","spec":{"up":1,"ring":[-31.825,-28.548,-39.517,-47.118,-34.805,-48.804,-29.95,-50.02,-24.999,-50.754,-20,-51,-20,-30.9],"z0":162,"z1":176,"bevel":0}},{"name":"tapa.corona.12","kind":"prism","group":0,"layer":0,"tone":"mid","mat":"gunmetal","spec":{"up":1,"ring":[-20,-30.9,-20,-51,-15.001,-50.754,-10.05,-50.02,-5.195,-48.804,-0.483,-47.118,-8.175,-28.548],"z0":162,"z1":176,"bevel":0}},{"name":"tapa.corona.13","kind":"prism","group":0,"layer":0,"tone":"mid","mat":"gunmetal","spec":{"up":1,"ring":[-8.175,-28.548,-0.483,-47.118,4.041,-44.978,8.334,-42.405,12.354,-39.424,16.062,-36.062,1.85,-21.85],"z0":162,"z1":176,"bevel":0}},{"name":"tapa.corona.14","kind":"prism","group":0,"layer":0,"tone":"mid","mat":"gunmetal","spec":{"up":1,"ring":[1.85,-21.85,16.062,-36.062,19.424,-32.354,22.405,-28.334,24.978,-24.041,27.118,-19.517,8.548,-11.825],"z0":162,"z1":176,"bevel":0}},{"name":"tapa.corona.15","kind":"prism","group":0,"layer":0,"tone":"mid","mat":"gunmetal","spec":{"up":1,"ring":[8.548,-11.825,27.118,-19.517,28.804,-14.805,30.02,-9.95,30.754,-4.999,31,0,10.9,0],"z0":162,"z1":176,"bevel":0}},{"name":"bomba.cordon","kind":"fixed","group":0,"layer":0,"tone":"mid","mat":"copper","spec":{"anchor":[62,0,34],"home":[366.127,266.848],"box":[348.4,254.5,383.9,276],"hull":[348.885,263.649,349.033,262.523,349.473,261.417,350.198,260.349,351.195,259.338,352.448,258.4,353.935,257.553,355.631,256.809,357.506,256.183,359.529,255.684,361.665,255.321,363.877,255.101,366.127,255.028,368.378,255.101,370.59,255.321,372.725,255.684,374.748,256.183,376.624,256.809,378.319,257.553,379.806,258.4,381.059,259.338,382.057,260.349,382.782,261.417,383.222,262.523,383.369,263.649,383.369,266.848,383.222,267.974,382.782,269.08,382.057,270.147,381.059,271.159,379.806,272.096,378.319,272.944,376.624,273.688,374.748,274.314,372.725,274.813,370.59,275.175,368.378,275.395,366.127,275.469,363.877,275.395,361.665,275.175,359.529,274.813,357.506,274.314,355.631,273.688,353.935,272.944,352.448,272.096,351.195,271.159,350.198,270.147,349.473,269.08,349.033,267.974,348.885,266.848],"F":{"o":[62,0,0],"a":[0,0,1],"u":[1,0,0],"v":[0,1,0]}},"cloud":[62,0,34,76,0,34,75.523,3.624,34,74.934,5.358,34,73.107,8.523,34,71.9,9.9,34,69,12.124,34,67.358,12.934,34,63.827,13.88,34,62,14,34,58.377,13.523,34,56.642,12.934,34,53.477,11.107,34,52.101,9.9,34,49.876,7,34,49.066,5.358,34,48.12,1.827,34,48.12,-1.827,34,48.477,-3.623,34,49.876,-7,34,50.893,-8.523,34,53.477,-11.107,34,55,-12.124,34,58.377,-13.523,34,60.173,-13.88,34,63.827,-13.88,34,65.624,-13.523,34,69,-12.124,34,70.523,-11.107,34,73.107,-8.523,34,74.124,-7,34,75.523,-3.623,34,76,0,37,75.88,1.827,37,74.934,5.358,37,74.124,7,37,71.9,9.9,37,70.523,11.107,37,67.358,12.934,37,65.624,13.523,37,62,14,37,60.173,13.88,37,56.642,12.934,37,55,12.124,37,52.101,9.9,37,50.893,8.523,37,49.066,5.358,37,48.477,3.624,37,48,0,37,48.477,-3.623,37,49.066,-5.358,37,50.893,-8.523,37,52.101,-9.899,37,55,-12.124,37,56.642,-12.934,37,60.173,-13.88,37,62,-14,37,65.624,-13.523,37,67.358,-12.934,37,70.523,-11.107,37,71.9,-9.899,37,74.124,-7,37,74.934,-5.358,37,75.88,-1.827,37]},{"name":"bomba","kind":"fixed","group":0,"layer":0,"crease":"lo","mat":"copper","spec":{"anchor":[62,0,37],"home":[366.127,263.649],"box":[350.8,184.3,381.4,271.5],"hull":[351.348,192.188,351.475,191.224,351.852,190.276,352.473,189.361,353.328,188.494,354.402,187.69,355.677,186.963,357.131,186.326,358.738,185.789,360.472,185.362,362.302,185.051,364.198,184.862,366.127,184.799,368.056,184.862,369.952,185.051,371.783,185.362,373.517,185.789,375.124,186.326,376.577,186.963,377.852,187.69,378.926,188.494,379.781,189.361,380.403,190.276,380.78,191.224,380.906,192.188,380.906,263.649,380.78,264.613,380.403,265.561,379.781,266.476,378.926,267.343,377.852,268.147,376.577,268.874,375.124,269.511,373.517,270.048,371.783,270.475,369.952,270.786,368.056,270.975,366.127,271.038,364.198,270.975,362.302,270.786,360.472,270.475,358.738,270.048,357.131,269.511,355.677,268.874,354.402,268.147,353.328,267.343,352.473,266.476,351.852,265.561,351.475,264.613,351.348,263.649],"F":{"o":[62,0,0],"a":[0,0,1],"u":[1,0,0],"v":[0,1,0]}},"cloud":[62,0,37,74,0,37,73.591,3.106,37,73.087,4.592,37,71.52,7.305,37,70.485,8.485,37,68,10.392,37,66.592,11.087,37,63.566,11.897,37,62,12,37,58.894,11.591,37,57.408,11.087,37,54.695,9.52,37,53.515,8.485,37,51.608,6,37,50.913,4.592,37,50.103,1.566,37,50.103,-1.566,37,50.409,-3.106,37,51.608,-6,37,52.48,-7.305,37,54.695,-9.52,37,56,-10.392,37,58.894,-11.591,37,60.434,-11.897,37,63.566,-11.897,37,65.106,-11.591,37,68,-10.392,37,69.305,-9.52,37,71.52,-7.305,37,72.392,-6,37,73.591,-3.106,37,74,0,104,73.897,1.566,104,73.087,4.592,104,72.392,6,104,70.485,8.485,104,69.305,9.52,104,66.592,11.087,104,65.106,11.591,104,62,12,104,60.434,11.897,104,57.408,11.087,104,56,10.392,104,53.515,8.485,104,52.48,7.305,104,50.913,4.592,104,50.409,3.106,104,50,0,104,50.409,-3.106,104,50.913,-4.592,104,52.48,-7.305,104,53.515,-8.485,104,56,-10.392,104,57.408,-11.087,104,60.434,-11.897,104,62,-12,104,65.106,-11.591,104,66.592,-11.087,104,69.305,-9.52,104,70.485,-8.485,104,72.392,-6,104,73.087,-4.592,104,73.897,-1.566,104]},{"name":"bomba.prensa","kind":"fixed","group":0,"layer":0,"tone":"mid","mat":"gunmetal","spec":{"anchor":[62,0,104],"home":[366.127,192.188],"box":[348.4,180.9,383.9,201.3],"hull":[348.885,190.055,349.033,188.93,349.473,187.824,350.198,186.756,351.195,185.745,352.448,184.807,353.935,183.959,355.631,183.216,357.506,182.589,359.529,182.091,361.665,181.728,363.877,181.508,366.127,181.434,368.378,181.508,370.59,181.728,372.725,182.091,374.748,182.589,376.624,183.216,378.319,183.959,379.806,184.807,381.059,185.745,382.057,186.756,382.782,187.824,383.222,188.93,383.369,190.055,383.369,192.188,383.222,193.314,382.782,194.42,382.057,195.488,381.059,196.499,379.806,197.437,378.319,198.284,376.624,199.028,374.748,199.654,372.725,200.153,370.59,200.516,368.378,200.736,366.127,200.809,363.877,200.736,361.665,200.516,359.529,200.153,357.506,199.654,355.631,199.028,353.935,198.284,352.448,197.437,351.195,196.499,350.198,195.488,349.473,194.42,349.033,193.314,348.885,192.188],"F":{"o":[62,0,0],"a":[0,0,1],"u":[1,0,0],"v":[0,1,0]}},"cloud":[62,0,104,76,0,104,75.523,3.624,104,74.934,5.358,104,73.107,8.523,104,71.9,9.9,104,69,12.124,104,67.358,12.934,104,63.827,13.88,104,62,14,104,58.377,13.523,104,56.642,12.934,104,53.477,11.107,104,52.101,9.9,104,49.876,7,104,49.066,5.358,104,48.12,1.827,104,48.12,-1.827,104,48.477,-3.623,104,49.876,-7,104,50.893,-8.523,104,53.477,-11.107,104,55,-12.124,104,58.377,-13.523,104,60.173,-13.88,104,63.827,-13.88,104,65.624,-13.523,104,69,-12.124,104,70.523,-11.107,104,73.107,-8.523,104,74.124,-7,104,75.523,-3.623,104,76,0,106,75.88,1.827,106,74.934,5.358,106,74.124,7,106,71.9,9.9,106,70.523,11.107,106,67.358,12.934,106,65.624,13.523,106,62,14,106,60.173,13.88,106,56.642,12.934,106,55,12.124,106,52.101,9.9,106,50.893,8.523,106,49.066,5.358,106,48.477,3.624,106,48,0,106,48.477,-3.623,106,49.066,-5.358,106,50.893,-8.523,106,52.101,-9.899,106,55,-12.124,106,56.642,-12.934,106,60.173,-13.88,106,62,-14,106,65.624,-13.523,106,67.358,-12.934,106,70.523,-11.107,106,71.9,-9.899,106,74.124,-7,106,74.934,-5.358,106,75.88,-1.827,106]},{"name":"bomba.corona.0","kind":"prism","group":0,"layer":0,"tone":"mid","mat":"gunmetal","spec":{"up":1,"ring":[68.6,0,76,0,75.731,2.731,74.934,5.358,73.641,7.778,71.899,9.899,66.667,4.667],"z0":106,"z1":118,"bevel":0}},{"name":"bomba.corona.1","kind":"prism","group":0,"layer":0,"tone":"mid","mat":"gunmetal","spec":{"up":1,"ring":[66.667,4.667,71.899,9.899,69.778,11.641,67.358,12.934,64.731,13.731,62,14,62,6.6],"z0":106,"z1":118,"bevel":0}},{"name":"bomba.corona.2","kind":"prism","group":0,"layer":0,"tone":"mid","mat":"gunmetal","spec":{"up":1,"ring":[62,6.6,62,14,59.269,13.731,56.642,12.934,54.222,11.641,52.101,9.899,57.333,4.667],"z0":106,"z1":118,"bevel":0}},{"name":"bomba.corona.3","kind":"prism","group":0,"layer":0,"tone":"mid","mat":"gunmetal","spec":{"up":1,"ring":[57.333,4.667,52.101,9.899,50.359,7.778,49.066,5.358,48.269,2.731,48,0,55.4,0],"z0":106,"z1":118,"bevel":0}},{"name":"bomba.corona.4","kind":"prism","group":0,"layer":0,"tone":"mid","mat":"gunmetal","spec":{"up":1,"ring":[55.4,0,48,0,48.269,-2.731,49.066,-5.358,50.359,-7.778,52.101,-9.899,57.333,-4.667],"z0":106,"z1":118,"bevel":0}},{"name":"bomba.corona.5","kind":"prism","group":0,"layer":0,"tone":"mid","mat":"gunmetal","spec":{"up":1,"ring":[57.333,-4.667,52.101,-9.899,54.222,-11.641,56.642,-12.934,59.269,-13.731,62,-14,62,-6.6],"z0":106,"z1":118,"bevel":0}},{"name":"bomba.corona.6","kind":"prism","group":0,"layer":0,"tone":"mid","mat":"gunmetal","spec":{"up":1,"ring":[62,-6.6,62,-14,64.731,-13.731,67.358,-12.934,69.778,-11.641,71.899,-9.899,66.667,-4.667],"z0":106,"z1":118,"bevel":0}},{"name":"bomba.corona.7","kind":"prism","group":0,"layer":0,"tone":"mid","mat":"gunmetal","spec":{"up":1,"ring":[66.667,-4.667,71.899,-9.899,73.641,-7.778,74.934,-5.358,75.731,-2.731,76,0,68.6,0],"z0":106,"z1":118,"bevel":0}},{"name":"piston","kind":"fixed","group":1,"layer":0,"crease":"lo","mat":"chrome","spec":{"anchor":[-20,0,162],"home":[278.669,105.08],"box":[241.2,58.4,316.1,124.1],"hull":[241.722,77.349,242.038,74.938,242.981,72.568,244.534,70.28,246.672,68.113,249.357,66.104,252.543,64.287,256.177,62.693,260.195,61.351,264.53,60.282,269.106,59.505,273.846,59.034,278.669,58.876,283.491,59.034,288.231,59.505,292.808,60.282,297.142,61.351,301.161,62.693,304.794,64.287,307.981,66.104,310.666,68.113,312.803,70.28,314.357,72.568,315.3,74.938,315.616,77.349,315.616,105.08,315.3,107.492,314.357,109.862,312.803,112.15,310.666,114.317,307.981,116.326,304.794,118.143,301.161,119.736,297.142,121.079,292.808,122.148,288.231,122.924,283.491,123.396,278.669,123.554,273.846,123.396,269.106,122.924,264.53,122.148,260.195,121.079,256.177,119.736,252.543,118.143,249.357,116.326,246.672,114.317,244.534,112.15,242.981,109.862,242.038,107.492,241.722,105.08],"F":{"o":[-20,0,0],"a":[0,0,1],"u":[1,0,0],"v":[0,1,0]}},"cloud":[-20,0,162,10,0,162,8.978,7.765,162,7.716,11.481,162,3.801,18.263,162,1.213,21.213,162,-5,25.981,162,-8.519,27.716,162,-16.084,29.743,162,-20,30,162,-27.765,28.978,162,-31.48,27.716,162,-38.263,23.801,162,-41.213,21.213,162,-45.981,15,162,-47.716,11.481,162,-49.743,3.916,162,-49.743,-3.916,162,-48.978,-7.765,162,-45.981,-15,162,-43.801,-18.263,162,-38.263,-23.801,162,-35,-25.981,162,-27.765,-28.978,162,-23.916,-29.743,162,-16.084,-29.743,162,-12.235,-28.978,162,-5,-25.981,162,-1.737,-23.801,162,3.801,-18.263,162,5.981,-15,162,8.978,-7.765,162,10,0,188,9.743,3.916,188,7.716,11.481,188,5.981,15,188,1.213,21.213,188,-1.737,23.801,188,-8.519,27.716,188,-12.235,28.978,188,-20,30,188,-23.916,29.743,188,-31.48,27.716,188,-35,25.981,188,-41.213,21.213,188,-43.801,18.263,188,-47.716,11.481,188,-48.978,7.765,188,-50,0,188,-48.978,-7.765,188,-47.716,-11.48,188,-43.801,-18.263,188,-41.213,-21.213,188,-35,-25.981,188,-31.48,-27.716,188,-23.916,-29.743,188,-20,-30,188,-12.235,-28.978,188,-8.519,-27.716,188,-1.737,-23.801,188,1.213,-21.213,188,5.981,-15,188,7.716,-11.48,188,9.743,-3.916,188]},{"name":"piston.tornillo","kind":"fixed","group":1,"layer":0,"tone":"mid","mat":"steel","spec":{"anchor":[-20,0,188],"home":[278.669,77.349],"box":[265.9,60,291.5,84],"hull":[266.353,66.684,266.458,65.88,266.773,65.09,267.29,64.327,268.003,63.605,268.898,62.935,269.96,62.33,271.171,61.798,272.511,61.351,273.956,60.995,275.481,60.736,277.061,60.579,278.669,60.526,280.276,60.579,281.856,60.736,283.382,60.995,284.826,61.351,286.166,61.798,287.377,62.33,288.439,62.935,289.334,63.605,290.047,64.327,290.565,65.09,290.879,65.88,290.984,66.684,290.984,77.349,290.879,78.153,290.565,78.943,290.047,79.706,289.334,80.428,288.439,81.098,287.377,81.704,286.166,82.235,284.826,82.682,283.382,83.039,281.856,83.297,280.276,83.455,278.669,83.507,277.061,83.455,275.481,83.297,273.956,83.039,272.511,82.682,271.171,82.235,269.96,81.704,268.898,81.098,268.003,80.428,267.29,79.706,266.773,78.943,266.458,78.153,266.353,77.349],"F":{"o":[-20,0,0],"a":[0,0,1],"u":[1,0,0],"v":[0,1,0]}},"cloud":[-20,0,188,-10,0,188,-10.341,2.588,188,-10.761,3.827,188,-12.066,6.088,188,-12.929,7.071,188,-15,8.66,188,-16.173,9.239,188,-18.695,9.914,188,-20,10,188,-22.588,9.659,188,-23.827,9.239,188,-26.088,7.934,188,-27.071,7.071,188,-28.66,5,188,-29.239,3.827,188,-29.914,1.305,188,-29.914,-1.305,188,-29.659,-2.588,188,-28.66,-5,188,-27.933,-6.088,188,-26.088,-7.933,188,-25,-8.66,188,-22.588,-9.659,188,-21.305,-9.914,188,-18.695,-9.914,188,-17.412,-9.659,188,-15,-8.66,188,-13.912,-7.933,188,-12.066,-6.088,188,-11.34,-5,188,-10.341,-2.588,188,-10,0,198,-10.086,1.305,198,-10.761,3.827,198,-11.34,5,198,-12.929,7.071,198,-13.912,7.934,198,-16.173,9.239,198,-17.412,9.659,198,-20,10,198,-21.305,9.914,198,-23.827,9.239,198,-25,8.66,198,-27.071,7.071,198,-27.933,6.088,198,-29.239,3.827,198,-29.659,2.588,198,-30,0,198,-29.659,-2.588,198,-29.239,-3.827,198,-27.933,-6.088,198,-27.071,-7.071,198,-25,-8.66,198,-23.827,-9.239,198,-21.305,-9.914,198,-20,-10,198,-17.412,-9.659,198,-16.173,-9.239,198,-13.912,-7.933,198,-12.929,-7.071,198,-11.34,-5,198,-10.761,-3.827,198,-10.086,-1.305,198]},{"name":"piston.silla","kind":"fixed","group":1,"layer":0,"tone":"mid","mat":"steel","spec":{"anchor":[-20,0,198],"home":[278.669,66.684],"box":[253.5,45.3,303.8,79.5],"hull":[254.037,58.151,254.248,56.544,254.877,54.964,255.912,53.438,257.337,51.993,259.127,50.654,261.252,49.443,263.674,48.381,266.353,47.486,269.243,46.773,272.294,46.255,275.454,45.941,278.669,45.836,281.884,45.941,285.044,46.255,288.095,46.773,290.984,47.486,293.663,48.381,296.086,49.443,298.21,50.654,300,51.993,301.425,53.438,302.461,54.964,303.089,56.544,303.3,58.151,303.3,66.684,303.089,68.291,302.461,69.871,301.425,71.397,300,72.842,298.21,74.181,296.086,75.392,293.663,76.454,290.984,77.349,288.095,78.062,285.044,78.58,281.884,78.894,278.669,78.999,275.454,78.894,272.294,78.58,269.243,78.062,266.353,77.349,263.674,76.454,261.252,75.392,259.127,74.181,257.337,72.842,255.912,71.397,254.877,69.871,254.248,68.291,254.037,66.684],"F":{"o":[-20,0,0],"a":[0,0,1],"u":[1,0,0],"v":[0,1,0]}},"cloud":[-20,0,198,0,0,198,-0.681,5.176,198,-1.522,7.654,198,-4.133,12.175,198,-5.858,14.142,198,-10,17.321,198,-12.346,18.478,198,-17.389,19.829,198,-20,20,198,-25.176,19.319,198,-27.654,18.478,198,-32.175,15.867,198,-34.142,14.142,198,-37.32,10,198,-38.478,7.654,198,-39.829,2.611,198,-39.829,-2.61,198,-39.318,-5.176,198,-37.32,-10,198,-35.867,-12.175,198,-32.175,-15.867,198,-30,-17.32,198,-25.176,-19.318,198,-22.61,-19.829,198,-17.389,-19.829,198,-14.824,-19.318,198,-10,-17.32,198,-7.825,-15.867,198,-4.133,-12.175,198,-2.679,-10,198,-0.681,-5.176,198,0,0,206,-0.171,2.611,206,-1.522,7.654,206,-2.679,10,206,-5.858,14.142,206,-7.825,15.867,206,-12.346,18.478,206,-14.824,19.319,206,-20,20,206,-22.61,19.829,206,-27.654,18.478,206,-30,17.321,206,-34.142,14.142,206,-35.867,12.175,206,-38.478,7.654,206,-39.318,5.176,206,-40,0,206,-39.318,-5.176,206,-38.478,-7.654,206,-35.867,-12.175,206,-34.142,-14.142,206,-30,-17.32,206,-27.654,-18.478,206,-22.61,-19.829,206,-20,-20,206,-14.824,-19.318,206,-12.346,-18.478,206,-7.825,-15.867,206,-5.858,-14.142,206,-2.679,-10,206,-1.522,-7.654,206,-0.171,-2.61,206]},{"name":"carga.1","kind":"fixed","group":1,"layer":0,"tone":"mid","spec":{"anchor":[-20,0,206],"home":[278.669,58.151],"box":[228.9,23.8,328.4,83.3],"hull":[229.406,48.979,229.827,45.764,231.084,42.604,233.156,39.553,236.006,36.663,239.586,33.984,243.835,31.562,248.679,29.437,254.037,27.647,259.817,26.222,265.918,25.187,272.239,24.558,278.669,24.347,285.099,24.558,291.419,25.187,297.521,26.222,303.3,27.647,308.658,29.437,313.503,31.562,317.751,33.984,321.331,36.663,324.181,39.553,326.253,42.604,327.51,45.764,327.931,48.979,327.931,58.151,327.51,61.366,326.253,64.526,324.181,67.577,321.331,70.467,317.751,73.146,313.503,75.568,308.658,77.693,303.3,79.483,297.521,80.908,291.419,81.943,285.099,82.572,278.669,82.783,272.239,82.572,265.918,81.943,259.817,80.908,254.037,79.483,248.679,77.693,243.835,75.568,239.586,73.146,236.006,70.467,233.156,67.577,231.084,64.526,229.827,61.366,229.406,58.151],"F":{"o":[-20,0,0],"a":[0,0,1],"u":[1,0,0],"v":[0,1,0]}},"cloud":[-20,0,206,20,0,206,18.637,10.353,206,16.955,15.307,206,11.734,24.351,206,8.284,28.284,206,0,34.641,206,-4.693,36.955,206,-14.779,39.658,206,-20,40,206,-30.353,38.637,206,-35.307,36.955,206,-44.35,31.734,206,-48.284,28.284,206,-54.641,20,206,-56.955,15.307,206,-59.658,5.221,206,-59.658,-5.221,206,-58.637,-10.353,206,-54.641,-20,206,-51.734,-24.35,206,-44.35,-31.734,206,-40,-34.641,206,-30.353,-38.637,206,-25.221,-39.658,206,-14.779,-39.658,206,-9.647,-38.637,206,0,-34.641,206,4.351,-31.734,206,11.734,-24.35,206,14.641,-20,206,18.637,-10.353,206,20,0,214.6,19.658,5.221,214.6,16.955,15.307,214.6,14.641,20,214.6,8.284,28.284,214.6,4.351,31.734,214.6,-4.693,36.955,214.6,-9.647,38.637,214.6,-20,40,214.6,-25.221,39.658,214.6,-35.307,36.955,214.6,-40,34.641,214.6,-48.284,28.284,214.6,-51.734,24.351,214.6,-56.955,15.307,214.6,-58.637,10.353,214.6,-60,0,214.6,-58.637,-10.353,214.6,-56.955,-15.307,214.6,-51.734,-24.35,214.6,-48.284,-28.284,214.6,-40,-34.641,214.6,-35.307,-36.955,214.6,-25.221,-39.658,214.6,-20,-40,214.6,-9.647,-38.637,214.6,-4.693,-36.955,214.6,4.351,-31.734,214.6,8.284,-28.284,214.6,14.641,-20,214.6,16.955,-15.307,214.6,19.658,-5.221,214.6]},{"name":"carga.2","kind":"fixed","group":1,"layer":0,"tone":"mid","spec":{"anchor":[-20,0,214.6],"home":[278.669,48.979],"box":[228.9,14.7,328.4,74.1],"hull":[229.406,39.806,229.827,36.591,231.084,33.431,233.156,30.38,236.006,27.491,239.586,24.812,243.835,22.389,248.679,20.265,254.037,18.475,259.817,17.05,265.918,16.014,272.239,15.386,278.669,15.175,285.099,15.386,291.419,16.014,297.521,17.05,303.3,18.475,308.658,20.265,313.503,22.389,317.751,24.812,321.331,27.491,324.181,30.38,326.253,33.431,327.51,36.591,327.931,39.806,327.931,48.979,327.51,52.194,326.253,55.354,324.181,58.405,321.331,61.294,317.751,63.973,313.503,66.396,308.658,68.52,303.3,70.31,297.521,71.735,291.419,72.771,285.099,73.399,278.669,73.61,272.239,73.399,265.918,72.771,259.817,71.735,254.037,70.31,248.679,68.52,243.835,66.396,239.586,63.973,236.006,61.294,233.156,58.405,231.084,55.354,229.827,52.194,229.406,48.979],"F":{"o":[-20,0,0],"a":[0,0,1],"u":[1,0,0],"v":[0,1,0]}},"dots":[{"p":[4.839,7.684,223.2],"n":[0,0,1],"size":0.5,"tone":"mid","fade":[0.04,0.42]},{"p":[-14.235,25.353,223.2],"n":[0,0,1],"size":0.5,"tone":"mid","fade":[0.04,0.42]},{"p":[-39.074,17.669,223.2],"n":[0,0,1],"size":0.5,"tone":"mid","fade":[0.04,0.42]},{"p":[-44.839,-7.684,223.2],"n":[0,0,1],"size":0.5,"tone":"mid","fade":[0.04,0.42]},{"p":[-25.765,-25.353,223.2],"n":[0,0,1],"size":0.5,"tone":"mid","fade":[0.04,0.42]},{"p":[-0.926,-17.669,223.2],"n":[0,0,1],"size":0.5,"tone":"mid","fade":[0.04,0.42]}],"cloud":[-20,0,214.6,20,0,214.6,18.637,10.353,214.6,16.955,15.307,214.6,11.734,24.351,214.6,8.284,28.284,214.6,0,34.641,214.6,-4.693,36.955,214.6,-14.779,39.658,214.6,-20,40,214.6,-30.353,38.637,214.6,-35.307,36.955,214.6,-44.35,31.734,214.6,-48.284,28.284,214.6,-54.641,20,214.6,-56.955,15.307,214.6,-59.658,5.221,214.6,-59.658,-5.221,214.6,-58.637,-10.353,214.6,-54.641,-20,214.6,-51.734,-24.35,214.6,-44.35,-31.734,214.6,-40,-34.641,214.6,-30.353,-38.637,214.6,-25.221,-39.658,214.6,-14.779,-39.658,214.6,-9.647,-38.637,214.6,0,-34.641,214.6,4.351,-31.734,214.6,11.734,-24.35,214.6,14.641,-20,214.6,18.637,-10.353,214.6,20,0,223.2,19.658,5.221,223.2,16.955,15.307,223.2,14.641,20,223.2,8.284,28.284,223.2,4.351,31.734,223.2,-4.693,36.955,223.2,-9.647,38.637,223.2,-20,40,223.2,-25.221,39.658,223.2,-35.307,36.955,223.2,-40,34.641,223.2,-48.284,28.284,223.2,-51.734,24.351,223.2,-56.955,15.307,223.2,-58.637,10.353,223.2,-60,0,223.2,-58.637,-10.353,223.2,-56.955,-15.307,223.2,-51.734,-24.35,223.2,-48.284,-28.284,223.2,-40,-34.641,223.2,-35.307,-36.955,223.2,-25.221,-39.658,223.2,-20,-40,223.2,-9.647,-38.637,223.2,-4.693,-36.955,223.2,4.351,-31.734,223.2,8.284,-28.284,223.2,14.641,-20,223.2,16.955,-15.307,223.2,19.658,-5.221,223.2]},{"name":"embolo","kind":"fixed","group":2,"layer":0,"crease":"lo","mat":"chrome","spec":{"anchor":[62,0,106],"home":[366.127,190.055],"box":[358.2,167.4,374,194.2],"hull":[358.738,171.567,358.801,171.085,358.99,170.611,359.3,170.153,359.728,169.72,360.265,169.318,360.902,168.954,361.629,168.636,362.433,168.367,363.299,168.154,364.215,167.998,365.163,167.904,366.127,167.872,367.092,167.904,368.04,167.998,368.955,168.154,369.822,168.367,370.626,168.636,371.352,168.954,371.99,169.318,372.527,169.72,372.954,170.153,373.265,170.611,373.453,171.085,373.517,171.567,373.517,190.055,373.453,190.538,373.265,191.012,372.954,191.469,372.527,191.903,371.99,192.304,371.352,192.668,370.626,192.986,369.822,193.255,368.955,193.469,368.04,193.624,367.092,193.718,366.127,193.75,365.163,193.718,364.215,193.624,363.299,193.469,362.433,193.255,361.629,192.986,360.902,192.668,360.265,192.304,359.728,191.903,359.3,191.469,358.99,191.012,358.801,190.538,358.738,190.055],"F":{"o":[62,0,0],"a":[0,0,1],"u":[1,0,0],"v":[0,1,0]}},"cloud":[62,0,106,68,0,106,67.796,1.553,106,67.543,2.296,106,66.76,3.653,106,66.243,4.243,106,65,5.196,106,64.296,5.543,106,62.783,5.949,106,62,6,106,60.447,5.796,106,59.704,5.543,106,58.347,4.76,106,57.757,4.243,106,56.804,3,106,56.457,2.296,106,56.051,0.783,106,56.051,-0.783,106,56.204,-1.553,106,56.804,-3,106,57.24,-3.653,106,58.347,-4.76,106,59,-5.196,106,60.447,-5.796,106,61.217,-5.949,106,62.783,-5.949,106,63.553,-5.796,106,65,-5.196,106,65.653,-4.76,106,66.76,-3.653,106,67.196,-3,106,67.796,-1.553,106,68,0,123.334,67.949,0.783,123.334,67.543,2.296,123.334,67.196,3,123.334,66.243,4.243,123.334,65.653,4.76,123.334,64.296,5.543,123.334,63.553,5.796,123.334,62,6,123.334,61.217,5.949,123.334,59.704,5.543,123.334,59,5.196,123.334,57.757,4.243,123.334,57.24,3.653,123.334,56.457,2.296,123.334,56.204,1.553,123.334,56,0,123.334,56.204,-1.553,123.334,56.457,-2.296,123.334,57.24,-3.653,123.334,57.757,-4.243,123.334,59,-5.196,123.334,59.704,-5.543,123.334,61.217,-5.949,123.334,62,-6,123.334,63.553,-5.796,123.334,64.296,-5.543,123.334,65.653,-4.76,123.334,66.243,-4.243,123.334,67.196,-3,123.334,67.543,-2.296,123.334,67.949,-0.783,123.334]},{"name":"embolo.ojo","kind":"prism","group":2,"layer":0,"crease":"lo","mat":"chrome","spec":{"up":1,"ring":[64.8,-3.4,65.366,-3.166,65.6,-2.6,65.6,2.6,65.366,3.166,64.8,3.4,59.2,3.4,58.634,3.166,58.4,2.6,58.4,-2.6,58.634,-3.166,59.2,-3.4],"z0":123.334,"z1":130.934,"bevel":0.4,"slots":{"bevel":3,"ribs":0}}},{"name":"mensula","kind":"prism","group":0,"layer":0,"tone":"mid","mat":"copper","spec":{"up":1,"ring":[49.4,-6.2,49.824,-6.024,50,-5.6,50,5.6,49.824,6.024,49.4,6.2,28.6,6.2,28.176,6.024,28,5.6,28,-5.6,28.176,-6.024,28.6,-6.2],"z0":132,"z1":142,"bevel":0.5,"slots":{"bevel":3,"ribs":0}}},{"name":"oreja.-","kind":"prism","group":0,"layer":0,"tone":"mid","mat":"copper","spec":{"up":0,"F":{"o":[0,-6.2,0],"a":[0,1,0],"u":[1,0,0],"v":[0,0,1]},"ring":[34,142,50,142,50,150,46,155,38,155,34,150],"s0":0,"s1":1.6,"bevel":0},"dots":[{"p":[42,-6.2,148],"n":[0,-1,0],"size":0.6,"tone":"mid","fade":[0.04,0.42]}]},{"name":"oreja.+","kind":"prism","group":0,"layer":0,"tone":"mid","mat":"copper","spec":{"up":0,"F":{"o":[0,4.6,0],"a":[0,1,0],"u":[1,0,0],"v":[0,0,1]},"ring":[34,142,50,142,50,150,46,155,38,155,34,150],"s0":0,"s1":1.6,"bevel":0},"dots":[{"p":[42,6.2,148],"n":[0,1,0],"size":0.6,"tone":"mid","fade":[0.04,0.42]}]},{"name":"palanca.nudillo-","kind":"round","group":3,"layer":0,"tone":"mid","mat":"steel","spec":{"F":{"o":[0,-4,0],"a":[0,-1,0],"u":[1,0,0],"v":[0,0,-1]},"s0":-0.6,"s1":0.6,"r0":5,"r1":5,"ends":["flat","flat"]}},{"name":"palanca.nudillo+","kind":"round","group":3,"layer":0,"tone":"mid","mat":"steel","spec":{"F":{"o":[0,4,0],"a":[0,1,0],"u":[1,0,0],"v":[0,0,1]},"s0":-0.6,"s1":0.6,"r0":5,"r1":5,"ends":["flat","flat"]}},{"name":"palanca.cuenca","kind":"prism","group":3,"layer":0,"crease":"lo","mat":"copper","spec":{"up":0,"F":{"o":[0,0,0],"a":[1,0,0],"u":[0,1,0],"v":[0,0,1]},"ring":[-3.4,-3.4,3.4,-3.4,3.4,3.4,-3.4,3.4],"s0":-5,"s1":46,"bevel":0.5,"slots":{"bevel":3,"ribs":0}}},{"name":"palanca.mango","kind":"round","group":3,"layer":0,"mat":"chrome","spec":{"F":{"o":[0,0,0],"a":[1,0,0],"u":[0,1,0],"v":[0,0,1]},"s0":46,"s1":86,"r0":2.8,"r1":2.8,"ends":["flat","flat"]}},{"name":"palanca.puno","kind":"round","group":3,"layer":0,"tone":"mid","mat":"rubber","spec":{"F":{"o":[0,0,0],"a":[1,0,0],"u":[0,1,0],"v":[0,0,1]},"s0":86,"s1":112,"r0":4.2,"r1":4.2,"ends":["flat","flat"],"slots":{"bevel":0,"ribs":15}},"details":{"ribs":{"s0":88,"s1":110,"count":40,"seams":true,"fade":[0.08,0.5],"tone":"lo"}}},{"name":"biela.-","kind":"prism","group":4,"layer":0,"tone":"mid","mat":"steel","spec":{"up":0,"F":{"o":[-62,-4.6,-148],"a":[0,1,0],"u":[1,0,0],"v":[0,0,1]},"ring":[59.6,135,64.4,135,64.4,149,59.6,149],"s0":0,"s1":1.2,"bevel":0},"dots":[{"p":[0,-4.6,0],"n":[0,-1,0],"size":0.55,"tone":"mid","fade":[0.04,0.42]},{"p":[0,-4.6,-12],"n":[0,-1,0],"size":0.55,"tone":"mid","fade":[0.04,0.42]}]},{"name":"biela.+","kind":"prism","group":4,"layer":0,"tone":"mid","mat":"steel","spec":{"up":0,"F":{"o":[-62,3.4,-148],"a":[0,1,0],"u":[1,0,0],"v":[0,0,1]},"ring":[59.6,135,64.4,135,64.4,149,59.6,149],"s0":0,"s1":1.2,"bevel":0},"dots":[{"p":[0,4.6,0],"n":[0,1,0],"size":0.55,"tone":"mid","fade":[0.04,0.42]},{"p":[0,4.6,-12],"n":[0,1,0],"size":0.55,"tone":"mid","fade":[0.04,0.42]}]},{"name":"descarga.perilla","kind":"round","group":0,"layer":0,"tone":"mid","mat":"brass","spec":{"F":{"o":[-102,0,16],"a":[-1,0,0],"u":[0,1,0],"v":[0,0,1]},"s0":0,"s1":9,"r0":6,"r1":6,"ends":["flat","flat"],"slots":{"bevel":0,"ribs":12}},"details":{"ribs":{"s0":1,"s1":8,"count":36,"seams":true,"fade":[0.08,0.5],"tone":"lo"}}},{"name":"manometro.tubo","kind":"fixed","group":0,"layer":0,"tone":"mid","mat":"brass","spec":{"anchor":[88,0,34],"home":[393.858,274.853],"box":[390.4,259,397.3,276.8],"hull":[390.902,260.988,390.928,260.795,391.003,260.606,391.127,260.422,391.298,260.249,391.513,260.088,391.768,259.943,392.059,259.816,392.38,259.708,392.727,259.623,393.093,259.561,393.472,259.523,393.858,259.51,394.244,259.523,394.623,259.561,394.989,259.623,395.336,259.708,395.657,259.816,395.948,259.943,396.203,260.088,396.418,260.249,396.589,260.422,396.713,260.606,396.789,260.795,396.814,260.988,396.814,274.853,396.789,275.046,396.713,275.236,396.589,275.419,396.418,275.592,396.203,275.753,395.948,275.898,395.657,276.026,395.336,276.133,394.989,276.219,394.623,276.281,394.244,276.319,393.858,276.331,393.472,276.319,393.093,276.281,392.727,276.219,392.38,276.133,392.059,276.026,391.768,275.898,391.513,275.753,391.298,275.592,391.127,275.419,391.003,275.236,390.928,275.046,390.902,274.853],"F":{"o":[88,0,0],"a":[0,0,1],"u":[1,0,0],"v":[0,1,0]}},"cloud":[88,0,34,90.4,0,34,90.318,0.621,34,90.217,0.918,34,89.904,1.461,34,89.697,1.697,34,89.2,2.079,34,88.918,2.217,34,88.313,2.38,34,88,2.4,34,87.379,2.318,34,87.082,2.217,34,86.539,1.904,34,86.303,1.697,34,85.922,1.2,34,85.783,0.918,34,85.621,0.313,34,85.621,-0.313,34,85.682,-0.621,34,85.922,-1.2,34,86.096,-1.461,34,86.539,-1.904,34,86.8,-2.078,34,87.379,-2.318,34,87.687,-2.379,34,88.313,-2.379,34,88.621,-2.318,34,89.2,-2.078,34,89.461,-1.904,34,89.904,-1.461,34,90.079,-1.2,34,90.318,-0.621,34,90.4,0,47,90.38,0.313,47,90.217,0.918,47,90.079,1.2,47,89.697,1.697,47,89.461,1.904,47,88.918,2.217,47,88.621,2.318,47,88,2.4,47,87.687,2.38,47,87.082,2.217,47,86.8,2.079,47,86.303,1.697,47,86.096,1.461,47,85.783,0.918,47,85.682,0.621,47,85.6,0,47,85.682,-0.621,47,85.783,-0.918,47,86.096,-1.461,47,86.303,-1.697,47,86.8,-2.078,47,87.082,-2.217,47,87.687,-2.379,47,88,-2.4,47,88.621,-2.318,47,88.918,-2.217,47,89.461,-1.904,47,89.697,-1.697,47,90.079,-1.2,47,90.217,-0.918,47,90.38,-0.313,47]},{"name":"manometro","kind":"round","group":0,"layer":0,"tone":"mid","mat":"steel","spec":{"F":{"o":[88,0,60],"a":[0,1,0],"u":[1,0,0],"v":[0,0,1]},"s0":-3,"s1":3,"r0":13,"r1":13,"ends":["flat","flat"]},"planes":[{"o":[88,3,60],"u":[-1,0,0],"v":[0,0,1],"n":[0,1,0],"fade":[0.04,0.3]}],"dots":[{"p":[88,3,60],"n":[0,1,0],"size":1,"tone":"mid","fade":[0.04,0.42]}]},{"name":"botella.tapon","kind":"round","group":0,"layer":0,"tone":"mid","mat":"rubber","spec":{"F":{"o":[4,41.569,110],"a":[0.5,0.866,0],"u":[0,0,1],"v":[0.866,-0.5,0]},"s0":0,"s1":3,"r0":4.5,"r1":4.5,"ends":["flat","flat"]}}],"routes":[],"planes":{"gato":"AAAAAYAAgAAAAAACgACAAAAAABSAAIAAAAAAFYAAgAAAAAAWgACAAAAAABeAAIAAAAAAGIAAgAAAAAAZgACAAAAAABqAAIAAAAAAG4AAgAAAAAAcgACAAAAAAB2AAIAAAAAAHoAAgAAAAAAwAACAAAAAADGAAIAAAAAAMoAAgAAAAAAzgACAAAABAAKAAIAAAAEAFP//gAAAAQAV//+AAAABABabG4AAAAEAF6uKgtoAAQAYqAqCnwABABmeYoSMAAEAGpp7gAAAAQAbmnuAAAABAByeYntzAAEAHaf4fWEAAQAeq4p9JQABADAAAF0XAAEAMtvwgAMAAgADgACAAAACAASAAIAAAAIABYAAgAAAAgAGgACAAAACAAeAAIAAAAIACIAAgAAAAgAJgACAAAACAAqAAIAAAAIAC4AAgAAAAgAMgACAAAACAA2AAIAAAAIADoAAgAAAAgAPgACAAAACABCAAIAAAAIAEYAAgAAAAgASgACAAAACABOAAIAAAAIAFP//gAAAAgAV//+AAAACABb/54ALAAIAF/gnh9cAAgAY+BCH8gACABnvZpCOAAIAGv/6gAcAAgAb//SADQACABzvc29+AAIAHfgNeAoAAgAe+Cd4KAACACb//4AAAAIAJ/gVeB4AAgAo+B2H2gACADAAAFjRAAIAMf//gAAAAgAy/+9/4QACADOu2dElAAMABIAAgAAAAwAFgACAAAADAAaAAIAAAAMAB4AAgAAAAwAIgACAAAADAAmAAIAAAAMACoAAgAAAAwALgACAAAADAAyAAIAAAAMADYAAgAAAAwAOgACAAAADAA+AAIAAAAMAEIAAgAAAAwARgACAAAADABKAAIAAAAMAE4AAgAAAAwAV///ergADABb//+B2AAMAF/wnxVgAAwAY/GnJYgADABn5l9VxAAMAGv//2dIAAwAb///Z0gADABz5lyqOAAMAHfxvNqAAAwAe/Cc6pwADACb/////AAMAJ/t+RKAAAwAo+3S7ZwADADL//9DmAAMAM/////8ABAAFWoLaggAEAAZMu8y6AAQAB0AAv/8ABAARWoIlfQAEABJqwxU8AAQAE3//AAAABAAm/////wAEACfgVzAsAAQAKPzawKUABQAGQAC//wAFAAczRbNEAAUACCV9pX0ABQASf/8AAAAFABOVPBU8AAUAF+yuM3IABQAY96E05wAFAB3gKSqGAAUAHug0MpIABQAm1qgRIAAFACe3Ax6QAAUAKMm5KPUABgAHJX2lfQAGAAgVPJU8AAYACQAAf/8ABgAKFTxqwwAGABOlfSV9AAYAFuI3JaoABgAX4BozaAAGABjmyDSAAAYAGeB3K28ABgAa3h8pRwAGABvZJCbbAAYAHNZZKaYABgAd1tAsWAAGAB7dLzK3AAYAJtScK2oABgAnyuA1HwAGACjM0jMpAAcACAAAgAAABwAJFTxqwwAHAAolfVqCAAcACzNFTLsABwAV6eU1XAAHABbp3jVuAAcAF+XIP0kABwAY5qM9OQAHABnnlzrsAAcAGue8OpIABwAb45w33AAHABzdhDYPAAcAHeHePCcABwAe5W9AIAAHACbbcjr+AAcAJ89oPdIABwAo2p5GjAAIAAklfVqCAAgACjNFTLsACAALQABAAAAIAAxMuzNFAAgAFepNOnoACAAW6ko6sgAIABfqmEa0AAgAGPDcSXMACAAZ7GRDUAAIABroaT/HAAgAG+RSPOkACAAc3rY60gAIAB3ipEAyAAgAHuScQrwACAAm3cdCRQAIACfTOkQZAAgAKN0kTDUACQAKQABAAAAJAAtMuzNFAAkADFqCJX0ACQANasMVPAAJABXsVz+IAAkAFuw1P8AACQAX7aBLxgAJABjzx07RAAkAGe+2SUoACQAa6wJFMgAJABvoBEMOAAkAHOJrQJEACQAd5f1FbgAJAB7nzUfAAAkAJuNqSoIACQAy8bo9LAAKAAtagiV9AAoADGrDFTwACgANgAAAAAAKAA6VPBU8AAoAFfHNReAACgAW8dJGQwAKABfzCVHaAAoAGPmLVWAACgAZ9ctQOQAKABrwB0tHAAoAG+4JSd0ACgAc6A1G3QAKAB3rV0tmAAoAHu0KTZUACgAm7GVURAAKADL1nkHRAAoAM+hazjQACwAMf/8AAAALAA2VPBU8AAsADqV9JX0ACwAPs0QzRQALABX4IUunAAsAFvghTBEACwAX+n1YpAALABj//6RwAAsAGf5RV+UACwAa9+FSaQALABv2EFEaAAsAHPBsTk0ACwAd8l1RzgALAB7z+1PuAAsAJvg+X1YACwAy+xFGgwALADPhgM4DAAwADaV9JX0ADAAOs0QzRQAMAA+//0AAAAwAEMy6TLsADAAV+CG0WAAMABb4IbPuAAwAF/P7rBEADAAY8l2uMQAMABnwbLGyAAwAGvYQruUADAAb9+GtlgAMABz+UagaAAwAHf//pHAADAAe+n2nWwAMACb4PqCpAAwAMvsRuXwADAAz2fvQ2QANAA6//0AAAA0AD8y6TLsADQAQ2oJaggANABHqw2rDAA0AFfHNuh8ADQAW8dK5vAANABftCrJqAA0AGOtXtJkADQAZ6A25IgANABruCbYiAA0AG/AHtLgADQAc9cuvxgANAB35i6qfAA0AHvMJriUADQAm7GWruwANADL1nr4uAA0AM9Kn1VMADgAP2oJaggAOABDqw2rDAA4AEf//f/8ADgAV7FfAdwAOABbsNcA/AA4AF+fNuD8ADgAY5f26kQAOABnia79uAA4AGugEvPEADgAb6wK6zQAOABzvtra1AA4AHfPHsS4ADgAe7aC0OQAOACbjarV9AA4AMvG6wtMADgAzyqPcZQAPABD//3//AA8AEerDlTwADwAS2oKlfQAPABXqTcWFAA8AFupKxU0ADwAX5Jy9QwAPABjipL/NAA8AGd62xS0ADwAa5FLDFgAPABvoacA4AA8AHOxkvK8ADwAd8Ny2jAAPAB7qmLlLAA8AJt3HvboADwAn3SSzygAPACjTOrvmAA8AM8BX6doAEAAR2oKlfQAQABLMurNEABAAE7//v/8AEAAV6eXKowAQABbp3sqRABAAF+Vvv98AEAAY4d7D2AAQABndhMnwABAAGuOcyCMAEAAb57zFbQAQABznl8UTABAAHeajwsYAEAAe5cjAtgAQACbbcsUBABAAJ9qeuXMAEAAoz2jCLQAQADO8NfKeABEAEr//v/8AEQATs0TMugARABbiN9pVABEAF90vzUgAEQAY1tDTpwARABnWWdZZABEAGtkk2SQAEQAb3h/WuAARABzgd9SQABEAHebIy38AEQAe4BrMlwARACbUl9SVABEAJ8zXzNcAEQAoyuDK4AARADO6W/tqABIAE6V92oIAEgAX6DTNbQASABjgKdV5ABIAHfehyxgAEgAe7K7MjQASACbWp+7ZABIAJ8m51woAEgAotwPhbwASADNA+fzEABMAJv////8AEwAn/OQ/WwATACjgV8/TABQAFYAAgAAAFAAx//+AAAAUADKqT3/+ABUAFoAAgAAAFQAXgACAAAAVABiAAIAAABUAGYAAgAAAFQAagACAAAAVABuAAIAAABUAHIAAgAAAFQAdgACAAAAVAB6AAIAAABUAJoAAgAAAFQAwAAB0gAAVADH//4AAABUAMv/tf/QAFQAzOmix9gAWABeAAIAAABYAGIAAgAAAFgAZgACAAAAWABqAAIAAABYAG4AAgAAAFgAcgACAAAAWAB2AAIAAABYAHoAAgAAAFgAmgACAAAAWADAAAFLCABcAGEAAv/8AFwAZJX2lfQAXABoAAIAAABcAGyV9WoIAFwAcQABAAAAXAB1agiV9ABcAHoAAAAAAFwAmOm+AAAAXACdSDGz3ABcAKEuKgAAAFwAwAlJT5QAYABkAAIAAABgAGiV9WoIAGAAbQABAAAAYABxagiV9ABgAHYAAAAAAGAAepX0lfQAYACZHHHtCABgAJ191YaAAGAAoVc1+lwAYADAC71KwABkAGkAAQAAAGQAbWoIlfQAZAByAAAAAABkAHaV9JX0AGQAev/9AAAAZACZsjGyOABkAMAS4T8UAGgAbf/8AAAAaABylfSV9ABoAHb//QAAAGgAe2oJaggAaACaAAIAAABoAMAAAUg0AGwAcv/9AAAAbAB3aglqCABsAHv//f/8AGwAmgACAAAAbADAAAFINABwAHf//gAAAHAAe2oKlfQAcACZsjZNxABwAMAS4sDoAHQAev/+//wAdACZHHIS9AB0AJ1XNgWgAHQAoX3WeXwAdADAC761PAB4AJjpvgAAAHgAnS4qAAAAeAChSDJMIAB4AMAJSrBoAHwAggACAAAAfACF//3//AB8AIoAAf/8AHwAjgAB//wAgACGAAIAAACAAIoAAf/8AIAAjgAB//wAhACKAAIAAACEAI4AAgAAAIgAjgACAAAAkACWAAIAAACYAJ4AAgAAAJgAogACAAAAmADM5/9wXACcAKIAA//8AJwAzOETeHgAoADMv5dmfACkAKoAA//8AKQArgAD//wApACz+JoHYACkALf//gAAAKgArgAAAAAAqACz+Jn4nACoALf//gAAAKwAs//+AAAArAC3//4AAACwALf//gAAALgAvgAD//wAxADKAAIAAADEAM0iinXwAMgAzRWuh0g=="},"framed":{"gato":"AAAAJAABgACAAAAAACUAAYAAgAAAAAArAAGAAIAAAAAALAABgACAAAAAAC0AAYAAgAAAAAAuAAGAAIAAAAAALwABgACAAAABACQAAYAAgAAAAQAlAAGAAIAAAAEAKwABnU+AAAABACwAAcRCf+QAAQAtAAHLdH/nAAIAHwABgACAAAACACAAAYAAgAAAAgAhAAGAAIAAAAIAIgABgACAAAACACQAAeSUf8sAAgAlAAH//4AAAAIAKQAB60xqpAACACoAAep0k+EAAgArAAH//4AAAAIALAAB//+AAAACAC0AAf//gAAAAgAuAAH//4AAAAIALwAB//+AAAADACAAAYAAgAAAAwAhAAGAAIAAAAMAIgABgACAAAADACMAAYAAgAAAAwAkAAH/zlZnAAMAJQAB/8JgIgADACkAAfk/Zf8AAwAqAAH54pl3AAMAKwAB//+dTwADACwAAf//gAAAAwAtAAH//4AAAAMALgAB+uhkwgADAC8AAftkmtcABAAfAAEVPGrDAAQAIAABN+px1AAEACEAAYAAgAAABAAiAAGAAIAAAAQAIwABgACAAAAEACQAAfRYMsoABAAlAAHymDqMAAQAKQAB4JMsvQAEACoAAfIyNOYABAArAAHvlUd8AAQALAAB//+AAAAEAC0AAf//gAAABAAuAAH//4AAAAQALwAB+gGF/gAFAB8AATNFTLsABQAgAAFJY1vfAAUAIQABgACAAAAFACIAAYAAgAAABQAjAAGAAIAAAAUAJAAB5SgwOwAFACUAAeIHNgYABQApAAHOhiqGAAUAKgAB1/MvoAAFACsAAdz9PvQABQAsAAHoj1PGAAUALQAB//+AAAAFAC4AAb//QAAABQAvAAHjMT15AAYAHwABTLszRQAGACAAAVtcSeYABgAhAAGAAIAAAAYAIgABgACAAAAGACMAAYAAgAAABgAkAAHevzLzAAYAJQAB25s35wAGACkAAcrqL9wABgAqAAHRejQNAAYAKwABv/9AAAAGACwAAdqCWoIABgAtAAHaglqCAAYALgABv/9AAAAGAC8AAb//QAAABwAfAAFqwxU8AAcAIAABcUE4fQAHACEAAYAAgAAABwAiAAGAAIAAAAcAIwABgACAAAAHACQAAd4qOGMABwAlAAHbcT0KAAcAKQABzdM30wAHACoAAdNIO7wABwArAAHXaEOuAAcALAAB2oJaggAHAC0AAdqCWoIABwAuAAHaglqCAAcALwAB2oJaggAIAB8AAZU8FTwACAAgAAGN1zfrAAgAIQABgACAAAAIACIAAYAAgAAACAAjAAGAAIAAAAgAJAAB4WI/NAAIACUAAd8sQ98ACAAqAAHZNkTKAAgAKwAB2/RKcAAIACwAAeQDVfQACAAtAAH//4AAAAgALgAB2v5F5AAIAC8AAd+dSXAACQAfAAGzRDNFAAkAIAABo/1JhAAJACEAAYAAgAAACQAiAAGAAIAAAAkAIwABgACAAAAJACQAAedRRtAACQAlAAHloEvBAAkAKwAB4zBSrAAJACwAAelXW+kACQAtAAH//4AAAAkALgAB4eBN6QAJAC8AAeaQUaQACgAfAAHMuky7AAoAIAABthZbnQAKACEAAYAAgAAACgAiAAGAAIAAAAoAIwABgACAAAAKACQAAe+DTwIACgAlAAHuYFSBAAoAKwAB7L9cOwAKACwAAfDbY24ACgAtAAH//4AAAAoALgAB6uZW7wAKAC8AAfAFWxkACwAfAAHqw2rDAAsAIAABx6NxtwALACEAAYAAgAAACwAiAAGAAIAAAAsAIwABgACAAAALACQAAfnsV74ACwAlAAH5eF4rAAsAKwAB+NRnUAALACwAAfoBegEACwAtAAH6AXoBAAsALgAB73ZvdwALAC8AAfoBegEADAAfAAHqw5U8AAwAIAABx5COZwAMACEAAYAAgAAADAAiAAGAAIAAAAwAIwABgACAAAAMACQAAfnjqEcADAAlAAH5eKHUAAwAKwAB+NSYrwAMACwAAfoBhf4ADAAtAAH6AYX+AAwALgAB+gGF/gAMAC8AAe92kIgADQAfAAHMurNEAA0AIAABtgqkeAANACEAAYAAgAAADQAiAAGAAIAAAA0AIwABgACAAAANACQAAe98sQIADQAlAAHuYKt+AA0AKwAB7L+jxAANACwAAfDbnJEADQAtAAH//4AAAA0ALgAB8AWk5gANAC8AAermqRAADgAfAAGzRMy6AA4AIAABo/W2jQAOACEAAYAAgAAADgAiAAGAAIAAAA4AIwABgACAAAAOACQAAedLuTMADgAlAAHloLQ+AA4AKwAB4zCtUwAOACwAAelXpBYADgAtAAH//4AAAA4ALgAB5pCuWwAOAC8AAeHgshYADwAfAAGVPOrDAA8AIAABjdPIIwAPACEAAYAAgAAADwAiAAGAAIAAAA8AIwABgACAAAAPACQAAeFbwM8ADwAlAAHfLLwgAA8AKQAB2Ta7NQAPACsAAdv0tY8ADwAsAAHkA6oLAA8ALQAB//9//wAPAC4AAd+dto8ADwAvAAHa/robABAAHwABasPqwwAQACAAAXFFx5EAEAAhAAGAAIAAABAAIgABgACAAAAQACMAAYAAgAAAEAAkAAHeIsegABAAJQAB23HC9QAQACkAAdNIxEMAEAAqAAHN08gsABAAKwAB12i8UQAQACwAAdqCpX0AEAAtAAHagqV9ABAALgAB2oKlfQAQAC8AAdqCpX0AEQAfAAFMu8y6ABEAIAABW2W2KwARACEAAYAAgAAAEQAiAAGAAIAAABEAIwABgACAAAARACQAAd62zRAAEQAlAAHbm8gYABEAKQAB0XrL8gARACoAAcrq0CMAEQArAAG//7//ABEALAAB2oKlfQARAC0AAdqCpX0AEQAuAAG//7//ABEALwABv/+//wASAB8AATNFs0QAEgAgAAFJcKQ2ABIAIQABgACAAAASACIAAYAAgAAAEgAjAAGAAIAAABIAJAAB5R3PyQASACUAAeIHyfkAEgApAAHX89BfABIAKgABzobVeQASACsAAdz9wQsAEgAsAAHoj6w5ABIALQAB//+AAAASAC4AAeMxwoYAEgAvAAG//7//ABMAHwABFTyVPAATACAAATf+jkoAEwAhAAE/M4zUABMAIgABgACAAAATACMAAYAAgAAAEwAkAAH0Sc07ABMAJQAB8pjFcwATACkAAfIyyxkAEwAqAAHgk9NCABMAKwAB75W4gwATACwAAf//gAAAEwAtAAH//4AAABMALgAB+gF6AQATAC8AAf//gAAAFAAsAAGkfn/0ABQALQABtDh/9gAVAB8AAUgBgAwAFQAkAAGAAIAAABUAJQABgACAAAAVACsAAYBuf+sAFQAsAAGvAn/yABUALQAB//+AAAAWAB8AATuAgA0AFgAlAAGAAIAAABYAKwABgPZ/1AAWACwAAcHRf+oAFgAtAAHS/H/wABYALgABgACAAAAWAC8AAYAAgAAAFwAfAAE2SnyqABcAJQABWf1wQQAXACsAAYAAgAAAFwAsAAG68HhcABcALQAB//+AAAAXAC4AAWO1ah4AFwAvAAF3uIAAABgAHwABOyR30AAYACUAAXBBWf0AGAArAAGdT4AAABgALAABu6twOAAYAC0AAf//gAAAGAAuAAFz01oBABgALwABd7iAAAAZAB8AAT5+d1oAGQAlAAGPvln9ABkAKwABnU+AAAAZACwAAcIAca4AGQAtAAH//4AAABkALgABir9ZiQAZAC8AAYAAgAAAGgAfAAE+XHwrABoAJQABpgJwQQAaACsAAZpfdPUAGgAsAAHKY3oRABoALQAB9IV0hgAaAC4AAZsPadkAGgAvAAGgcH7kABsAHwABPnmECwAbACUAAaYCj74AGwArAAGaX4sKABsALAABymOF7gAbAC0AAfSFi3kAGwAuAAGgcIEbABsALwABmw+WJgAcAB8AAT6YiNYAHAAlAAGPvqYCABwAKwABnU+AAAAcACwAAcIAjlEAHAAtAAH//4AAABwALgABgACAAAAcAC8AAYq/pnYAHQAfAAE7P4hdAB0AJQABcEGmAgAdACsAAZ1PgAAAHQAsAAG7q4/HAB0ALQAB//+AAAAdAC4AAXe4gAAAHQAvAAFz06X+AB4AHwABNmeDhQAeACUAAVn9j74AHgArAAGAAIAAAB4ALAABuvCHowAeAC0AAf//gAAAHgAuAAF3uIAAAB4ALwABY7WV4QAfACYAAf/XTPwAHwAnAAH4o1PeAB8AKAAB+PKr6gAfADMAAdd556cAIAAmAAH/9EDrACAAJwAB+dpGXgAgACgAAf//uOMAIQAnAAH6R0FUACEAKAAB+nG+lQAiACYAAf////8AIgAnAAH/////ACIAKAAB/////wAjACcAAf////8AIwAoAAH/////ACQAJgABAACAAAAkACcAAVE1czAAJAAoAAFRKoy0ACQAKQABTwp2DgAkACoAAU7+idUAJAArAAGYwIEEACQALAAB//+AAAAkAC0AAf//gAAAJAAwAAEAA08ZACQAMgAB//Ym3QAkADMAATHhvZAAJQAmAAEAAIAAACUAJwABJX1aggAlACgAASV9pX0AJQApAAEAAIAAACUAKgABAACAAAAlACwAAf//gAAAJQAtAAH//4AAACUAMAABAABLrQAlADMAASy/xDwAJgApAAGAAIAAACYAKgABgACAAAAmACwAAf//gAAAJgAtAAH//4AAACYALgAB97iAAAAmAC8AAfe4gAAAJwAqAAGAAP//ACcAKwABgAD//wAnACwAAf//gAAAJwAtAAH//4AAACcALgAB//+AAAAnAC8AAf//gAAAKAApAAGAAAAAACgAKwABgAAAAAAoACwAAf//gAAAKAAtAAH//4AAACgALgAB//+AAAAoAC8AAf//gAAAKQAuAAT//5xlACkALwAE4gyzswApADMAATEg2PQAKgAuAATiDExMACoALwAE//9jmgAqADMAASuY1jcAKwAwAAEAAEfUACsAMwABJ9rK4AAsAC4ABAAAotQALAAvAAQAAKLUACwAMAABAABPMwAsADEAAQAA4rAALAAyAAEAAOKwACwAMwABHky4aQAtAC4ABAXKccwALQAvAAQFyo4zAC0AMAABAABTegAtADEAAQAC1uIALQAyAAEAANEOAC0AMwABGc+vvQAuADAAAQG4t7kALgAzAAEsRco0AC8AMAABAbhIRgAvADMAAScExtQ="},"groupPairs":{"gato":[1,2,0,0.7394,-0.0018,-0.6733,1,3,0,0.8846,-0.002,-0.4663,1,4,0,0.8131,-0.0022,-0.5821]},"dynamic":{"gato":[3,31,22,36,23,36,24,36,25,36,26,36,27,36,28,36,29,36,30,36,36,46,36,47,37,43,37,46,37,47,38,43,39,41,40,42,43,46,43,47]},"free":{"gato":[]},"skip":{"gato":[]},"values":{"gato":0,"piston":0,"embolo":0,"palanca":0,"biela":0}};
const STAGE = "<div class=\"iso-stage iso-turn\" tabindex=\"0\" role=\"img\" aria-label=\"Gato hidráulico en 3D: arrastra para girarlo\" hidden><svg xmlns=\"http://www.w3.org/2000/svg\" class=\"iso-svg\" viewBox=\"0 0 600 470\" role=\"img\" aria-label=\"Gato hidráulico completo que gira sobre una mesa redonda.\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M346.5 208.7L346.7 207.7L347.5 206.8L348.6 206.1L350.2 205.5L352 205.1L353.9 205L355.8 205.1L357.6 205.5L359.1 206.1L360.3 206.8L361 207.7L361.3 208.7L361.3 211.9L361 212.8L360.3 213.7L359.1 214.5L357.6 215.1L355.8 215.5L353.9 215.6L352 215.5L350.2 215.1L348.6 214.5L347.5 213.7L346.7 212.8L346.5 211.9Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M360.3 213.7L359.1 214.5L359.1 211.3L360.3 210.5ZM359.1 214.5L357.6 215.1L357.6 211.9L359.1 211.3ZM361.3 211.9L361 212.8L361 209.6L361.3 208.7ZM361 212.8L360.3 213.7L360.3 210.5L361 209.6Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M357.6 215.1L355.8 215.5L355.8 212.3L357.6 211.9ZM355.8 215.5L353.9 215.6L353.9 212.4L355.8 212.3Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M353.9 215.6L352 215.5L352 212.3L353.9 212.4ZM352 215.5L350.2 215.1L350.2 211.9L352 212.3Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M350.2 215.1L348.6 214.5L348.6 211.3L350.2 211.9ZM348.6 214.5L347.5 213.7L347.5 210.5L348.6 211.3ZM347.5 213.7L346.7 212.8L346.7 209.6L347.5 210.5ZM346.7 212.8L346.5 211.9L346.5 208.7L346.7 209.6Z\"/><path class=\"iso-top\" d=\"M360.3 210.5L359.1 211.3L357.6 211.9L355.8 212.3L353.9 212.4L352 212.3L350.2 211.9L348.6 211.3L347.5 210.5L346.7 209.6L346.5 208.7L346.7 207.7L347.5 206.8L348.6 206.1L350.2 205.5L352 205.1L353.9 205L355.8 205.1L357.6 205.5L359.1 206.1L360.3 206.8L361 207.7L361.3 208.7L361 209.6Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M361.3 208.7L361 209.6L360.3 210.5L359.1 211.3L357.6 211.9L355.8 212.3L353.9 212.4L352 212.3L350.2 211.9L348.6 211.3L347.5 210.5L346.7 209.6L346.5 208.7\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M346.5 208.7L346.7 207.7L347.5 206.8L348.6 206.1L350.2 205.5L352 205.1L353.9 205L355.8 205.1L357.6 205.5L359.1 206.1L360.3 206.8L361 207.7L361.3 208.7M361.3 211.9L361 212.8L360.3 213.7L359.1 214.5L357.6 215.1L355.8 215.5L353.9 215.6L352 215.5L350.2 215.1L348.6 214.5L347.5 213.7L346.7 212.8L346.5 211.9M346.5 208.7L346.5 211.9M361.3 208.7L361.3 211.9\"/></g><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M168.7 228.9L169 227.9L169.7 227.1L170.9 226.3L172.4 225.7L174.2 225.3L176.1 225.2L178 225.3L179.8 225.7L181.4 226.3L182.5 227.1L183.3 227.9L183.5 228.9L183.5 232.1L183.3 233.1L182.5 233.9L181.4 234.7L179.8 235.3L178 235.7L176.1 235.8L174.2 235.7L172.4 235.3L170.9 234.7L169.7 233.9L169 233.1L168.7 232.1Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M182.5 233.9L181.4 234.7L181.4 231.5L182.5 230.7ZM181.4 234.7L179.8 235.3L179.8 232.1L181.4 231.5ZM183.5 232.1L183.3 233.1L183.3 229.9L183.5 228.9ZM183.3 233.1L182.5 233.9L182.5 230.7L183.3 229.9Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M179.8 235.3L178 235.7L178 232.5L179.8 232.1ZM178 235.7L176.1 235.8L176.1 232.6L178 232.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M176.1 235.8L174.2 235.7L174.2 232.5L176.1 232.6ZM174.2 235.7L172.4 235.3L172.4 232.1L174.2 232.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M172.4 235.3L170.9 234.7L170.9 231.5L172.4 232.1ZM170.9 234.7L169.7 233.9L169.7 230.7L170.9 231.5ZM169.7 233.9L169 233.1L169 229.9L169.7 230.7ZM169 233.1L168.7 232.1L168.7 228.9L169 229.9Z\"/><path class=\"iso-top\" d=\"M182.5 230.7L181.4 231.5L179.8 232.1L178 232.5L176.1 232.6L174.2 232.5L172.4 232.1L170.9 231.5L169.7 230.7L169 229.9L168.7 228.9L169 227.9L169.7 227.1L170.9 226.3L172.4 225.7L174.2 225.3L176.1 225.2L178 225.3L179.8 225.7L181.4 226.3L182.5 227.1L183.3 227.9L183.5 228.9L183.3 229.9Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M183.5 228.9L183.3 229.9L182.5 230.7L181.4 231.5L179.8 232.1L178 232.5L176.1 232.6L174.2 232.5L172.4 232.1L170.9 231.5L169.7 230.7L169 229.9L168.7 228.9\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M168.7 228.9L169 227.9L169.7 227.1L170.9 226.3L172.4 225.7L174.2 225.3L176.1 225.2L178 225.3L179.8 225.7L181.4 226.3L182.5 227.1L183.3 227.9L183.5 228.9M183.5 232.1L183.3 233.1L182.5 233.9L181.4 234.7L179.8 235.3L178 235.7L176.1 235.8L174.2 235.7L172.4 235.3L170.9 234.7L169.7 233.9L169 233.1L168.7 232.1M168.7 228.9L168.7 232.1M183.5 228.9L183.5 232.1\"/></g><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M470.3 275.5L470.6 274.6L471.3 273.7L472.5 272.9L474 272.3L475.8 272L477.7 271.9L479.6 272L481.4 272.3L483 272.9L484.1 273.7L484.9 274.6L485.1 275.5L485.1 278.7L484.9 279.7L484.1 280.6L483 281.4L481.4 281.9L479.6 282.3L477.7 282.4L475.8 282.3L474 281.9L472.5 281.4L471.3 280.6L470.6 279.7L470.3 278.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M484.1 280.6L483 281.4L483 278.2L484.1 277.4ZM483 281.4L481.4 281.9L481.4 278.7L483 278.2ZM485.1 278.7L484.9 279.7L484.9 276.5L485.1 275.5ZM484.9 279.7L484.1 280.6L484.1 277.4L484.9 276.5Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M481.4 281.9L479.6 282.3L479.6 279.1L481.4 278.7ZM479.6 282.3L477.7 282.4L477.7 279.2L479.6 279.1Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M477.7 282.4L475.8 282.3L475.8 279.1L477.7 279.2ZM475.8 282.3L474 281.9L474 278.7L475.8 279.1Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M474 281.9L472.5 281.4L472.5 278.2L474 278.7ZM472.5 281.4L471.3 280.6L471.3 277.4L472.5 278.2ZM471.3 280.6L470.6 279.7L470.6 276.5L471.3 277.4ZM470.6 279.7L470.3 278.7L470.3 275.5L470.6 276.5Z\"/><path class=\"iso-top\" d=\"M484.1 277.4L483 278.2L481.4 278.7L479.6 279.1L477.7 279.2L475.8 279.1L474 278.7L472.5 278.2L471.3 277.4L470.6 276.5L470.3 275.5L470.6 274.6L471.3 273.7L472.5 272.9L474 272.3L475.8 272L477.7 271.9L479.6 272L481.4 272.3L483 272.9L484.1 273.7L484.9 274.6L485.1 275.5L484.9 276.5Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M485.1 275.5L484.9 276.5L484.1 277.4L483 278.2L481.4 278.7L479.6 279.1L477.7 279.2L475.8 279.1L474 278.7L472.5 278.2L471.3 277.4L470.6 276.5L470.3 275.5\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M470.3 275.5L470.6 274.6L471.3 273.7L472.5 272.9L474 272.3L475.8 272L477.7 271.9L479.6 272L481.4 272.3L483 272.9L484.1 273.7L484.9 274.6L485.1 275.5M485.1 278.7L484.9 279.7L484.1 280.6L483 281.4L481.4 281.9L479.6 282.3L477.7 282.4L475.8 282.3L474 281.9L472.5 281.4L471.3 280.6L470.6 279.7L470.3 278.7M470.3 275.5L470.3 278.7M485.1 275.5L485.1 278.7\"/></g><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M114.9 316L115.1 315L115.9 314.1L117 313.4L118.6 312.8L120.4 312.4L122.3 312.3L124.2 312.4L126 312.8L127.5 313.4L128.7 314.1L129.4 315L129.7 316L129.7 319.2L129.4 320.1L128.7 321L127.5 321.8L126 322.4L124.2 322.7L122.3 322.9L120.4 322.7L118.6 322.4L117 321.8L115.9 321L115.1 320.1L114.9 319.2Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M128.7 321L127.5 321.8L127.5 318.6L128.7 317.8ZM127.5 321.8L126 322.4L126 319.2L127.5 318.6ZM129.7 319.2L129.4 320.1L129.4 316.9L129.7 316ZM129.4 320.1L128.7 321L128.7 317.8L129.4 316.9Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M126 322.4L124.2 322.7L124.2 319.5L126 319.2ZM124.2 322.7L122.3 322.9L122.3 319.7L124.2 319.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M122.3 322.9L120.4 322.7L120.4 319.5L122.3 319.7ZM120.4 322.7L118.6 322.4L118.6 319.2L120.4 319.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M118.6 322.4L117 321.8L117 318.6L118.6 319.2ZM117 321.8L115.9 321L115.9 317.8L117 318.6ZM115.9 321L115.1 320.1L115.1 316.9L115.9 317.8ZM115.1 320.1L114.9 319.2L114.9 316L115.1 316.9Z\"/><path class=\"iso-top\" d=\"M128.7 317.8L127.5 318.6L126 319.2L124.2 319.5L122.3 319.7L120.4 319.5L118.6 319.2L117 318.6L115.9 317.8L115.1 316.9L114.9 316L115.1 315L115.9 314.1L117 313.4L118.6 312.8L120.4 312.4L122.3 312.3L124.2 312.4L126 312.8L127.5 313.4L128.7 314.1L129.4 315L129.7 316L129.4 316.9Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M129.7 316L129.4 316.9L128.7 317.8L127.5 318.6L126 319.2L124.2 319.5L122.3 319.7L120.4 319.5L118.6 319.2L117 318.6L115.9 317.8L115.1 316.9L114.9 316\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M114.9 316L115.1 315L115.9 314.1L117 313.4L118.6 312.8L120.4 312.4L122.3 312.3L124.2 312.4L126 312.8L127.5 313.4L128.7 314.1L129.4 315L129.7 316M129.7 319.2L129.4 320.1L128.7 321L127.5 321.8L126 322.4L124.2 322.7L122.3 322.9L120.4 322.7L118.6 322.4L117 321.8L115.9 321L115.1 320.1L114.9 319.2M114.9 316L114.9 319.2M129.7 316L129.7 319.2\"/></g><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M416.5 362.6L416.7 361.7L417.5 360.8L418.6 360L420.2 359.4L422 359L423.9 358.9L425.8 359L427.6 359.4L429.1 360L430.3 360.8L431 361.7L431.3 362.6L431.3 365.8L431 366.8L430.3 367.7L429.1 368.4L427.6 369L425.8 369.4L423.9 369.5L422 369.4L420.2 369L418.6 368.4L417.5 367.7L416.7 366.8L416.5 365.8Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M430.3 367.7L429.1 368.4L429.1 365.2L430.3 364.5ZM429.1 368.4L427.6 369L427.6 365.8L429.1 365.2ZM431.3 365.8L431 366.8L431 363.6L431.3 362.6ZM431 366.8L430.3 367.7L430.3 364.5L431 363.6Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M427.6 369L425.8 369.4L425.8 366.2L427.6 365.8ZM425.8 369.4L423.9 369.5L423.9 366.3L425.8 366.2Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M423.9 369.5L422 369.4L422 366.2L423.9 366.3ZM422 369.4L420.2 369L420.2 365.8L422 366.2Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M420.2 369L418.6 368.4L418.6 365.2L420.2 365.8ZM418.6 368.4L417.5 367.7L417.5 364.5L418.6 365.2ZM417.5 367.7L416.7 366.8L416.7 363.6L417.5 364.5ZM416.7 366.8L416.5 365.8L416.5 362.6L416.7 363.6Z\"/><path class=\"iso-top\" d=\"M430.3 364.5L429.1 365.2L427.6 365.8L425.8 366.2L423.9 366.3L422 366.2L420.2 365.8L418.6 365.2L417.5 364.5L416.7 363.6L416.5 362.6L416.7 361.7L417.5 360.8L418.6 360L420.2 359.4L422 359L423.9 358.9L425.8 359L427.6 359.4L429.1 360L430.3 360.8L431 361.7L431.3 362.6L431 363.6Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M431.3 362.6L431 363.6L430.3 364.5L429.1 365.2L427.6 365.8L425.8 366.2L423.9 366.3L422 366.2L420.2 365.8L418.6 365.2L417.5 364.5L416.7 363.6L416.5 362.6\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M416.5 362.6L416.7 361.7L417.5 360.8L418.6 360L420.2 359.4L422 359L423.9 358.9L425.8 359L427.6 359.4L429.1 360L430.3 360.8L431 361.7L431.3 362.6M431.3 365.8L431 366.8L430.3 367.7L429.1 368.4L427.6 369L425.8 369.4L423.9 369.5L422 369.4L420.2 369L418.6 368.4L417.5 367.7L416.7 366.8L416.5 365.8M416.5 362.6L416.5 365.8M431.3 362.6L431.3 365.8\"/></g><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M238.7 382.8L239 381.9L239.7 381L240.9 380.2L242.4 379.6L244.2 379.3L246.1 379.1L248 379.3L249.8 379.6L251.4 380.2L252.5 381L253.3 381.9L253.5 382.8L253.5 386L253.3 387L252.5 387.9L251.4 388.6L249.8 389.2L248 389.6L246.1 389.7L244.2 389.6L242.4 389.2L240.9 388.6L239.7 387.9L239 387L238.7 386Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M252.5 387.9L251.4 388.6L251.4 385.4L252.5 384.7ZM251.4 388.6L249.8 389.2L249.8 386L251.4 385.4ZM253.5 386L253.3 387L253.3 383.8L253.5 382.8ZM253.3 387L252.5 387.9L252.5 384.7L253.3 383.8Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M249.8 389.2L248 389.6L248 386.4L249.8 386ZM248 389.6L246.1 389.7L246.1 386.5L248 386.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M246.1 389.7L244.2 389.6L244.2 386.4L246.1 386.5ZM244.2 389.6L242.4 389.2L242.4 386L244.2 386.4Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M242.4 389.2L240.9 388.6L240.9 385.4L242.4 386ZM240.9 388.6L239.7 387.9L239.7 384.7L240.9 385.4ZM239.7 387.9L239 387L239 383.8L239.7 384.7ZM239 387L238.7 386L238.7 382.8L239 383.8Z\"/><path class=\"iso-top\" d=\"M252.5 384.7L251.4 385.4L249.8 386L248 386.4L246.1 386.5L244.2 386.4L242.4 386L240.9 385.4L239.7 384.7L239 383.8L238.7 382.8L239 381.9L239.7 381L240.9 380.2L242.4 379.6L244.2 379.3L246.1 379.1L248 379.3L249.8 379.6L251.4 380.2L252.5 381L253.3 381.9L253.5 382.8L253.3 383.8Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M253.5 382.8L253.3 383.8L252.5 384.7L251.4 385.4L249.8 386L248 386.4L246.1 386.5L244.2 386.4L242.4 386L240.9 385.4L239.7 384.7L239 383.8L238.7 382.8\"/><path class=\"iso-line iso-edge\" data-tone=\"lo\" d=\"M238.7 382.8L239 381.9L239.7 381L240.9 380.2L242.4 379.6L244.2 379.3L246.1 379.1L248 379.3L249.8 379.6L251.4 380.2L252.5 381L253.3 381.9L253.5 382.8M253.5 386L253.3 387L252.5 387.9L251.4 388.6L249.8 389.2L248 389.6L246.1 389.7L244.2 389.6L242.4 389.2L240.9 388.6L239.7 387.9L239 387L238.7 386M238.7 382.8L238.7 386M253.5 382.8L253.5 386\"/></g><path class=\"iso-halo\" d=\"M93.1 287.2L93.4 281.8L94.2 276.4L95.6 271L97.6 265.7L100.1 260.4L103.2 255.3L106.8 250.1L111 245.1L115.6 240.3L120.8 235.5L126.5 230.9L132.6 226.4L139.2 222.1L146.2 218L153.7 214.1L161.6 210.3L169.8 206.8L178.4 203.5L187.3 200.5L196.5 197.6L206.1 195L215.8 192.7L225.9 190.6L236.1 188.8L246.4 187.3L257 186L267.6 185L278.4 184.3L289.2 183.9L300 183.8L310.8 183.9L321.6 184.3L332.4 185L343 186L353.6 187.3L363.9 188.8L374.1 190.6L384.2 192.7L393.9 195L403.5 197.6L412.7 200.5L421.6 203.5L430.2 206.8L438.4 210.3L446.3 214.1L453.8 218L460.8 222.1L467.4 226.4L473.5 230.9L479.2 235.5L484.4 240.3L489 245.1L493.2 250.1L496.8 255.3L499.9 260.4L502.4 265.7L504.4 271L505.8 276.4L506.6 281.8L506.9 287.2L506.9 299L506.6 304.4L505.8 309.8L504.4 315.1L502.4 320.5L499.9 325.7L496.8 330.9L493.2 336L489 341L484.4 345.9L479.2 350.7L473.5 355.3L467.4 359.8L460.8 364.1L453.8 368.2L446.3 372.1L438.4 375.8L430.2 379.4L421.6 382.6L412.7 385.7L403.5 388.5L393.9 391.1L384.2 393.5L374.1 395.5L363.9 397.3L353.6 398.9L343 400.1L332.4 401.1L321.6 401.8L310.8 402.3L300 402.4L289.2 402.3L278.4 401.8L267.6 401.1L257 400.1L246.4 398.9L236.1 397.3L225.9 395.5L215.8 393.5L206.1 391.1L196.5 388.5L187.3 385.7L178.4 382.6L169.8 379.4L161.6 375.8L153.7 372.1L146.2 368.2L139.2 364.1L132.6 359.8L126.5 355.3L120.8 350.7L115.6 345.9L111 341L106.8 336L103.2 330.9L100.1 325.7L97.6 320.5L95.6 315.1L94.2 309.8L93.4 304.4L93.1 299Z\"/><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M93.1 282.7L93.4 278.6L94 274.6L94.9 270.5L96.1 266.5L97.6 262.5L99.5 258.6L101.6 254.6L104.1 250.8L106.8 246.9L109.9 243.2L113.3 239.5L116.9 235.9L120.8 232.3L125 228.8L129.5 225.4L134.2 222.1L139.2 218.9L144.4 215.8L149.9 212.8L155.6 209.9L161.6 207.1L167.7 204.5L174 201.9L180.6 199.5L187.3 197.3L194.2 195.1L201.3 193.1L208.5 191.2L215.8 189.5L223.3 187.9L230.9 186.5L238.6 185.2L246.4 184.1L254.3 183.1L262.3 182.3L270.3 181.6L278.4 181.1L286.5 180.8L294.6 180.6L302.7 180.6L310.8 180.7L318.9 181L327 181.5L335 182.1L343 182.8L350.9 183.8L358.8 184.8L366.5 186.1L374.1 187.4L381.7 189L389.1 190.6L396.3 192.5L403.5 194.4L410.4 196.5L417.2 198.8L423.8 201.1L430.2 203.6L436.4 206.2L442.4 209L448.2 211.8L453.8 214.8L459.1 217.9L464.1 221L469 224.3L473.5 227.7L477.8 231.1L481.8 234.7L485.6 238.3L489 241.9L492.2 245.7L495 249.5L497.6 253.3L499.9 257.2L501.8 261.2L503.4 265.2L504.8 269.2L505.8 273.2L506.5 277.3L506.8 281.3L506.9 285.4L506.9 297.1L506.6 301.2L506 305.2L505.1 309.3L503.9 313.3L502.4 317.3L500.5 321.2L498.4 325.1L495.9 329L493.2 332.8L490.1 336.6L486.7 340.3L483.1 343.9L479.2 347.5L475 351L470.5 354.4L465.8 357.7L460.8 360.9L455.6 364L450.1 367L444.4 369.9L438.4 372.6L432.3 375.3L426 377.8L419.4 380.2L412.7 382.5L405.8 384.7L398.7 386.7L391.5 388.5L384.2 390.3L376.7 391.8L369.1 393.3L361.4 394.6L353.6 395.7L345.7 396.7L337.7 397.5L329.7 398.1L321.6 398.6L313.5 399L305.4 399.2L297.3 399.2L289.2 399.1L281.1 398.8L273 398.3L265 397.7L257 396.9L249.1 396L241.2 394.9L233.5 393.7L225.9 392.3L218.3 390.8L210.9 389.1L203.7 387.3L196.5 385.3L189.6 383.2L182.8 381L176.2 378.6L169.8 376.2L163.6 373.5L157.6 370.8L151.8 367.9L146.2 365L140.9 361.9L135.9 358.7L131 355.5L126.5 352.1L122.2 348.6L118.2 345.1L114.4 341.5L111 337.8L107.8 334.1L105 330.3L102.4 326.4L100.1 322.5L98.2 318.6L96.6 314.6L95.2 310.6L94.2 306.6L93.5 302.5L93.2 298.5L93.1 294.4Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M479.2 347.5L475 351L475 339.2L479.2 335.7ZM475 351L470.5 354.4L470.5 342.6L475 339.2ZM470.5 354.4L465.8 357.7L465.8 345.9L470.5 342.6ZM465.8 357.7L460.8 360.9L460.8 349.1L465.8 345.9ZM460.8 360.9L455.6 364L455.6 352.2L460.8 349.1ZM455.6 364L450.1 367L450.1 355.2L455.6 352.2ZM450.1 367L444.4 369.9L444.4 358.1L450.1 355.2ZM444.4 369.9L438.4 372.6L438.4 360.9L444.4 358.1ZM438.4 372.6L432.3 375.3L432.3 363.6L438.4 360.9ZM432.3 375.3L426 377.8L426 366.1L432.3 363.6ZM426 377.8L419.4 380.2L419.4 368.5L426 366.1ZM419.4 380.2L412.7 382.5L412.7 370.8L419.4 368.5ZM412.7 382.5L405.8 384.7L405.8 372.9L412.7 370.8ZM506.9 297.1L506.6 301.2L506.6 289.4L506.9 285.4ZM506.6 301.2L506 305.2L506 293.5L506.6 289.4ZM506 305.2L505.1 309.3L505.1 297.5L506 293.5ZM505.1 309.3L503.9 313.3L503.9 301.5L505.1 297.5ZM503.9 313.3L502.4 317.3L502.4 305.5L503.9 301.5ZM502.4 317.3L500.5 321.2L500.5 309.5L502.4 305.5ZM500.5 321.2L498.4 325.1L498.4 313.4L500.5 309.5ZM498.4 325.1L495.9 329L495.9 317.3L498.4 313.4ZM495.9 329L493.2 332.8L493.2 321.1L495.9 317.3ZM493.2 332.8L490.1 336.6L490.1 324.9L493.2 321.1ZM490.1 336.6L486.7 340.3L486.7 328.6L490.1 324.9ZM486.7 340.3L483.1 343.9L483.1 332.2L486.7 328.6ZM483.1 343.9L479.2 347.5L479.2 335.7L483.1 332.2Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M405.8 384.7L398.7 386.7L398.7 374.9L405.8 372.9ZM398.7 386.7L391.5 388.5L391.5 376.8L398.7 374.9ZM391.5 388.5L384.2 390.3L384.2 378.5L391.5 376.8ZM384.2 390.3L376.7 391.8L376.7 380.1L384.2 378.5ZM376.7 391.8L369.1 393.3L369.1 381.5L376.7 380.1ZM369.1 393.3L361.4 394.6L361.4 382.8L369.1 381.5ZM361.4 394.6L353.6 395.7L353.6 383.9L361.4 382.8ZM353.6 395.7L345.7 396.7L345.7 384.9L353.6 383.9ZM345.7 396.7L337.7 397.5L337.7 385.7L345.7 384.9ZM337.7 397.5L329.7 398.1L329.7 386.4L337.7 385.7ZM329.7 398.1L321.6 398.6L321.6 386.9L329.7 386.4ZM321.6 398.6L313.5 399L313.5 387.3L321.6 386.9ZM313.5 399L305.4 399.2L305.4 387.4L313.5 387.3ZM305.4 399.2L297.3 399.2L297.3 387.5L305.4 387.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M297.3 399.2L289.2 399.1L289.2 387.3L297.3 387.5ZM289.2 399.1L281.1 398.8L281.1 387L289.2 387.3ZM281.1 398.8L273 398.3L273 386.6L281.1 387ZM273 398.3L265 397.7L265 386L273 386.6ZM265 397.7L257 396.9L257 385.2L265 386ZM257 396.9L249.1 396L249.1 384.3L257 385.2ZM249.1 396L241.2 394.9L241.2 383.2L249.1 384.3ZM241.2 394.9L233.5 393.7L233.5 382L241.2 383.2ZM233.5 393.7L225.9 392.3L225.9 380.6L233.5 382ZM225.9 392.3L218.3 390.8L218.3 379.1L225.9 380.6ZM218.3 390.8L210.9 389.1L210.9 377.4L218.3 379.1ZM210.9 389.1L203.7 387.3L203.7 375.6L210.9 377.4ZM203.7 387.3L196.5 385.3L196.5 373.6L203.7 375.6Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M196.5 385.3L189.6 383.2L189.6 371.5L196.5 373.6ZM189.6 383.2L182.8 381L182.8 369.3L189.6 371.5ZM182.8 381L176.2 378.6L176.2 366.9L182.8 369.3ZM176.2 378.6L169.8 376.2L169.8 364.4L176.2 366.9ZM169.8 376.2L163.6 373.5L163.6 361.8L169.8 364.4ZM163.6 373.5L157.6 370.8L157.6 359.1L163.6 361.8ZM157.6 370.8L151.8 367.9L151.8 356.2L157.6 359.1ZM151.8 367.9L146.2 365L146.2 353.2L151.8 356.2ZM146.2 365L140.9 361.9L140.9 350.2L146.2 353.2ZM140.9 361.9L135.9 358.7L135.9 347L140.9 350.2ZM135.9 358.7L131 355.5L131 343.7L135.9 347ZM131 355.5L126.5 352.1L126.5 340.4L131 343.7ZM126.5 352.1L122.2 348.6L122.2 336.9L126.5 340.4ZM122.2 348.6L118.2 345.1L118.2 333.4L122.2 336.9ZM118.2 345.1L114.4 341.5L114.4 329.8L118.2 333.4ZM114.4 341.5L111 337.8L111 326.1L114.4 329.8ZM111 337.8L107.8 334.1L107.8 322.4L111 326.1ZM107.8 334.1L105 330.3L105 318.6L107.8 322.4ZM105 330.3L102.4 326.4L102.4 314.7L105 318.6ZM102.4 326.4L100.1 322.5L100.1 310.8L102.4 314.7ZM100.1 322.5L98.2 318.6L98.2 306.9L100.1 310.8ZM98.2 318.6L96.6 314.6L96.6 302.9L98.2 306.9ZM96.6 314.6L95.2 310.6L95.2 298.9L96.6 302.9ZM95.2 310.6L94.2 306.6L94.2 294.8L95.2 298.9ZM94.2 306.6L93.5 302.5L93.5 290.8L94.2 294.8ZM93.5 302.5L93.2 298.5L93.2 286.7L93.5 290.8ZM93.2 298.5L93.1 294.4L93.1 282.7L93.2 286.7Z\"/><path class=\"iso-top\" d=\"M479.2 335.7L475 339.2L470.5 342.6L465.8 345.9L460.8 349.1L455.6 352.2L450.1 355.2L444.4 358.1L438.4 360.9L432.3 363.6L426 366.1L419.4 368.5L412.7 370.8L405.8 372.9L398.7 374.9L391.5 376.8L384.2 378.5L376.7 380.1L369.1 381.5L361.4 382.8L353.6 383.9L345.7 384.9L337.7 385.7L329.7 386.4L321.6 386.9L313.5 387.3L305.4 387.4L297.3 387.5L289.2 387.3L281.1 387L273 386.6L265 386L257 385.2L249.1 384.3L241.2 383.2L233.5 382L225.9 380.6L218.3 379.1L210.9 377.4L203.7 375.6L196.5 373.6L189.6 371.5L182.8 369.3L176.2 366.9L169.8 364.4L163.6 361.8L157.6 359.1L151.8 356.2L146.2 353.2L140.9 350.2L135.9 347L131 343.7L126.5 340.4L122.2 336.9L118.2 333.4L114.4 329.8L111 326.1L107.8 322.4L105 318.6L102.4 314.7L100.1 310.8L98.2 306.9L96.6 302.9L95.2 298.9L94.2 294.8L93.5 290.8L93.2 286.7L93.1 282.7L93.4 278.6L94 274.6L94.9 270.5L96.1 266.5L97.6 262.5L99.5 258.6L101.6 254.6L104.1 250.8L106.8 246.9L109.9 243.2L113.3 239.5L116.9 235.9L120.8 232.3L125 228.8L129.5 225.4L134.2 222.1L139.2 218.9L144.4 215.8L149.9 212.8L155.6 209.9L161.6 207.1L167.7 204.5L174 201.9L180.6 199.5L187.3 197.3L194.2 195.1L201.3 193.1L208.5 191.2L215.8 189.5L223.3 187.9L230.9 186.5L238.6 185.2L246.4 184.1L254.3 183.1L262.3 182.3L270.3 181.6L278.4 181.1L286.5 180.8L294.6 180.6L302.7 180.6L310.8 180.7L318.9 181L327 181.5L335 182.1L343 182.8L350.9 183.8L358.8 184.8L366.5 186.1L374.1 187.4L381.7 189L389.1 190.6L396.3 192.5L403.5 194.4L410.4 196.5L417.2 198.8L423.8 201.1L430.2 203.6L436.4 206.2L442.4 209L448.2 211.8L453.8 214.8L459.1 217.9L464.1 221L469 224.3L473.5 227.7L477.8 231.1L481.8 234.7L485.6 238.3L489 241.9L492.2 245.7L495 249.5L497.6 253.3L499.9 257.2L501.8 261.2L503.4 265.2L504.8 269.2L505.8 273.2L506.5 277.3L506.8 281.3L506.9 285.4L506.6 289.4L506 293.5L505.1 297.5L503.9 301.5L502.4 305.5L500.5 309.5L498.4 313.4L495.9 317.3L493.2 321.1L490.1 324.9L486.7 328.6L483.1 332.2Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M506.9 285.4L506.6 289.4L506 293.5L505.1 297.5L503.9 301.5L502.4 305.5L500.5 309.5L498.4 313.4L495.9 317.3L493.2 321.1L490.1 324.9L486.7 328.6L483.1 332.2L479.2 335.7L475 339.2L470.5 342.6L465.8 345.9L460.8 349.1L455.6 352.2L450.1 355.2L444.4 358.1L438.4 360.9L432.3 363.6L426 366.1L419.4 368.5L412.7 370.8L405.8 372.9L398.7 374.9L391.5 376.8L384.2 378.5L376.7 380.1L369.1 381.5L361.4 382.8L353.6 383.9L345.7 384.9L337.7 385.7L329.7 386.4L321.6 386.9L313.5 387.3L305.4 387.4L297.3 387.5L289.2 387.3L281.1 387L273 386.6L265 386L257 385.2L249.1 384.3L241.2 383.2L233.5 382L225.9 380.6L218.3 379.1L210.9 377.4L203.7 375.6L196.5 373.6L189.6 371.5L182.8 369.3L176.2 366.9L169.8 364.4L163.6 361.8L157.6 359.1L151.8 356.2L146.2 353.2L140.9 350.2L135.9 347L131 343.7L126.5 340.4L122.2 336.9L118.2 333.4L114.4 329.8L111 326.1L107.8 322.4L105 318.6L102.4 314.7L100.1 310.8L98.2 306.9L96.6 302.9L95.2 298.9L94.2 294.8L93.5 290.8L93.2 286.7L93.1 282.7\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" d=\"M506.9 285.4L505.1 289.4L504.6 293.4L503.7 297.4L502.5 301.4L500.9 305.4L499.1 309.3L497 313.2L494.5 317L491.8 320.8L488.7 324.6L485.4 328.2L481.8 331.8L477.9 335.4L473.7 338.8L469.3 342.2L464.6 345.5L459.6 348.7L454.4 351.7L449 354.7L443.3 357.6L437.5 360.4L431.4 363L425.1 365.5L418.6 367.9L411.9 370.2L405 372.3L398 374.3L390.9 376.1L383.6 377.9L376.1 379.4L368.6 380.8L360.9 382.1L353.2 383.2L345.3 384.2L337.4 385L329.5 385.7L321.5 386.2L313.4 386.5L305.4 386.7L297.3 386.7L289.2 386.6L281.2 386.3L273.2 385.9L265.2 385.3L257.3 384.5L249.4 383.6L241.7 382.5L234 381.3L226.4 379.9L218.9 378.4L211.6 376.7L204.4 374.9L197.3 373L190.4 370.9L183.6 368.7L177.1 366.3L170.7 363.8L164.6 361.2L158.6 358.5L152.9 355.7L147.3 352.8L142.1 349.7L137 346.5L132.2 343.3L127.7 340L123.5 336.5L119.5 333L115.8 329.5L112.3 325.8L109.2 322.1L106.4 318.3L103.8 314.5L101.6 310.6L99.6 306.7L98 302.7L96.7 298.8L95.7 294.8L95 290.7L94.6 286.7L93.1 282.7\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M506.9 290.4L506.8 293.8L506.5 297.2L505.9 300.6L505.1 303.9L504.1 307.3L502.9 310.6L501.5 313.9L499.9 317.2L498 320.5L495.9 323.7L493.6 326.9L491.2 330L488.5 333.1L485.6 336.2L482.5 339.2L479.2 342.1L475.7 345.1L472 347.9L468.2 350.7L464.1 353.4L459.9 356.1L455.6 358.6L451 361.1L446.3 363.6L441.4 365.9L436.4 368.2L431.3 370.4L426 372.5L420.5 374.5L414.9 376.4L409.3 378.3L403.5 380L397.5 381.7L391.5 383.2L385.4 384.7L379.2 386L372.9 387.2L366.5 388.4L360.1 389.4L353.6 390.3L347 391.2L340.4 391.9L333.7 392.5L327 393L320.3 393.4L313.5 393.7L306.8 393.8L300 393.9L293.2 393.8L286.5 393.7L279.7 393.4L273 393L266.3 392.5L259.6 391.9L253 391.2L246.4 390.3L239.9 389.4L233.5 388.4L227.1 387.2L220.8 386L214.6 384.7L208.5 383.2L202.5 381.7L196.5 380L190.7 378.3L185.1 376.4L179.5 374.5L174 372.5L168.7 370.4L163.6 368.2L158.6 365.9L153.7 363.6L149 361.1L144.4 358.6L140.1 356.1L135.9 353.4L131.8 350.7L128 347.9L124.3 345.1L120.8 342.1L117.5 339.2L114.4 336.2L111.5 333.1L108.8 330L106.4 326.9L104.1 323.7L102 320.5L100.1 317.2L98.5 313.9L97.1 310.6L95.9 307.3L94.9 303.9L94.1 300.6L93.5 297.2L93.2 293.8L93.1 290.4\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M93.1 282.7L93.4 278.6L94 274.6L94.9 270.5L96.1 266.5L97.6 262.5L99.5 258.6L101.6 254.6L104.1 250.8L106.8 246.9L109.9 243.2L113.3 239.5L116.9 235.9L120.8 232.3L125 228.8L129.5 225.4L134.2 222.1L139.2 218.9L144.4 215.8L149.9 212.8L155.6 209.9L161.6 207.1L167.7 204.5L174 201.9L180.6 199.5L187.3 197.3L194.2 195.1L201.3 193.1L208.5 191.2L215.8 189.5L223.3 187.9L230.9 186.5L238.6 185.2L246.4 184.1L254.3 183.1L262.3 182.3L270.3 181.6L278.4 181.1L286.5 180.8L294.6 180.6L302.7 180.6L310.8 180.7L318.9 181L327 181.5L335 182.1L343 182.8L350.9 183.8L358.8 184.8L366.5 186.1L374.1 187.4L381.7 189L389.1 190.6L396.3 192.5L403.5 194.4L410.4 196.5L417.2 198.8L423.8 201.1L430.2 203.6L436.4 206.2L442.4 209L448.2 211.8L453.8 214.8L459.1 217.9L464.1 221L469 224.3L473.5 227.7L477.8 231.1L481.8 234.7L485.6 238.3L489 241.9L492.2 245.7L495 249.5L497.6 253.3L499.9 257.2L501.8 261.2L503.4 265.2L504.8 269.2L505.8 273.2L506.5 277.3L506.8 281.3L506.9 285.4M506.9 297.1L506.6 301.2L506 305.2L505.1 309.3L503.9 313.3L502.4 317.3L500.5 321.2L498.4 325.1L495.9 329L493.2 332.8L490.1 336.6L486.7 340.3L483.1 343.9L479.2 347.5L475 351L470.5 354.4L465.8 357.7L460.8 360.9L455.6 364L450.1 367L444.4 369.9L438.4 372.6L432.3 375.3L426 377.8L419.4 380.2L412.7 382.5L405.8 384.7L398.7 386.7L391.5 388.5L384.2 390.3L376.7 391.8L369.1 393.3L361.4 394.6L353.6 395.7L345.7 396.7L337.7 397.5L329.7 398.1L321.6 398.6L313.5 399L305.4 399.2L297.3 399.2L289.2 399.1L281.1 398.8L273 398.3L265 397.7L257 396.9L249.1 396L241.2 394.9L233.5 393.7L225.9 392.3L218.3 390.8L210.9 389.1L203.7 387.3L196.5 385.3L189.6 383.2L182.8 381L176.2 378.6L169.8 376.2L163.6 373.5L157.6 370.8L151.8 367.9L146.2 365L140.9 361.9L135.9 358.7L131 355.5L126.5 352.1L122.2 348.6L118.2 345.1L114.4 341.5L111 337.8L107.8 334.1L105 330.3L102.4 326.4L100.1 322.5L98.2 318.6L96.6 314.6L95.2 310.6L94.2 306.6L93.5 302.5L93.2 298.5L93.1 294.4M93.1 282.7L93.1 294.4M506.9 285.4L506.9 297.1\"/></g><path class=\"iso-line\" data-tone=\"lo\" d=\"M472.8 333.9L468.7 337.3L464.4 340.5L459.9 343.7L455.1 346.8L450 349.8L444.7 352.7L439.2 355.5L433.5 358.2L427.6 360.7L421.5 363.2L415.1 365.5L408.7 367.7L402 369.8L395.2 371.7L388.2 373.5L381.1 375.2L373.9 376.7L366.6 378.1L359.2 379.3L351.6 380.4L344 381.3L336.4 382.1L328.6 382.7L320.9 383.2L313 383.6L305.2 383.7L297.4 383.8L289.6 383.6L281.7 383.4L274 382.9L266.2 382.3L258.5 381.6L250.9 380.7L243.3 379.7L235.9 378.5L228.5 377.2L221.2 375.7L214.1 374.1L207.1 372.3L200.2 370.4L193.5 368.4L187 366.2L180.6 364L174.4 361.5L168.5 359L162.7 356.4L157.1 353.6L151.7 350.8L146.6 347.8L141.7 344.8L137.1 341.6L132.7 338.4L128.5 335L124.7 331.6L121.1 328.1L117.7 324.6L114.7 321L111.9 317.3L109.5 313.6L107.3 309.8L105.4 306L103.8 302.2L102.6 298.3L101.6 294.4L100.9 290.5L100.6 286.6L100.5 282.7L100.8 278.8L101.3 274.9L102.2 271L103.4 267.1L104.8 263.3L106.6 259.5L108.7 255.7L111.1 252L113.7 248.3L116.7 244.6L119.9 241.1L123.4 237.6L127.2 234.1L131.3 230.8L135.6 227.5L140.1 224.3L144.9 221.2L150 218.2L155.3 215.4L160.8 212.6L166.5 209.9L172.4 207.3L178.5 204.9L184.9 202.6L191.3 200.4L198 198.3L204.8 196.4L211.8 194.6L218.9 192.9L226.1 191.4L233.4 190L240.8 188.8L248.4 187.7L256 186.7L263.6 185.9L271.4 185.3L279.1 184.8L287 184.5L294.8 184.3L302.6 184.3L310.4 184.4L318.3 184.7L326 185.1L333.8 185.7L341.5 186.4L349.1 187.3L356.7 188.4L364.1 189.6L371.5 190.9L378.8 192.4L385.9 194L392.9 195.7L399.8 197.6L406.5 199.7L413 201.8L419.4 204.1L425.6 206.5L431.5 209L437.3 211.7L442.9 214.4L448.3 217.3L453.4 220.2L458.3 223.3L462.9 226.4L467.3 229.7L471.5 233L475.3 236.4L478.9 239.9L482.3 243.4L485.3 247.1L488.1 250.7L490.5 254.4L492.7 258.2L494.6 262L496.2 265.8L497.4 269.7L498.4 273.6L499.1 277.5L499.4 281.4L499.5 285.3L499.2 289.2L498.7 293.2L497.8 297L496.6 300.9L495.2 304.8L493.4 308.6L491.3 312.4L488.9 316.1L486.3 319.8L483.3 323.4L480.1 327L476.6 330.5Z\"/><g class=\"iso-dots\" data-tone=\"mid\"><circle cx=\"468.5\" cy=\"332.7\" r=\"0.5\"/><circle cx=\"397.3\" cy=\"368.3\" r=\"0.5\"/><circle cx=\"300\" cy=\"381.3\" r=\"0.5\"/><circle cx=\"202.7\" cy=\"368.3\" r=\"0.5\"/><circle cx=\"131.5\" cy=\"332.7\" r=\"0.5\"/><circle cx=\"105.4\" cy=\"284\" r=\"0.5\"/><circle cx=\"131.5\" cy=\"235.4\" r=\"0.5\"/><circle cx=\"202.7\" cy=\"199.8\" r=\"0.5\"/><circle cx=\"300\" cy=\"186.7\" r=\"0.5\"/><circle cx=\"397.3\" cy=\"199.8\" r=\"0.5\"/><circle cx=\"468.5\" cy=\"235.4\" r=\"0.5\"/><circle cx=\"494.6\" cy=\"284\" r=\"0.5\"/></g></svg><svg xmlns=\"http://www.w3.org/2000/svg\" class=\"iso-svg iso-live iso-layer\" data-live=\"gato\" viewBox=\"0 0 600 470\" aria-hidden=\"true\"><g class=\"iso-parts\" data-layer=\"gato\"><g class=\"iso-solid\" data-p=\"48\" data-name=\"descarga.perilla\" data-mat=\"brass\" data-seamless=\"\"><path class=\"iso-fill\" data-r=\"fill\" d=\"M193.26 228.45L193.63 228.62L193.96 228.9L194.25 229.28L194.49 229.76L194.68 230.33L194.81 230.99L194.89 231.71L194.91 232.5L194.87 233.33L194.77 234.2L194.62 235.1L194.41 235.99L194.15 236.89L193.85 237.76L193.5 238.59L193.12 239.38L192.71 240.11L192.28 240.76L191.82 241.34L191.36 241.82L190.9 242.2L190.44 242.48L189.99 242.65L189.57 242.71L189.17 242.65L179.57 239.88L179.18 239.71L178.84 239.41L178.55 239L178.3 238.49L178.12 237.88L177.99 237.18L177.93 236.4L177.93 235.56L177.99 234.68L178.12 233.76L178.3 232.83L178.54 231.9L178.84 230.98L179.18 230.09L179.56 229.25L179.98 228.47L180.42 227.76L180.89 227.14L181.37 226.61L181.85 226.19L182.33 225.88L182.8 225.7L183.25 225.63L183.67 225.68Z\"/><path class=\"iso-shade\" data-shade=\"0\" data-r=\"s0\" d=\"M179.57 239.88L179.01 239.57L178.55 239L178.21 238.2L187.8 240.97L188.15 241.78L188.61 242.34L189.17 242.65Z\"/><path class=\"iso-shade\" data-shade=\"1\" data-r=\"s1\" d=\"M178.21 238.2L177.96 236.92L187.56 239.69L187.8 240.97Z\"/><path class=\"iso-shade\" data-shade=\"2\" data-r=\"s2\" d=\"M177.96 236.92L177.92 236.04L177.95 235.1L187.55 237.87L187.52 238.81L187.56 239.69Z\"/><path class=\"iso-shade\" data-shade=\"3\" data-r=\"s3\" d=\"M177.95 235.1L178.08 234.02L178.28 232.91L187.88 235.68L187.67 236.79L187.55 237.87ZM182.83 225.69L183.67 225.68L193.26 228.45L192.43 228.46Z\"/><path class=\"iso-top\" data-r=\"s4\" d=\"M178.28 232.91L178.76 231.18L179.41 229.55L180.19 228.11L181.06 226.94L181.96 226.12L182.83 225.69L192.43 228.46L191.55 228.89L190.66 229.71L189.79 230.88L189.01 232.32L188.36 233.95L187.88 235.68Z\"/><path class=\"iso-tn\" data-r=\"k0\" d=\"M187.52 238.75L187.6 237.4L187.82 235.97L188.18 234.52L188.67 233.12L189.26 231.82L189.93 230.66L190.65 229.71L191.4 229L192.14 228.56L192.84 228.4L193.48 228.54L194.02 228.96L194.44 229.65L194.74 230.59L194.89 231.72L194.89 233.02L194.74 234.42L194.44 235.86L194.02 237.29L193.48 238.66L192.84 239.89L192.14 240.95L191.4 241.78L190.65 242.36L189.93 242.67L189.26 242.68L188.67 242.4L188.18 241.84L187.82 241.02L187.6 239.98Z\"/><path class=\"iso-tn\" data-r=\"k1\" d=\"\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" data-r=\"crease\" d=\"M189.17 242.65L188.6 242.34L188.14 241.77L187.8 240.96L187.59 239.95L187.52 238.76L187.59 237.45L187.8 236.07L188.14 234.67L188.6 233.3L189.16 232.02L189.8 230.87L190.49 229.91L191.21 229.16L191.93 228.66L192.62 228.42L193.26 228.45\"/><path class=\"iso-line\" data-tone=\"faint\" data-r=\"inner\" d=\"M187.82 242.23L187.3 241.79L186.9 241.1L186.62 240.19L186.47 239.08L186.47 237.82L186.61 236.46L186.89 235.06L187.29 233.67L187.8 232.33L188.41 231.11L189.08 230.05L189.79 229.18L190.52 228.56L191.23 228.19L191.9 228.1M180.36 240.08L179.84 239.64L179.43 238.95L179.15 238.03L179.01 236.92L179 235.67L179.14 234.31L179.42 232.91L179.82 231.51L180.34 230.17L180.94 228.95L181.61 227.89L182.33 227.03L183.05 226.4L183.77 226.04L184.44 225.94\"/><path class=\"iso-line\" data-tone=\"lo\" data-r=\"r0\" opacity=\"1\" d=\"M186.45 238.45L178.99 236.29M186.51 237.29L179.04 235.13M186.68 236.06L179.21 233.91M186.95 234.82L179.48 232.66M187.32 233.58L179.85 231.43M187.77 232.4L180.31 230.25M188.3 231.3L180.83 229.15M188.88 230.33L181.42 228.17M189.51 229.5L182.04 227.34M190.15 228.85L182.68 226.69M186.68 240.44L179.21 238.29M186.51 239.51L179.04 237.35\"/><path class=\"iso-line\" data-tone=\"lo\" data-r=\"r1\" opacity=\"0.844\" d=\"M186.95 241.22L179.48 239.06\"/><path class=\"iso-line\" data-tone=\"lo\" data-r=\"r2\" opacity=\"0.75\" d=\"M190.79 228.39L183.32 226.23\"/><path class=\"iso-line\" data-tone=\"lo\" data-r=\"r3\" opacity=\"0.375\" d=\"M187.32 241.81L179.85 239.66\"/><path class=\"iso-line\" data-tone=\"lo\" data-r=\"r4\" opacity=\"0.25\" d=\"M191.41 228.14L183.95 225.98\"/><path class=\"iso-line\" data-tone=\"lo\" data-r=\"r5\" opacity=\"0\" d=\"\"/><path class=\"iso-line\" data-tone=\"lo\" data-r=\"r6\" opacity=\"0\" d=\"\"/><path class=\"iso-line\" data-tone=\"lo\" data-r=\"r7\" opacity=\"0\" d=\"\"/><path class=\"iso-line\" data-tone=\"lo\" data-r=\"r8\" opacity=\"0\" d=\"\"/><path class=\"iso-line\" data-tone=\"lo\" data-r=\"r9\" opacity=\"0\" d=\"\"/><path class=\"iso-line\" data-tone=\"lo\" data-r=\"r10\" opacity=\"0\" d=\"\"/><path class=\"iso-line\" data-tone=\"lo\" data-r=\"r11\" opacity=\"0\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" data-r=\"edge\" d=\"M193.26 228.45L193.63 228.62L193.96 228.9L194.25 229.28L194.49 229.76L194.68 230.33L194.81 230.99L194.89 231.71L194.91 232.5L194.87 233.33L194.77 234.2L194.62 235.1L194.41 235.99L194.15 236.89L193.85 237.76L193.5 238.59L193.12 239.38L192.71 240.11L192.28 240.76L191.82 241.34L191.36 241.82L190.9 242.2L190.44 242.48L189.99 242.65L189.57 242.71L189.17 242.65L179.57 239.88L179.18 239.71L178.84 239.41L178.55 239L178.3 238.49L178.12 237.88L177.99 237.18L177.93 236.4L177.93 235.56L177.99 234.68L178.12 233.76L178.3 232.83L178.54 231.9L178.84 230.98L179.18 230.09L179.56 229.25L179.98 228.47L180.42 227.76L180.89 227.14L181.37 226.61L181.85 226.19L182.33 225.88L182.8 225.7L183.25 225.63L183.67 225.68Z\"/></g><g class=\"iso-solid\" data-p=\"46\" data-name=\"biela.-\" data-mat=\"steel\"><path class=\"iso-fill\" data-r=\"fill\" d=\"M371.52 157.42L371.52 142.48L366.4 141.01L365.66 141.65L365.66 156.58L370.78 158.06Z\"/><path class=\"iso-tn\" data-r=\"f0\" d=\"\"/><path class=\"iso-tn\" data-r=\"f1\" d=\"M370.78 158.06L370.78 143.12L371.52 142.48L371.52 157.42Z\"/><path class=\"iso-tn\" data-r=\"f2\" data-b=\"3\" style=\"--f:1\" d=\"M370.78 143.12L365.66 141.65L366.4 141.01L371.52 142.48Z\"/><path class=\"iso-tn\" data-r=\"f3\" d=\"\"/><path class=\"iso-tn\" data-r=\"f4\" d=\"\"/><path class=\"iso-tn\" data-r=\"f5\" data-b=\"2\" d=\"M365.66 156.58L370.78 158.06L370.78 143.12L365.66 141.65Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" data-r=\"crease\" d=\"M371.52 142.48L370.78 143.12M370.78 158.06L370.78 143.12L365.66 141.65\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" data-r=\"edge\" d=\"M371.52 157.42L371.52 142.48L366.4 141.01L365.66 141.65L365.66 156.58L370.78 158.06Z\"/><g class=\"iso-dots\" data-tone=\"mid\"><circle data-r=\"c0\" cx=\"368.96\" cy=\"142.81\" r=\"0.55\" fill-opacity=\"0\"/><circle data-r=\"c1\" cx=\"368.96\" cy=\"155.61\" r=\"0.55\" fill-opacity=\"0\"/></g></g><g class=\"iso-solid\" data-p=\"0\" data-name=\"base\" data-mat=\"gunmetal\"><path class=\"iso-fill\" data-r=\"fill\" d=\"M436.87 290.12L436.62 291.07L435.88 291.96L381.69 338.89L380.52 339.65L378.99 340.24L377.21 340.61L375.29 340.74L373.38 340.61L371.6 340.24L166.83 281.13L165.29 280.54L164.12 279.78L163.38 278.89L163.13 277.93L163.13 241.67L163.38 240.71L164.12 239.82L218.31 192.89L219.48 192.13L221.01 191.54L222.79 191.17L224.71 191.05L226.62 191.17L228.4 191.54L433.17 250.65L434.71 251.24L435.88 252.01L436.62 252.9L436.87 253.85Z\"/><path class=\"iso-tn\" data-r=\"f0\" d=\"\"/><path class=\"iso-tn\" data-r=\"f1\" d=\"\"/><path class=\"iso-tn\" data-r=\"f2\" d=\"\"/><path class=\"iso-tn\" data-r=\"f3\" d=\"\"/><path class=\"iso-tn\" data-r=\"f4\" style=\"stroke-width:0.25\" d=\"M436.87 253.85L436.62 254.81L436.62 291.07L436.87 290.12Z\"/><path class=\"iso-tn\" data-r=\"f5\" d=\"M436.62 254.81L435.88 255.7L435.88 291.96L436.62 291.07Z\"/><path class=\"iso-tn\" data-r=\"f6\" d=\"M435.88 255.7L381.69 302.63L381.69 338.89L435.88 291.96Z\"/><path class=\"iso-tn\" data-r=\"f7\" d=\"M381.69 302.63L380.52 303.39L380.52 339.65L381.69 338.89Z\"/><path class=\"iso-tn\" data-r=\"f8\" d=\"M380.52 303.39L378.99 303.98L378.99 340.24L380.52 339.65Z\"/><path class=\"iso-tn\" data-r=\"f9\" data-b=\"1\" d=\"M378.99 303.98L377.21 304.35L377.21 340.61L378.99 340.24Z\"/><path class=\"iso-tn\" data-r=\"f10\" data-b=\"1\" d=\"M377.21 304.35L375.29 304.47L375.29 340.74L377.21 340.61Z\"/><path class=\"iso-tn\" data-r=\"f11\" data-b=\"2\" d=\"M375.29 304.47L373.38 304.35L373.38 340.61L375.29 340.74Z\"/><path class=\"iso-tn\" data-r=\"f12\" data-b=\"2\" d=\"M373.38 304.35L371.6 303.98L371.6 340.24L373.38 340.61Z\"/><path class=\"iso-tn\" data-r=\"f13\" data-b=\"2\" style=\"--f:0.5\" d=\"M371.6 303.98L166.83 244.87L166.83 281.13L371.6 340.24Z\"/><path class=\"iso-tn\" data-r=\"f14\" data-b=\"3\" d=\"M166.83 244.87L165.29 244.28L165.29 280.54L166.83 281.13Z\"/><path class=\"iso-tn\" data-r=\"f15\" data-b=\"3\" d=\"M165.29 244.28L164.12 243.51L164.12 279.78L165.29 280.54Z\"/><path class=\"iso-tn\" data-r=\"f16\" data-b=\"3\" d=\"M164.12 243.51L163.38 242.62L163.38 278.89L164.12 279.78Z\"/><path class=\"iso-tn\" data-r=\"f17\" data-b=\"3\" style=\"stroke-width:0.25\" d=\"M163.38 242.62L163.13 241.67L163.13 277.93L163.38 278.89Z\"/><path class=\"iso-tn\" data-r=\"f18\" d=\"\"/><path class=\"iso-tn\" data-r=\"f19\" d=\"\"/><path class=\"iso-tn\" data-r=\"f20\" d=\"\"/><path class=\"iso-tn\" data-r=\"f21\" d=\"\"/><path class=\"iso-tn\" data-r=\"f22\" d=\"\"/><path class=\"iso-tn\" data-r=\"f23\" d=\"\"/><path class=\"iso-tn\" data-r=\"f24\" d=\"\"/><path class=\"iso-tn\" data-r=\"f25\" d=\"\"/><path class=\"iso-tn\" data-r=\"f26\" d=\"\"/><path class=\"iso-tn\" data-r=\"f27\" d=\"\"/><path class=\"iso-top\" data-r=\"top\" transform=\"matrix(1.06653 0.30788 -0.61576 0.53326 300 247.76)\" d=\"M96 -50L97.553 -49.796L99 -49.196L100.243 -48.243L101.196 -47L101.796 -45.553L102 -44L102 44L101.796 45.553L101.196 47L100.243 48.243L99 49.196L97.553 49.796L96 50L-96 50L-97.553 49.796L-99 49.196L-100.243 48.243L-101.196 47L-101.796 45.553L-102 44L-102 -44L-101.796 -45.553L-101.196 -47L-100.243 -48.243L-99 -49.196L-97.553 -49.796L-96 -50Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" data-r=\"crease\" d=\"M436.87 253.85L436.62 254.81L435.88 255.7L381.69 302.63L380.52 303.39L378.99 303.98L377.21 304.35L375.29 304.47L373.38 304.35L371.6 303.98L166.83 244.87L165.29 244.28L164.12 243.51L163.38 242.62L163.13 241.67\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" data-r=\"edge\" d=\"M436.87 290.12L436.62 291.07L435.88 291.96L381.69 338.89L380.52 339.65L378.99 340.24L377.21 340.61L375.29 340.74L373.38 340.61L371.6 340.24L166.83 281.13L165.29 280.54L164.12 279.78L163.38 278.89L163.13 277.93L163.13 241.67L163.38 240.71L164.12 239.82L218.31 192.89L219.48 192.13L221.01 191.54L222.79 191.17L224.71 191.05L226.62 191.17L228.4 191.54L433.17 250.65L434.71 251.24L435.88 252.01L436.62 252.9L436.87 253.85Z\"/><g class=\"iso-dots\" data-tone=\"mid\"><circle data-r=\"c0\" cx=\"226.51\" cy=\"198.11\" r=\"0.55\" fill-opacity=\"1\"/><circle data-r=\"c1\" cx=\"422.75\" cy=\"254.75\" r=\"0.55\" fill-opacity=\"1\"/><circle data-r=\"c2\" cx=\"373.49\" cy=\"297.42\" r=\"0.55\" fill-opacity=\"1\"/><circle data-r=\"c3\" cx=\"177.25\" cy=\"240.77\" r=\"0.55\" fill-opacity=\"1\"/></g></g><g class=\"iso-part\" data-p=\"1\" data-name=\"botella.cordon\" data-mat=\"copper\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M217.1 238L217.1 237.3L217.2 236.5L217.3 235.8L217.5 235L217.6 234.3L217.9 233.5L218.1 232.8L218.4 232.1L218.7 231.3L219.1 230.6L219.5 229.9L219.9 229.2L220.4 228.5L220.9 227.8L221.4 227.1L222 226.4L222.6 225.7L223.2 225L223.9 224.3L224.6 223.7L225.3 223L226.1 222.4L226.9 221.7L227.7 221.1L228.6 220.5L229.5 219.9L230.4 219.3L231.3 218.7L232.3 218.1L233.3 217.6L234.3 217L235.4 216.5L236.5 216L237.6 215.5L238.7 215L239.9 214.5L241 214L242.2 213.6L243.5 213.1L244.7 212.7L246 212.3L247.2 211.9L248.5 211.6L249.8 211.2L251.2 210.8L252.5 210.5L253.9 210.2L255.3 209.9L256.7 209.6L258.1 209.4L259.5 209.1L260.9 208.9L262.4 208.7L263.8 208.5L265.3 208.3L266.7 208.2L268.2 208.1L269.7 207.9L271.2 207.8L272.7 207.8L274.2 207.7L275.7 207.6L277.2 207.6L278.7 207.6L280.2 207.6L281.7 207.6L283.2 207.7L284.7 207.8L286.1 207.8L287.6 207.9L289.1 208.1L290.6 208.2L292.1 208.3L293.5 208.5L295 208.7L296.4 208.9L297.8 209.1L299.3 209.4L300.7 209.6L302.1 209.9L303.4 210.2L304.8 210.5L306.2 210.8L307.5 211.2L308.8 211.6L310.1 211.9L311.4 212.3L312.6 212.7L313.9 213.1L315.1 213.6L316.3 214L317.5 214.5L318.6 215L319.8 215.5L320.9 216L321.9 216.5L323 217L324 217.6L325 218.1L326 218.7L326.9 219.3L327.9 219.9L328.7 220.5L329.6 221.1L330.4 221.7L331.2 222.4L332 223L332.7 223.7L333.4 224.3L334.1 225L334.7 225.7L335.3 226.4L335.9 227.1L336.4 227.8L336.9 228.5L337.4 229.2L337.8 229.9L338.2 230.6L338.6 231.3L338.9 232.1L339.2 232.8L339.5 233.5L339.7 234.3L339.9 235L340 235.8L340.1 236.5L340.2 237.3L340.2 238L340.2 242L340.2 242.7L340.1 243.5L340 244.2L339.9 245L339.7 245.7L339.5 246.5L339.2 247.2L338.9 247.9L338.6 248.7L338.2 249.4L337.8 250.1L337.4 250.8L336.9 251.5L336.4 252.2L335.9 252.9L335.3 253.6L334.7 254.3L334.1 255L333.4 255.7L332.7 256.3L332 257L331.2 257.6L330.4 258.3L329.6 258.9L328.7 259.5L327.9 260.1L326.9 260.7L326 261.3L325 261.9L324 262.4L323 263L321.9 263.5L320.9 264L319.8 264.5L318.6 265L317.5 265.5L316.3 266L315.1 266.4L313.9 266.9L312.6 267.3L311.4 267.7L310.1 268.1L308.8 268.5L307.5 268.8L306.2 269.2L304.8 269.5L303.4 269.8L302.1 270.1L300.7 270.4L299.3 270.6L297.8 270.9L296.4 271.1L295 271.3L293.5 271.5L292.1 271.7L290.6 271.8L289.1 271.9L287.6 272.1L286.1 272.2L284.7 272.2L283.2 272.3L281.7 272.4L280.2 272.4L278.7 272.4L277.2 272.4L275.7 272.4L274.2 272.3L272.7 272.2L271.2 272.2L269.7 272.1L268.2 271.9L266.7 271.8L265.3 271.7L263.8 271.5L262.4 271.3L260.9 271.1L259.5 270.9L258.1 270.6L256.7 270.4L255.3 270.1L253.9 269.8L252.5 269.5L251.2 269.2L249.8 268.8L248.5 268.5L247.2 268.1L246 267.7L244.7 267.3L243.5 266.9L242.2 266.4L241 266L239.9 265.5L238.7 265L237.6 264.5L236.5 264L235.4 263.5L234.3 263L233.3 262.4L232.3 261.9L231.3 261.3L230.4 260.7L229.5 260.1L228.6 259.5L227.7 258.9L226.9 258.3L226.1 257.6L225.3 257L224.6 256.3L223.9 255.7L223.2 255L222.6 254.3L222 253.6L221.4 252.9L220.9 252.2L220.4 251.5L219.9 250.8L219.5 250.1L219.1 249.4L218.7 248.7L218.4 247.9L218.1 247.2L217.9 246.5L217.6 245.7L217.5 245L217.3 244.2L217.2 243.5L217.1 242.7L217.1 242Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M340.2 241.2L340.2 242.7L340 244.2L339.7 245.7L339.2 247.2L338.6 248.7L337.8 250.1L336.9 251.5L335.9 252.9L334.7 254.3L333.4 255.7L332 257L330.4 258.3L328.7 259.5L326.9 260.7L325 261.9L323 263L320.9 264L318.6 265L316.3 266L313.9 266.9L311.4 267.7L308.8 268.5L306.2 269.2L303.4 269.8L300.7 270.4L297.8 270.9L295 271.3L292.1 271.7L289.1 271.9L286.1 272.2L283.2 272.3L280.2 272.4L280.2 269.2L283.2 269.1L286.1 269L289.1 268.7L292.1 268.5L295 268.1L297.8 267.7L300.7 267.2L303.4 266.6L306.2 266L308.8 265.3L311.4 264.5L313.9 263.7L316.3 262.8L318.6 261.8L320.9 260.8L323 259.8L325 258.7L326.9 257.5L328.7 256.3L330.4 255.1L332 253.8L333.4 252.5L334.7 251.1L335.9 249.7L336.9 248.3L337.8 246.9L338.6 245.5L339.2 244L339.7 242.5L340 241L340.2 239.5L340.2 238Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M280.2 272.4L277.2 272.4L274.2 272.3L271.2 272.2L268.2 271.9L265.3 271.7L262.4 271.3L259.5 270.9L259.5 267.7L262.4 268.1L265.3 268.5L268.2 268.7L271.2 269L274.2 269.1L277.2 269.2L280.2 269.2Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M259.5 270.9L256.7 270.4L253.9 269.8L251.2 269.2L248.5 268.5L246 267.7L243.5 266.9L241 266L238.7 265L238.7 261.8L241 262.8L243.5 263.7L246 264.5L248.5 265.3L251.2 266L253.9 266.6L256.7 267.2L259.5 267.7Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M238.7 265L236.5 264L234.3 263L232.3 261.9L230.4 260.7L228.6 259.5L226.9 258.3L225.3 257L223.9 255.7L222.6 254.3L221.4 252.9L220.4 251.5L219.5 250.1L218.7 248.7L218.7 245.5L219.5 246.9L220.4 248.3L221.4 249.7L222.6 251.1L223.9 252.5L225.3 253.8L226.9 255.1L228.6 256.3L230.4 257.5L232.3 258.7L234.3 259.8L236.5 260.8L238.7 261.8Z\"/><path class=\"iso-top\" d=\"M218.7 248.7L218.1 247.2L217.6 245.7L217.3 244.2L217.1 242.7L217.1 241.2L217.1 238L217.1 239.5L217.3 241L217.6 242.5L218.1 244L218.7 245.5ZM332 253.8L330.4 255.1L328.7 256.3L326.9 257.5L325 258.7L323 259.8L320.9 260.8L318.6 261.8L316.3 262.8L313.9 263.7L311.4 264.5L308.8 265.3L306.2 266L303.4 266.6L300.7 267.2L297.8 267.7L295 268.1L292.1 268.5L289.1 268.7L286.1 269L283.2 269.1L280.2 269.2L277.2 269.2L274.2 269.1L271.2 269L268.2 268.7L265.3 268.5L262.4 268.1L259.5 267.7L256.7 267.2L253.9 266.6L251.2 266L248.5 265.3L246 264.5L243.5 263.7L241 262.8L238.7 261.8L236.5 260.8L234.3 259.8L232.3 258.7L230.4 257.5L228.6 256.3L226.9 255.1L225.3 253.8L223.9 252.5L222.6 251.1L221.4 249.7L220.4 248.3L219.5 246.9L218.7 245.5L218.1 244L217.6 242.5L217.3 241L217.1 239.5L217.1 238L217.2 236.5L217.5 235L217.9 233.5L218.4 232.1L219.1 230.6L219.9 229.2L220.9 227.8L222 226.4L223.2 225L224.6 223.7L226.1 222.4L227.7 221.1L229.5 219.9L231.3 218.7L233.3 217.6L235.4 216.5L237.6 215.5L239.9 214.5L242.2 213.6L244.7 212.7L247.2 211.9L249.8 211.2L252.5 210.5L255.3 209.9L258.1 209.4L260.9 208.9L263.8 208.5L266.7 208.2L269.7 207.9L272.7 207.8L275.7 207.6L278.7 207.6L281.7 207.6L284.7 207.8L287.6 207.9L290.6 208.2L293.5 208.5L296.4 208.9L299.3 209.4L302.1 209.9L304.8 210.5L307.5 211.2L310.1 211.9L312.6 212.7L315.1 213.6L317.5 214.5L319.8 215.5L321.9 216.5L324 217.6L326 218.7L327.9 219.9L329.6 221.1L331.2 222.4L332.7 223.7L334.1 225L335.3 226.4L336.4 227.8L337.4 229.2L338.2 230.6L338.9 232.1L339.5 233.5L339.9 235L340.1 236.5L340.2 238L340.2 239.5L340 241L339.7 242.5L339.2 244L338.6 245.5L337.8 246.9L336.9 248.3L335.9 249.7L334.7 251.1L333.4 252.5L332 253.8L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4L278.7 238.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M340.2 238.4L340.2 239.2L340.2 239.9L340.1 240.6L340 241.4L339.8 242.1L339.6 242.9L339.4 243.6L339.1 244.4L338.8 245.1L338.4 245.8L338.1 246.6L337.6 247.3L337.2 248L336.7 248.7L336.2 249.4L335.6 250.1L335 250.8L334.4 251.5L333.8 252.1L333.1 252.8L332.4 253.5L331.6 254.1L330.8 254.8L330 255.4L329.2 256L328.3 256.6L327.4 257.2L326.5 257.8L325.5 258.4L324.5 258.9L323.5 259.5L322.5 260L321.4 260.6L320.3 261.1L319.2 261.6L318.1 262.1L316.9 262.5L315.7 263L314.5 263.4L313.3 263.9L312 264.3L310.7 264.7L309.5 265.1L308.2 265.4L306.8 265.8L305.5 266.1L304.1 266.4L302.8 266.7L301.4 267L300 267.3L298.6 267.5L297.1 267.8L295.7 268L294.2 268.2L292.8 268.4L291.3 268.5L289.9 268.7L288.4 268.8L286.9 268.9L285.4 269L283.9 269.1L282.4 269.1L280.9 269.2L279.4 269.2L277.9 269.2L276.4 269.2L274.9 269.1L273.4 269.1L271.9 269L270.4 268.9L269 268.8L267.5 268.7L266 268.5L264.5 268.4L263.1 268.2L261.6 268L260.2 267.8L258.8 267.5L257.4 267.3L256 267L254.6 266.7L253.2 266.4L251.9 266.1L250.5 265.8L249.2 265.4L247.9 265.1L246.6 264.7L245.3 264.3L244.1 263.9L242.8 263.4L241.6 263L240.4 262.5L239.3 262.1L238.1 261.6L237 261.1L235.9 260.6L234.9 260L233.8 259.5L232.8 258.9L231.8 258.4L230.9 257.8L229.9 257.2L229 256.6L228.2 256L227.3 255.4L226.5 254.8L225.7 254.1L225 253.5L224.3 252.8L223.6 252.1L222.9 251.5L222.3 250.8L221.7 250.1L221.2 249.4L220.6 248.7L220.2 248L219.7 247.3L219.3 246.6L218.9 245.8L218.6 245.1L218.3 244.4L218 243.6L217.7 242.9L217.5 242.1L217.4 241.4L217.3 240.6L217.2 239.9L217.1 239.2L217.1 238.4\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M217.1 238L217.1 237.3L217.2 236.5L217.3 235.8L217.5 235L217.6 234.3L217.9 233.5L218.1 232.8L218.4 232.1L218.7 231.3L219.1 230.6L219.5 229.9L219.9 229.2L220.4 228.5L220.9 227.8L221.4 227.1L222 226.4L222.6 225.7L223.2 225L223.9 224.3L224.6 223.7L225.3 223L226.1 222.4L226.9 221.7L227.7 221.1L228.6 220.5L229.5 219.9L230.4 219.3L231.3 218.7L232.3 218.1L233.3 217.6L234.3 217L235.4 216.5L236.5 216L237.6 215.5L238.7 215L239.9 214.5L241 214L242.2 213.6L243.5 213.1L244.7 212.7L246 212.3L247.2 211.9L248.5 211.6L249.8 211.2L251.2 210.8L252.5 210.5L253.9 210.2L255.3 209.9L256.7 209.6L258.1 209.4L259.5 209.1L260.9 208.9L262.4 208.7L263.8 208.5L265.3 208.3L266.7 208.2L268.2 208.1L269.7 207.9L271.2 207.8L272.7 207.8L274.2 207.7L275.7 207.6L277.2 207.6L278.7 207.6L280.2 207.6L281.7 207.6L283.2 207.7L284.7 207.8L286.1 207.8L287.6 207.9L289.1 208.1L290.6 208.2L292.1 208.3L293.5 208.5L295 208.7L296.4 208.9L297.8 209.1L299.3 209.4L300.7 209.6L302.1 209.9L303.4 210.2L304.8 210.5L306.2 210.8L307.5 211.2L308.8 211.6L310.1 211.9L311.4 212.3L312.6 212.7L313.9 213.1L315.1 213.6L316.3 214L317.5 214.5L318.6 215L319.8 215.5L320.9 216L321.9 216.5L323 217L324 217.6L325 218.1L326 218.7L326.9 219.3L327.9 219.9L328.7 220.5L329.6 221.1L330.4 221.7L331.2 222.4L332 223L332.7 223.7L333.4 224.3L334.1 225L334.7 225.7L335.3 226.4L335.9 227.1L336.4 227.8L336.9 228.5L337.4 229.2L337.8 229.9L338.2 230.6L338.6 231.3L338.9 232.1L339.2 232.8L339.5 233.5L339.7 234.3L339.9 235L340 235.8L340.1 236.5L340.2 237.3L340.2 238L340.2 242L340.2 242.7L340.1 243.5L340 244.2L339.9 245L339.7 245.7L339.5 246.5L339.2 247.2L338.9 247.9L338.6 248.7L338.2 249.4L337.8 250.1L337.4 250.8L336.9 251.5L336.4 252.2L335.9 252.9L335.3 253.6L334.7 254.3L334.1 255L333.4 255.7L332.7 256.3L332 257L331.2 257.6L330.4 258.3L329.6 258.9L328.7 259.5L327.9 260.1L326.9 260.7L326 261.3L325 261.9L324 262.4L323 263L321.9 263.5L320.9 264L319.8 264.5L318.6 265L317.5 265.5L316.3 266L315.1 266.4L313.9 266.9L312.6 267.3L311.4 267.7L310.1 268.1L308.8 268.5L307.5 268.8L306.2 269.2L304.8 269.5L303.4 269.8L302.1 270.1L300.7 270.4L299.3 270.6L297.8 270.9L296.4 271.1L295 271.3L293.5 271.5L292.1 271.7L290.6 271.8L289.1 271.9L287.6 272.1L286.1 272.2L284.7 272.2L283.2 272.3L281.7 272.4L280.2 272.4L278.7 272.4L277.2 272.4L275.7 272.4L274.2 272.3L272.7 272.2L271.2 272.2L269.7 272.1L268.2 271.9L266.7 271.8L265.3 271.7L263.8 271.5L262.4 271.3L260.9 271.1L259.5 270.9L258.1 270.6L256.7 270.4L255.3 270.1L253.9 269.8L252.5 269.5L251.2 269.2L249.8 268.8L248.5 268.5L247.2 268.1L246 267.7L244.7 267.3L243.5 266.9L242.2 266.4L241 266L239.9 265.5L238.7 265L237.6 264.5L236.5 264L235.4 263.5L234.3 263L233.3 262.4L232.3 261.9L231.3 261.3L230.4 260.7L229.5 260.1L228.6 259.5L227.7 258.9L226.9 258.3L226.1 257.6L225.3 257L224.6 256.3L223.9 255.7L223.2 255L222.6 254.3L222 253.6L221.4 252.9L220.9 252.2L220.4 251.5L219.9 250.8L219.5 250.1L219.1 249.4L218.7 248.7L218.4 247.9L218.1 247.2L217.9 246.5L217.6 245.7L217.5 245L217.3 244.2L217.2 243.5L217.1 242.7L217.1 242Z\"/></g></g><g class=\"iso-part\" data-p=\"2\" data-name=\"botella\" data-mat=\"copper\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M219.6 109.6L219.6 108.8L219.6 108.1L219.7 107.4L219.8 106.6L220 105.9L220.2 105.1L220.4 104.4L220.7 103.6L221 102.9L221.3 102.2L221.7 101.5L222.1 100.7L222.6 100L223.1 99.3L223.6 98.6L224.1 97.9L224.7 97.2L225.4 96.6L226 95.9L226.7 95.2L227.5 94.6L228.2 93.9L229 93.3L229.9 92.7L230.7 92.1L231.6 91.5L232.5 90.9L233.5 90.3L234.5 89.7L235.5 89.2L236.5 88.6L237.6 88.1L238.7 87.6L239.8 87.1L240.9 86.6L242.1 86.1L243.3 85.7L244.5 85.2L245.7 84.8L247 84.4L248.3 84L249.5 83.6L250.9 83.3L252.2 82.9L253.5 82.6L254.9 82.3L256.3 82L257.7 81.7L259.1 81.5L260.5 81.2L261.9 81L263.4 80.8L264.8 80.6L266.3 80.4L267.7 80.3L269.2 80.2L270.7 80.1L272.2 80L273.7 79.9L275.2 79.8L276.7 79.8L278.2 79.8L279.7 79.8L281.2 79.8L282.7 79.9L284.2 79.9L285.6 80L287.1 80.1L288.6 80.2L290.1 80.3L291.5 80.5L293 80.7L294.5 80.9L295.9 81.1L297.3 81.3L298.7 81.5L300.1 81.8L301.5 82.1L302.9 82.4L304.3 82.7L305.6 83L306.9 83.4L308.2 83.7L309.5 84.1L310.8 84.5L312 84.9L313.3 85.4L314.5 85.8L315.6 86.3L316.8 86.8L317.9 87.2L319 87.8L320.1 88.3L321.2 88.8L322.2 89.3L323.2 89.9L324.2 90.5L325.1 91.1L326 91.7L326.9 92.3L327.8 92.9L328.6 93.5L329.4 94.1L330.1 94.8L330.8 95.4L331.5 96.1L332.2 96.8L332.8 97.5L333.4 98.2L333.9 98.8L334.4 99.6L334.9 100.3L335.4 101L335.8 101.7L336.1 102.4L336.5 103.2L336.8 103.9L337 104.6L337.2 105.4L337.4 106.1L337.6 106.9L337.7 107.6L337.8 108.3L337.8 109.1L337.8 238.2L337.8 238.9L337.7 239.6L337.6 240.4L337.5 241.1L337.4 241.9L337.2 242.6L336.9 243.4L336.7 244.1L336.4 244.8L336 245.6L335.6 246.3L335.2 247L334.8 247.7L334.3 248.4L333.7 249.1L333.2 249.8L332.6 250.5L332 251.2L331.3 251.9L330.6 252.5L329.9 253.2L329.1 253.8L328.3 254.5L327.5 255.1L326.6 255.7L325.7 256.3L324.8 256.9L323.8 257.5L322.9 258L321.9 258.6L320.8 259.1L319.8 259.7L318.7 260.2L317.6 260.7L316.4 261.2L315.2 261.6L314.1 262.1L312.8 262.5L311.6 262.9L310.4 263.4L309.1 263.7L307.8 264.1L306.5 264.5L305.1 264.8L303.8 265.2L302.4 265.5L301.1 265.8L299.7 266L298.3 266.3L296.8 266.5L295.4 266.7L294 267L292.5 267.1L291.1 267.3L289.6 267.5L288.1 267.6L286.6 267.7L285.1 267.8L283.7 267.9L282.2 267.9L280.7 267.9L279.2 268L277.7 268L276.2 267.9L274.7 267.9L273.2 267.8L271.7 267.8L270.2 267.7L268.7 267.5L267.3 267.4L265.8 267.2L264.3 267.1L262.9 266.9L261.4 266.7L260 266.5L258.6 266.2L257.2 265.9L255.8 265.7L254.4 265.4L253.1 265L251.7 264.7L250.4 264.4L249.1 264L247.8 263.6L246.6 263.2L245.3 262.8L244.1 262.4L242.9 261.9L241.7 261.5L240.5 261L239.4 260.5L238.3 260L237.2 259.5L236.2 258.9L235.1 258.4L234.1 257.8L233.2 257.3L232.2 256.7L231.3 256.1L230.4 255.5L229.6 254.9L228.8 254.2L228 253.6L227.2 253L226.5 252.3L225.8 251.6L225.2 251L224.5 250.3L224 249.6L223.4 248.9L222.9 248.2L222.4 247.5L222 246.8L221.6 246.1L221.2 245.3L220.9 244.6L220.6 243.9L220.3 243.1L220.1 242.4L219.9 241.6L219.8 240.9L219.7 240.1L219.6 239.4L219.6 238.7Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M337.8 238.9L337.6 240.4L337.4 241.9L336.9 243.4L336.4 244.8L335.6 246.3L334.8 247.7L333.7 249.1L332.6 250.5L331.3 251.9L329.9 253.2L328.3 254.5L326.6 255.7L324.8 256.9L322.9 258L320.8 259.1L318.7 260.2L316.4 261.2L314.1 262.1L311.6 262.9L309.1 263.7L306.5 264.5L303.8 265.2L301.1 265.8L298.3 266.3L295.4 266.7L292.5 267.1L289.6 267.5L286.6 267.7L283.7 267.9L280.7 267.9L277.7 268L277.7 138.9L280.7 138.9L283.7 138.8L286.6 138.6L289.6 138.4L292.5 138.1L295.4 137.7L298.3 137.2L301.1 136.7L303.8 136.1L306.5 135.4L309.1 134.7L311.6 133.9L314.1 133L316.4 132.1L318.7 131.1L320.8 130.1L322.9 129L324.8 127.8L326.6 126.6L328.3 125.4L329.9 124.1L331.3 122.8L332.6 121.5L333.7 120.1L334.8 118.7L335.6 117.2L336.4 115.8L336.9 114.3L337.4 112.8L337.6 111.3L337.8 109.8Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M277.7 268L274.7 267.9L271.7 267.8L268.7 267.5L265.8 267.2L262.9 266.9L260 266.5L260 137.4L262.9 137.8L265.8 138.2L268.7 138.5L271.7 138.7L274.7 138.8L277.7 138.9Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M260 266.5L257.2 265.9L254.4 265.4L251.7 264.7L249.1 264L246.6 263.2L244.1 262.4L241.7 261.5L239.4 260.5L239.4 131.4L241.7 132.4L244.1 133.3L246.6 134.2L249.1 134.9L251.7 135.7L254.4 136.3L257.2 136.9L260 137.4Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M239.4 260.5L237.2 259.5L235.1 258.4L233.2 257.3L231.3 256.1L229.6 254.9L228 253.6L226.5 252.3L225.2 251L224 249.6L222.9 248.2L222 246.8L221.2 245.3L221.2 116.3L222 117.7L222.9 119.1L224 120.5L225.2 121.9L226.5 123.3L228 124.6L229.6 125.8L231.3 127L233.2 128.2L235.1 129.3L237.2 130.4L239.4 131.4Z\"/><path class=\"iso-top\" d=\"M221.2 245.3L220.6 243.9L220.1 242.4L219.8 240.9L219.6 239.4L219.6 237.9L219.6 108.8L219.6 110.3L219.8 111.8L220.1 113.3L220.6 114.8L221.2 116.3ZM329.9 124.1L328.3 125.4L326.6 126.6L324.8 127.8L322.9 129L320.8 130.1L318.7 131.1L316.4 132.1L314.1 133L311.6 133.9L309.1 134.7L306.5 135.4L303.8 136.1L301.1 136.7L298.3 137.2L295.4 137.7L292.5 138.1L289.6 138.4L286.6 138.6L283.7 138.8L280.7 138.9L277.7 138.9L274.7 138.8L271.7 138.7L268.7 138.5L265.8 138.2L262.9 137.8L260 137.4L257.2 136.9L254.4 136.3L251.7 135.7L249.1 134.9L246.6 134.2L244.1 133.3L241.7 132.4L239.4 131.4L237.2 130.4L235.1 129.3L233.2 128.2L231.3 127L229.6 125.8L228 124.6L226.5 123.3L225.2 121.9L224 120.5L222.9 119.1L222 117.7L221.2 116.3L220.6 114.8L220.1 113.3L219.8 111.8L219.6 110.3L219.6 108.8L219.7 107.4L220 105.9L220.4 104.4L221 102.9L221.7 101.5L222.6 100L223.6 98.6L224.7 97.2L226 95.9L227.5 94.6L229 93.3L230.7 92.1L232.5 90.9L234.5 89.7L236.5 88.6L238.7 87.6L240.9 86.6L243.3 85.7L245.7 84.8L248.3 84L250.9 83.3L253.5 82.6L256.3 82L259.1 81.5L261.9 81L264.8 80.6L267.7 80.3L270.7 80.1L273.7 79.9L276.7 79.8L279.7 79.8L282.7 79.9L285.6 80L288.6 80.2L291.5 80.5L294.5 80.9L297.3 81.3L300.1 81.8L302.9 82.4L305.6 83L308.2 83.7L310.8 84.5L313.3 85.4L315.6 86.3L317.9 87.2L320.1 88.3L322.2 89.3L324.2 90.5L326 91.7L327.8 92.9L329.4 94.1L330.8 95.4L332.2 96.8L333.4 98.2L334.4 99.6L335.4 101L336.1 102.4L336.8 103.9L337.2 105.4L337.6 106.9L337.8 108.3L337.8 109.8L337.6 111.3L337.4 112.8L336.9 114.3L336.4 115.8L335.6 117.2L334.8 118.7L333.7 120.1L332.6 121.5L331.3 122.8L329.9 124.1L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3L278.7 109.3Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M337.8 109.3L337.8 110.1L337.7 110.8L337.6 111.6L337.5 112.3L337.3 113.1L337.1 113.8L336.9 114.6L336.6 115.3L336.3 116L335.9 116.8L335.5 117.5L335.1 118.2L334.6 118.9L334.1 119.6L333.6 120.3L333 121L332.4 121.7L331.7 122.4L331.1 123L330.4 123.7L329.6 124.3L328.8 125L328 125.6L327.2 126.2L326.3 126.8L325.4 127.4L324.5 128L323.5 128.6L322.5 129.2L321.5 129.7L320.5 130.2L319.4 130.8L318.3 131.3L317.2 131.8L316 132.3L314.9 132.7L313.7 133.2L312.4 133.6L311.2 134L309.9 134.4L308.7 134.8L307.4 135.2L306 135.5L304.7 135.9L303.3 136.2L302 136.5L300.6 136.8L299.2 137.1L297.8 137.3L296.4 137.5L294.9 137.8L293.5 138L292 138.1L290.6 138.3L289.1 138.4L287.6 138.6L286.1 138.7L284.6 138.8L283.2 138.8L281.7 138.9L280.2 138.9L278.7 138.9L277.2 138.9L275.7 138.9L274.2 138.8L272.7 138.8L271.2 138.7L269.7 138.6L268.2 138.4L266.8 138.3L265.3 138.1L263.9 138L262.4 137.8L261 137.5L259.5 137.3L258.1 137.1L256.7 136.8L255.4 136.5L254 136.2L252.6 135.9L251.3 135.5L250 135.2L248.7 134.8L247.4 134.4L246.1 134L244.9 133.6L243.7 133.2L242.5 132.7L241.3 132.3L240.2 131.8L239 131.3L237.9 130.8L236.9 130.2L235.8 129.7L234.8 129.2L233.8 128.6L232.9 128L231.9 127.4L231 126.8L230.1 126.2L229.3 125.6L228.5 125L227.7 124.3L227 123.7L226.3 123L225.6 122.4L225 121.7L224.3 121L223.8 120.3L223.2 119.6L222.7 118.9L222.3 118.2L221.8 117.5L221.4 116.8L221.1 116L220.8 115.3L220.5 114.6L220.2 113.8L220 113.1L219.9 112.3L219.7 111.6L219.6 110.8L219.6 110.1L219.6 109.3\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M337.8 203.5L337.7 204.2L337.7 205L337.6 205.7L337.4 206.5L337.2 207.2L337 207.9L336.8 208.7L336.5 209.4L336.1 210.1L335.8 210.9L335.4 211.6L334.9 212.3L334.5 213L333.9 213.7L333.4 214.4L332.8 215.1L332.2 215.7L331.6 216.4L330.9 217.1L330.2 217.7L329.4 218.4L328.6 219L327.8 219.6L327 220.2L326.1 220.8L325.2 221.4L324.3 222L323.3 222.6L322.3 223.1L321.3 223.7L320.3 224.2L319.2 224.7L318.1 225.2L317 225.7L315.8 226.2L314.7 226.7L313.5 227.1L312.2 227.5L311 227.9L309.8 228.3L308.5 228.7L307.2 229.1L305.9 229.4L304.5 229.8L303.2 230.1L301.8 230.4L300.5 230.7L299.1 230.9L297.7 231.2L296.3 231.4L294.8 231.6L293.4 231.8L291.9 232L290.5 232.2L289 232.3L287.6 232.4L286.1 232.5L284.6 232.6L283.1 232.7L281.6 232.7L280.2 232.8L278.7 232.8L277.2 232.8L275.7 232.7L274.2 232.7L272.7 232.6L271.2 232.5L269.8 232.4L268.3 232.3L266.8 232.2L265.4 232L263.9 231.8L262.5 231.6L261.1 231.4L259.7 231.2L258.3 230.9L256.9 230.7L255.5 230.4L254.1 230.1L252.8 229.8L251.5 229.4L250.1 229.1L248.9 228.7L247.6 228.3L246.3 227.9L245.1 227.5L243.9 227.1L242.7 226.7L241.5 226.2L240.4 225.7L239.2 225.2L238.2 224.7L237.1 224.2L236 223.7L235 223.1L234 222.6L233.1 222L232.1 221.4L231.2 220.8L230.4 220.2L229.5 219.6L228.7 219L227.9 218.4L227.2 217.7L226.5 217.1L225.8 216.4L225.1 215.7L224.5 215.1L223.9 214.4L223.4 213.7L222.9 213L222.4 212.3L222 211.6L221.6 210.9L221.2 210.1L220.9 209.4L220.6 208.7L220.3 207.9L220.1 207.2L219.9 206.5L219.8 205.7L219.7 205L219.6 204.2L219.6 203.5M337.8 199.2L337.7 200L337.7 200.7L337.6 201.5L337.4 202.2L337.2 202.9L337 203.7L336.8 204.4L336.5 205.1L336.1 205.9L335.8 206.6L335.4 207.3L334.9 208L334.5 208.7L333.9 209.4L333.4 210.1L332.8 210.8L332.2 211.5L331.6 212.1L330.9 212.8L330.2 213.5L329.4 214.1L328.6 214.7L327.8 215.4L327 216L326.1 216.6L325.2 217.2L324.3 217.7L323.3 218.3L322.3 218.9L321.3 219.4L320.3 219.9L319.2 220.5L318.1 221L317 221.5L315.8 221.9L314.7 222.4L313.5 222.8L312.2 223.3L311 223.7L309.8 224.1L308.5 224.5L307.2 224.8L305.9 225.2L304.5 225.5L303.2 225.8L301.8 226.1L300.5 226.4L299.1 226.7L297.7 226.9L296.3 227.2L294.8 227.4L293.4 227.6L291.9 227.7L290.5 227.9L289 228L287.6 228.2L286.1 228.3L284.6 228.3L283.1 228.4L281.6 228.5L280.2 228.5L278.7 228.5L277.2 228.5L275.7 228.5L274.2 228.4L272.7 228.3L271.2 228.3L269.8 228.2L268.3 228L266.8 227.9L265.4 227.7L263.9 227.6L262.5 227.4L261.1 227.2L259.7 226.9L258.3 226.7L256.9 226.4L255.5 226.1L254.1 225.8L252.8 225.5L251.5 225.2L250.1 224.8L248.9 224.5L247.6 224.1L246.3 223.7L245.1 223.3L243.9 222.8L242.7 222.4L241.5 221.9L240.4 221.5L239.2 221L238.2 220.5L237.1 219.9L236 219.4L235 218.9L234 218.3L233.1 217.7L232.1 217.2L231.2 216.6L230.4 216L229.5 215.4L228.7 214.7L227.9 214.1L227.2 213.5L226.5 212.8L225.8 212.1L225.1 211.5L224.5 210.8L223.9 210.1L223.4 209.4L222.9 208.7L222.4 208L222 207.3L221.6 206.6L221.2 205.9L220.9 205.1L220.6 204.4L220.3 203.7L220.1 202.9L219.9 202.2L219.8 201.5L219.7 200.7L219.6 200L219.6 199.2\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M219.6 109.6L219.6 108.8L219.6 108.1L219.7 107.4L219.8 106.6L220 105.9L220.2 105.1L220.4 104.4L220.7 103.6L221 102.9L221.3 102.2L221.7 101.5L222.1 100.7L222.6 100L223.1 99.3L223.6 98.6L224.1 97.9L224.7 97.2L225.4 96.6L226 95.9L226.7 95.2L227.5 94.6L228.2 93.9L229 93.3L229.9 92.7L230.7 92.1L231.6 91.5L232.5 90.9L233.5 90.3L234.5 89.7L235.5 89.2L236.5 88.6L237.6 88.1L238.7 87.6L239.8 87.1L240.9 86.6L242.1 86.1L243.3 85.7L244.5 85.2L245.7 84.8L247 84.4L248.3 84L249.5 83.6L250.9 83.3L252.2 82.9L253.5 82.6L254.9 82.3L256.3 82L257.7 81.7L259.1 81.5L260.5 81.2L261.9 81L263.4 80.8L264.8 80.6L266.3 80.4L267.7 80.3L269.2 80.2L270.7 80.1L272.2 80L273.7 79.9L275.2 79.8L276.7 79.8L278.2 79.8L279.7 79.8L281.2 79.8L282.7 79.9L284.2 79.9L285.6 80L287.1 80.1L288.6 80.2L290.1 80.3L291.5 80.5L293 80.7L294.5 80.9L295.9 81.1L297.3 81.3L298.7 81.5L300.1 81.8L301.5 82.1L302.9 82.4L304.3 82.7L305.6 83L306.9 83.4L308.2 83.7L309.5 84.1L310.8 84.5L312 84.9L313.3 85.4L314.5 85.8L315.6 86.3L316.8 86.8L317.9 87.2L319 87.8L320.1 88.3L321.2 88.8L322.2 89.3L323.2 89.9L324.2 90.5L325.1 91.1L326 91.7L326.9 92.3L327.8 92.9L328.6 93.5L329.4 94.1L330.1 94.8L330.8 95.4L331.5 96.1L332.2 96.8L332.8 97.5L333.4 98.2L333.9 98.8L334.4 99.6L334.9 100.3L335.4 101L335.8 101.7L336.1 102.4L336.5 103.2L336.8 103.9L337 104.6L337.2 105.4L337.4 106.1L337.6 106.9L337.7 107.6L337.8 108.3L337.8 109.1L337.8 238.2L337.8 238.9L337.7 239.6L337.6 240.4L337.5 241.1L337.4 241.9L337.2 242.6L336.9 243.4L336.7 244.1L336.4 244.8L336 245.6L335.6 246.3L335.2 247L334.8 247.7L334.3 248.4L333.7 249.1L333.2 249.8L332.6 250.5L332 251.2L331.3 251.9L330.6 252.5L329.9 253.2L329.1 253.8L328.3 254.5L327.5 255.1L326.6 255.7L325.7 256.3L324.8 256.9L323.8 257.5L322.9 258L321.9 258.6L320.8 259.1L319.8 259.7L318.7 260.2L317.6 260.7L316.4 261.2L315.2 261.6L314.1 262.1L312.8 262.5L311.6 262.9L310.4 263.4L309.1 263.7L307.8 264.1L306.5 264.5L305.1 264.8L303.8 265.2L302.4 265.5L301.1 265.8L299.7 266L298.3 266.3L296.8 266.5L295.4 266.7L294 267L292.5 267.1L291.1 267.3L289.6 267.5L288.1 267.6L286.6 267.7L285.1 267.8L283.7 267.9L282.2 267.9L280.7 267.9L279.2 268L277.7 268L276.2 267.9L274.7 267.9L273.2 267.8L271.7 267.8L270.2 267.7L268.7 267.5L267.3 267.4L265.8 267.2L264.3 267.1L262.9 266.9L261.4 266.7L260 266.5L258.6 266.2L257.2 265.9L255.8 265.7L254.4 265.4L253.1 265L251.7 264.7L250.4 264.4L249.1 264L247.8 263.6L246.6 263.2L245.3 262.8L244.1 262.4L242.9 261.9L241.7 261.5L240.5 261L239.4 260.5L238.3 260L237.2 259.5L236.2 258.9L235.1 258.4L234.1 257.8L233.2 257.3L232.2 256.7L231.3 256.1L230.4 255.5L229.6 254.9L228.8 254.2L228 253.6L227.2 253L226.5 252.3L225.8 251.6L225.2 251L224.5 250.3L224 249.6L223.4 248.9L222.9 248.2L222.4 247.5L222 246.8L221.6 246.1L221.2 245.3L220.9 244.6L220.6 243.9L220.3 243.1L220.1 242.4L219.9 241.6L219.8 240.9L219.7 240.1L219.6 239.4L219.6 238.7Z\"/></g></g><g class=\"iso-part\" data-p=\"20\" data-name=\"bomba.cordon\" data-mat=\"copper\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M348.9 264L348.9 263.2L349 262.5L349.3 261.7L349.7 261L350.2 260.3L350.8 259.7L351.6 259L352.4 258.4L353.4 257.8L354.4 257.3L355.6 256.8L356.8 256.4L358 256L359.4 255.7L360.8 255.5L362.2 255.3L363.7 255.1L365.1 255L366.6 255L368.1 255.1L369.6 255.2L371 255.4L372.4 255.6L373.8 255.9L375.1 256.3L376.3 256.7L377.5 257.2L378.5 257.7L379.5 258.2L380.4 258.8L381.2 259.4L381.8 260.1L382.4 260.8L382.8 261.5L383.1 262.2L383.3 263L383.4 263.7L383.4 266.9L383.3 267.7L383.1 268.4L382.8 269.1L382.3 269.8L381.7 270.5L381.1 271.2L380.3 271.8L379.4 272.4L378.4 272.9L377.3 273.4L376.1 273.9L374.9 274.3L373.5 274.6L372.2 274.9L370.8 275.2L369.3 275.3L367.9 275.4L366.4 275.5L364.9 275.4L363.4 275.4L362 275.2L360.5 275L359.2 274.7L357.8 274.4L356.6 274L355.4 273.6L354.2 273.1L353.2 272.6L352.3 272L351.4 271.4L350.7 270.7L350.1 270L349.6 269.3L349.3 268.6L349 267.9L348.9 267.2Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M383.4 267L383.1 268.4L382.3 269.8L381.1 271.2L379.4 272.4L377.3 273.4L375 274.3L372.3 274.9L369.5 275.3L366.6 275.5L366.6 272.3L369.5 272.1L372.3 271.7L375 271.1L377.3 270.2L379.4 269.2L381.1 268L382.3 266.6L383.1 265.2L383.4 263.8Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M366.6 275.5L363.7 275.4L360.8 275.1L360.8 271.9L363.7 272.2L366.6 272.3Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M360.8 275.1L358.1 274.5L355.7 273.7L355.7 270.5L358.1 271.3L360.8 271.9Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M355.7 273.7L353.5 272.7L351.7 271.6L350.3 270.3L349.4 268.9L349.4 265.7L350.3 267.1L351.7 268.4L353.5 269.5L355.7 270.5Z\"/><path class=\"iso-top\" d=\"M349.4 268.9L348.9 267.5L348.9 264.3L349.4 265.7ZM381.1 268L379.4 269.2L377.3 270.2L375 271.1L372.3 271.7L369.5 272.1L366.6 272.3L363.7 272.2L360.8 271.9L358.1 271.3L355.7 270.5L353.5 269.5L351.7 268.4L350.3 267.1L349.4 265.7L348.9 264.3L349 262.8L349.5 261.4L350.5 260L352 258.7L353.8 257.6L356.1 256.6L358.6 255.9L361.3 255.4L364.2 255.1L367.1 255L370 255.2L372.8 255.7L375.4 256.4L377.7 257.3L379.7 258.3L381.3 259.6L382.5 260.9L383.2 262.3L383.4 263.8L383.1 265.2L382.3 266.6L381.1 268L366.1 263.6L366.1 263.6L366.1 263.6L366.1 263.6L366.1 263.6L366.1 263.6L366.1 263.6L366.1 263.6L366.1 263.6L366.1 263.6L366.1 263.6L366.1 263.6L366.1 263.6L366.1 263.6L366.1 263.6L366.1 263.6L366.1 263.6L366.1 263.6L366.1 263.6L366.1 263.6L366.1 263.6L366.1 263.6L366.1 263.6L366.1 263.6L366.1 263.6L366.1 263.6L366.1 263.6L366.1 263.6L366.1 263.6L366.1 263.6L366.1 263.6L366.1 263.6L366.1 263.6L366.1 263.6L366.1 263.6L366.1 263.6L366.1 263.6L366.1 263.6Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M383.4 263.6L383.3 264.4L383.1 265.1L382.8 265.8L382.4 266.5L381.8 267.2L381.2 267.9L380.4 268.5L379.5 269.1L378.6 269.6L377.5 270.1L376.4 270.6L375.2 271L373.9 271.3L372.6 271.6L371.2 271.9L369.8 272.1L368.3 272.2L366.9 272.3L365.4 272.3L363.9 272.2L362.5 272.1L361.1 271.9L359.7 271.6L358.4 271.3L357.1 271L355.9 270.6L354.7 270.1L353.7 269.6L352.7 269.1L351.8 268.5L351.1 267.9L350.4 267.2L349.9 266.5L349.4 265.8L349.1 265.1L348.9 264.4L348.9 263.6\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M348.9 264L348.9 263.2L349 262.5L349.3 261.7L349.7 261L350.2 260.3L350.8 259.7L351.6 259L352.4 258.4L353.4 257.8L354.4 257.3L355.6 256.8L356.8 256.4L358 256L359.4 255.7L360.8 255.5L362.2 255.3L363.7 255.1L365.1 255L366.6 255L368.1 255.1L369.6 255.2L371 255.4L372.4 255.6L373.8 255.9L375.1 256.3L376.3 256.7L377.5 257.2L378.5 257.7L379.5 258.2L380.4 258.8L381.2 259.4L381.8 260.1L382.4 260.8L382.8 261.5L383.1 262.2L383.3 263L383.4 263.7L383.4 266.9L383.3 267.7L383.1 268.4L382.8 269.1L382.3 269.8L381.7 270.5L381.1 271.2L380.3 271.8L379.4 272.4L378.4 272.9L377.3 273.4L376.1 273.9L374.9 274.3L373.5 274.6L372.2 274.9L370.8 275.2L369.3 275.3L367.9 275.4L366.4 275.5L364.9 275.4L363.4 275.4L362 275.2L360.5 275L359.2 274.7L357.8 274.4L356.6 274L355.4 273.6L354.2 273.1L353.2 272.6L352.3 272L351.4 271.4L350.7 270.7L350.1 270L349.6 269.3L349.3 268.6L349 267.9L348.9 267.2Z\"/></g></g><g class=\"iso-part\" data-p=\"49\" data-name=\"manometro.tubo\" data-mat=\"brass\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M390.9 261.1L390.9 260.8L391.1 260.5L391.3 260.2L391.6 260L392.1 259.8L392.6 259.7L393.1 259.6L393.7 259.5L394.2 259.5L394.8 259.6L395.3 259.7L395.8 259.9L396.2 260.1L396.5 260.3L396.7 260.6L396.8 260.9L396.8 274.8L396.8 275L396.7 275.3L396.4 275.6L396.1 275.8L395.7 276L395.2 276.2L394.6 276.3L394.1 276.3L393.5 276.3L392.9 276.3L392.4 276.1L391.9 276L391.5 275.8L391.2 275.5L391 275.2L390.9 275Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M396.8 274.8L396.8 275L396.7 275.3L396.4 275.6L396.1 275.8L395.7 276L395.2 276.2L394.6 276.3L394.1 276.3L394.1 262.5L394.6 262.4L395.2 262.3L395.7 262.2L396.1 262L396.4 261.7L396.7 261.5L396.8 261.2L396.8 260.9Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M394.1 276.3L393.5 276.3L392.9 276.3L392.9 262.4L393.5 262.5L394.1 262.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M392.9 276.3L392.4 276.1L391.9 276L391.9 262.1L392.4 262.3L392.9 262.4Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M391.9 276L391.5 275.8L391.2 275.5L391 275.2L391 261.4L391.2 261.6L391.5 261.9L391.9 262.1Z\"/><path class=\"iso-top\" d=\"M391 275.2L390.9 275L390.9 261.1L391 261.4ZM396.4 261.7L396.1 262L395.7 262.2L395.2 262.3L394.6 262.4L394.1 262.5L393.5 262.5L392.9 262.4L392.4 262.3L391.9 262.1L391.5 261.9L391.2 261.6L391 261.4L390.9 261.1L390.9 260.8L391.1 260.5L391.3 260.2L391.6 260L392.1 259.8L392.6 259.7L393.1 259.6L393.7 259.5L394.2 259.5L394.8 259.6L395.3 259.7L395.8 259.9L396.2 260.1L396.5 260.3L396.7 260.6L396.8 260.9L396.8 261.2L396.7 261.5L396.4 261.7L393.9 261L393.9 261L393.9 261L393.9 261L393.9 261L393.9 261L393.9 261L393.9 261L393.9 261L393.9 261L393.9 261L393.9 261L393.9 261L393.9 261L393.9 261L393.9 261L393.9 261L393.9 261L393.9 261L393.9 261L393.9 261L393.9 261L393.9 261L393.9 261L393.9 261L393.9 261L393.9 261L393.9 261L393.9 261L393.9 261L393.9 261L393.9 261L393.9 261Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M396.8 261L396.5 261.6L395.7 262.1L394.5 262.4L393.2 262.4L392 262.1L391.2 261.6L390.9 261\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M390.9 261.1L390.9 260.8L391.1 260.5L391.3 260.2L391.6 260L392.1 259.8L392.6 259.7L393.1 259.6L393.7 259.5L394.2 259.5L394.8 259.6L395.3 259.7L395.8 259.9L396.2 260.1L396.5 260.3L396.7 260.6L396.8 260.9L396.8 274.8L396.8 275L396.7 275.3L396.4 275.6L396.1 275.8L395.7 276L395.2 276.2L394.6 276.3L394.1 276.3L393.5 276.3L392.9 276.3L392.4 276.1L391.9 276L391.5 275.8L391.2 275.5L391 275.2L390.9 275Z\"/></g></g><g class=\"iso-part\" data-p=\"21\" data-name=\"bomba\" data-mat=\"copper\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M351.4 192.1L351.5 191.3L351.7 190.6L352.1 189.9L352.6 189.2L353.3 188.5L354.1 187.9L355.1 187.3L356.1 186.7L357.3 186.3L358.5 185.9L359.8 185.5L361.2 185.2L362.7 185L364.1 184.9L365.6 184.8L367.1 184.8L368.6 184.9L370.1 185.1L371.5 185.3L372.9 185.6L374.2 186L375.4 186.4L376.5 186.9L377.5 187.5L378.4 188.1L379.2 188.7L379.8 189.4L380.3 190.1L380.7 190.8L380.9 191.6L380.9 192.3L380.9 263.8L380.8 264.5L380.6 265.3L380.2 266L379.6 266.7L378.9 267.3L378.1 268L377.2 268.6L376.1 269.1L375 269.6L373.7 270L372.4 270.3L371 270.6L369.6 270.8L368.1 271L366.6 271L365.1 271L363.6 270.9L362.2 270.8L360.8 270.5L359.4 270.2L358.1 269.9L356.9 269.4L355.8 268.9L354.8 268.4L353.9 267.8L353.1 267.1L352.4 266.4L352 265.7L351.6 265L351.4 264.3L351.4 263.5Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M380.9 263.2L380.8 264.6L380.1 266L378.9 267.3L377.2 268.5L375.1 269.5L372.7 270.3L370 270.8L367.1 271L367.1 199.6L370 199.3L372.7 198.8L375.1 198.1L377.2 197.1L378.9 195.9L380.1 194.6L380.8 193.2L380.9 191.7Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M367.1 271L364.2 271L361.4 270.6L361.4 199.2L364.2 199.5L367.1 199.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M361.4 270.6L358.7 270L356.4 269.2L356.4 197.7L358.7 198.6L361.4 199.2Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M356.4 269.2L354.4 268.1L352.9 266.9L351.9 265.6L351.9 194.1L352.9 195.5L354.4 196.7L356.4 197.7Z\"/><path class=\"iso-top\" d=\"M351.9 265.6L351.4 264.1L351.4 192.7L351.9 194.1ZM378.9 195.9L377.2 197.1L375.1 198.1L372.7 198.8L370 199.3L367.1 199.6L364.2 199.5L361.4 199.2L358.7 198.6L356.4 197.7L354.4 196.7L352.9 195.5L351.9 194.1L351.4 192.7L351.5 191.2L352.1 189.8L353.3 188.5L355 187.3L357.1 186.3L359.6 185.6L362.3 185.1L365.2 184.8L368.1 184.9L370.9 185.2L373.5 185.8L375.9 186.6L377.9 187.7L379.4 188.9L380.4 190.3L380.9 191.7L380.8 193.2L380.1 194.6L378.9 195.9L366.1 192.2L366.1 192.2L366.1 192.2L366.1 192.2L366.1 192.2L366.1 192.2L366.1 192.2L366.1 192.2L366.1 192.2L366.1 192.2L366.1 192.2L366.1 192.2L366.1 192.2L366.1 192.2L366.1 192.2L366.1 192.2L366.1 192.2L366.1 192.2L366.1 192.2L366.1 192.2L366.1 192.2L366.1 192.2L366.1 192.2L366.1 192.2L366.1 192.2L366.1 192.2L366.1 192.2L366.1 192.2L366.1 192.2L366.1 192.2L366.1 192.2L366.1 192.2L366.1 192.2Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M380.9 192.2L380.8 192.9L380.6 193.7L380.2 194.4L379.7 195.1L379 195.8L378.3 196.4L377.3 197L376.3 197.5L375.2 198L373.9 198.5L372.6 198.8L371.3 199.1L369.8 199.3L368.4 199.5L366.9 199.6L365.4 199.6L363.9 199.5L362.4 199.3L361 199.1L359.6 198.8L358.3 198.5L357.1 198L355.9 197.5L354.9 197L354 196.4L353.2 195.8L352.5 195.1L352 194.4L351.7 193.7L351.4 192.9L351.3 192.2\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M351.4 192.1L351.5 191.3L351.7 190.6L352.1 189.9L352.6 189.2L353.3 188.5L354.1 187.9L355.1 187.3L356.1 186.7L357.3 186.3L358.5 185.9L359.8 185.5L361.2 185.2L362.7 185L364.1 184.9L365.6 184.8L367.1 184.8L368.6 184.9L370.1 185.1L371.5 185.3L372.9 185.6L374.2 186L375.4 186.4L376.5 186.9L377.5 187.5L378.4 188.1L379.2 188.7L379.8 189.4L380.3 190.1L380.7 190.8L380.9 191.6L380.9 192.3L380.9 263.8L380.8 264.5L380.6 265.3L380.2 266L379.6 266.7L378.9 267.3L378.1 268L377.2 268.6L376.1 269.1L375 269.6L373.7 270L372.4 270.3L371 270.6L369.6 270.8L368.1 271L366.6 271L365.1 271L363.6 270.9L362.2 270.8L360.8 270.5L359.4 270.2L358.1 269.9L356.9 269.4L355.8 268.9L354.8 268.4L353.9 267.8L353.1 267.1L352.4 266.4L352 265.7L351.6 265L351.4 264.3L351.4 263.5Z\"/></g></g><g class=\"iso-solid\" data-p=\"50\" data-name=\"manometro\" data-mat=\"steel\" data-seamless=\"\"><path class=\"iso-fill\" data-r=\"fill\" d=\"M406.18 257.63L406.98 256.85L407.67 255.98L408.27 255.01L408.75 253.97L409.13 252.85L409.39 251.68L409.54 250.45L409.56 249.17L409.47 247.87L409.26 246.54L408.94 245.21L408.5 243.88L407.95 242.57L407.3 241.28L406.55 240.02L405.71 238.81L404.78 237.66L403.77 236.58L402.7 235.57L401.56 234.65L400.38 233.82L399.15 233.09L397.9 232.47L396.63 231.96L395.35 231.56L394.07 231.29L392.81 231.13L391.57 231.1L390.37 231.19L389.21 231.4L388.1 231.73L387.07 232.18L386.1 232.75L385.22 233.42L381.53 236.62L380.73 237.4L380.04 238.27L379.44 239.23L378.96 240.28L378.58 241.39L378.32 242.57L378.17 243.8L378.15 245.08L378.24 246.38L378.45 247.7L378.77 249.04L379.21 250.37L379.76 251.68L380.41 252.97L381.16 254.23L382 255.43L382.93 256.58L383.94 257.67L385.01 258.67L386.15 259.6L387.33 260.43L388.55 261.15L389.81 261.78L391.08 262.29L392.36 262.69L393.64 262.96L394.9 263.12L396.14 263.15L397.34 263.06L398.5 262.85L399.6 262.52L400.64 262.06L401.61 261.5L402.49 260.83Z\"/><path class=\"iso-shade\" data-shade=\"0\" data-r=\"s0\" d=\"M402.49 260.83L403.61 259.67L404.52 258.32L405.2 256.79L405.65 255.12L405.86 253.34L405.82 251.47L405.53 249.55L405 247.62L404.23 245.71L403.25 243.86L406.94 240.66L407.93 242.51L408.69 244.42L409.22 246.35L409.51 248.27L409.55 250.14L409.35 251.92L408.9 253.59L408.21 255.12L407.3 256.47L406.18 257.63Z\"/><path class=\"iso-shade\" data-shade=\"1\" data-r=\"s1\" d=\"M403.25 243.86L402.32 242.44L401.28 241.1L404.98 237.9L406.02 239.24L406.94 240.66Z\"/><path class=\"iso-shade\" data-shade=\"2\" data-r=\"s2\" d=\"M401.28 241.1L399.95 239.65L398.49 238.34L402.18 235.14L403.64 236.45L404.98 237.9Z\"/><path class=\"iso-shade\" data-shade=\"3\" data-r=\"s3\" d=\"M398.49 238.34L396.88 237.15L395.2 236.15L398.89 232.95L400.58 233.95L402.18 235.14Z\"/><path class=\"iso-top\" data-r=\"s4\" d=\"M395.2 236.15L393.34 235.31L391.45 234.71L389.58 234.37L387.75 234.3L385.99 234.5L384.35 234.95L382.86 235.67L381.53 236.62L385.22 233.42L386.55 232.47L388.05 231.75L389.69 231.3L391.44 231.1L393.27 231.17L395.15 231.51L397.03 232.11L398.89 232.95Z\"/><path class=\"iso-tn\" data-r=\"k0\" d=\"\"/><path class=\"iso-tn\" data-r=\"k1\" data-b=\"2\" d=\"M405.87 252.73L405.81 251.43L405.64 250.11L405.34 248.78L404.94 247.45L404.42 246.13L403.8 244.83L403.07 243.56L402.25 242.34L401.35 241.17L400.36 240.07L399.31 239.04L398.19 238.1L397.02 237.24L395.8 236.48L394.55 235.83L393.29 235.29L392.01 234.86L390.73 234.55L389.46 234.36L388.21 234.29L387 234.35L385.83 234.53L384.71 234.83L383.65 235.25L382.67 235.78L381.76 236.43L380.94 237.17L380.22 238.02L379.6 238.96L379.08 239.98L378.67 241.08L378.38 242.24L378.2 243.46L378.14 244.72L378.2 246.02L378.38 247.34L378.67 248.67L379.08 250L379.6 251.32L380.22 252.62L380.94 253.89L381.76 255.11L382.67 256.27L383.65 257.38L384.71 258.41L385.83 259.35L387 260.21L388.21 260.96L389.46 261.62L390.73 262.16L392.01 262.59L393.29 262.9L394.55 263.09L395.8 263.15L397.02 263.1L398.19 262.92L399.31 262.62L400.36 262.2L401.35 261.67L402.25 261.02L403.07 260.27L403.8 259.43L404.42 258.49L404.94 257.46L405.34 256.37L405.64 255.21L405.81 253.99Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" data-r=\"crease\" d=\"M402.49 260.83L403.28 260.05L403.98 259.18L404.57 258.21L405.06 257.17L405.43 256.05L405.7 254.88L405.84 253.64L405.87 252.37L405.78 251.07L405.57 249.74L405.24 248.41L404.8 247.08L404.26 245.77L403.61 244.48L402.85 243.22L402.01 242.01L401.08 240.86L400.08 239.78L399 238.77L397.87 237.85L396.68 237.02L395.46 236.29L394.21 235.67L392.93 235.16L391.65 234.76L390.38 234.48L389.11 234.33L387.87 234.3L386.67 234.39L385.51 234.6L384.41 234.93L383.37 235.38L382.41 235.95L381.53 236.62\"/><g data-r=\"plane0\" transform=\"matrix(-1.06653 -0.30788 0 -1.06653 392.01 248.72)\" opacity=\"1\"><path class=\"iso-line\" data-tone=\"lo\" d=\"M11.8 0L11.761 0.962L11.643 1.917L11.448 2.86L11.177 3.783L10.831 4.682L10.414 5.549L9.927 6.38L9.374 7.167L8.758 7.908L8.085 8.595L7.357 9.226L6.581 9.795L5.76 10.298L4.902 10.734L4.011 11.097L3.093 11.387L2.154 11.602L1.202 11.739L0.241 11.798L-0.722 11.778L-1.679 11.68L-2.626 11.504L-3.555 11.252L-4.46 10.925L-5.336 10.525L-6.176 10.055L-6.975 9.518L-7.727 8.918L-8.429 8.258L-9.074 7.544L-9.658 6.779L-10.179 5.969L-10.631 5.12L-11.013 4.236L-11.322 3.324L-11.555 2.391L-11.712 1.441L-11.79 0.481L-11.79 -0.481L-11.712 -1.441L-11.555 -2.391L-11.322 -3.324L-11.013 -4.236L-10.631 -5.12L-10.179 -5.969L-9.658 -6.779L-9.074 -7.544L-8.429 -8.258L-7.727 -8.918L-6.975 -9.518L-6.176 -10.055L-5.336 -10.525L-4.46 -10.925L-3.555 -11.252L-2.626 -11.504L-1.679 -11.68L-0.722 -11.778L0.241 -11.798L1.202 -11.739L2.154 -11.602L3.093 -11.387L4.011 -11.097L4.902 -10.734L5.76 -10.298L6.581 -9.795L7.357 -9.226L8.085 -8.595L8.758 -7.908L9.374 -7.167L9.927 -6.38L10.414 -5.549L10.831 -4.682L11.177 -3.783L11.448 -2.86L11.643 -1.917L11.761 -0.962Z\"/></g><path class=\"iso-line iso-edge\" data-tone=\"mid\" data-r=\"edge\" d=\"M406.18 257.63L406.98 256.85L407.67 255.98L408.27 255.01L408.75 253.97L409.13 252.85L409.39 251.68L409.54 250.45L409.56 249.17L409.47 247.87L409.26 246.54L408.94 245.21L408.5 243.88L407.95 242.57L407.3 241.28L406.55 240.02L405.71 238.81L404.78 237.66L403.77 236.58L402.7 235.57L401.56 234.65L400.38 233.82L399.15 233.09L397.9 232.47L396.63 231.96L395.35 231.56L394.07 231.29L392.81 231.13L391.57 231.1L390.37 231.19L389.21 231.4L388.1 231.73L387.07 232.18L386.1 232.75L385.22 233.42L381.53 236.62L380.73 237.4L380.04 238.27L379.44 239.23L378.96 240.28L378.58 241.39L378.32 242.57L378.17 243.8L378.15 245.08L378.24 246.38L378.45 247.7L378.77 249.04L379.21 250.37L379.76 251.68L380.41 252.97L381.16 254.23L382 255.43L382.93 256.58L383.94 257.67L385.01 258.67L386.15 259.6L387.33 260.43L388.55 261.15L389.81 261.78L391.08 262.29L392.36 262.69L393.64 262.96L394.9 263.12L396.14 263.15L397.34 263.06L398.5 262.85L399.6 262.52L400.64 262.06L401.61 261.5L402.49 260.83Z\"/><g class=\"iso-dots\" data-tone=\"mid\"><circle data-r=\"c0\" cx=\"392.01\" cy=\"248.72\" r=\"1\" fill-opacity=\"1\"/></g></g><g class=\"iso-part\" data-p=\"22\" data-name=\"bomba.prensa\" data-mat=\"gunmetal\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M348.9 190.4L348.9 189.6L349 188.9L349.3 188.2L349.7 187.4L350.2 186.7L350.8 186.1L351.6 185.4L352.4 184.8L353.4 184.3L354.4 183.7L355.6 183.2L356.8 182.8L358 182.4L359.4 182.1L360.8 181.9L362.2 181.7L363.7 181.5L365.1 181.4L366.6 181.4L368.1 181.5L369.6 181.6L371 181.8L372.4 182L373.8 182.3L375.1 182.7L376.3 183.1L377.5 183.6L378.5 184.1L379.5 184.6L380.4 185.2L381.2 185.9L381.8 186.5L382.4 187.2L382.8 187.9L383.1 188.6L383.3 189.4L383.4 190.1L383.4 192.3L383.3 193L383.1 193.7L382.8 194.4L382.3 195.2L381.7 195.8L381.1 196.5L380.3 197.1L379.4 197.7L378.4 198.3L377.3 198.8L376.1 199.2L374.9 199.6L373.5 200L372.2 200.3L370.8 200.5L369.3 200.7L367.9 200.8L366.4 200.8L364.9 200.8L363.4 200.7L362 200.6L360.5 200.3L359.2 200.1L357.8 199.7L356.6 199.4L355.4 198.9L354.2 198.4L353.2 197.9L352.3 197.3L351.4 196.7L350.7 196.1L350.1 195.4L349.6 194.7L349.3 194L349 193.2L348.9 192.5Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M383.4 192.3L383.1 193.8L382.3 195.2L381.1 196.5L379.4 197.7L377.3 198.7L375 199.6L372.3 200.2L369.5 200.6L366.6 200.8L366.6 198.7L369.5 198.5L372.3 198.1L375 197.5L377.3 196.6L379.4 195.6L381.1 194.4L382.3 193L383.1 191.6L383.4 190.2Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M366.6 200.8L363.7 200.7L360.8 200.4L360.8 198.3L363.7 198.6L366.6 198.7Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M360.8 200.4L358.1 199.8L355.7 199L355.7 196.9L358.1 197.7L360.8 198.3Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M355.7 199L353.5 198.1L351.7 196.9L350.3 195.6L349.4 194.2L349.4 192.1L350.3 193.5L351.7 194.8L353.5 195.9L355.7 196.9Z\"/><path class=\"iso-top\" d=\"M349.4 194.2L348.9 192.8L348.9 190.7L349.4 192.1ZM381.1 194.4L379.4 195.6L377.3 196.6L375 197.5L372.3 198.1L369.5 198.5L366.6 198.7L363.7 198.6L360.8 198.3L358.1 197.7L355.7 196.9L353.5 195.9L351.7 194.8L350.3 193.5L349.4 192.1L348.9 190.7L349 189.2L349.5 187.8L350.5 186.4L352 185.1L353.8 184L356.1 183.1L358.6 182.3L361.3 181.8L364.2 181.5L367.1 181.4L370 181.7L372.8 182.1L375.4 182.8L377.7 183.7L379.7 184.7L381.3 186L382.5 187.3L383.2 188.7L383.4 190.2L383.1 191.6L382.3 193L381.1 194.4L366.1 190.1L366.1 190.1L366.1 190.1L366.1 190.1L366.1 190.1L366.1 190.1L366.1 190.1L366.1 190.1L366.1 190.1L366.1 190.1L366.1 190.1L366.1 190.1L366.1 190.1L366.1 190.1L366.1 190.1L366.1 190.1L366.1 190.1L366.1 190.1L366.1 190.1L366.1 190.1L366.1 190.1L366.1 190.1L366.1 190.1L366.1 190.1L366.1 190.1L366.1 190.1L366.1 190.1L366.1 190.1L366.1 190.1L366.1 190.1L366.1 190.1L366.1 190.1L366.1 190.1L366.1 190.1L366.1 190.1L366.1 190.1L366.1 190.1L366.1 190.1Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M383.4 190.1L383.3 190.8L383.1 191.5L382.8 192.2L382.4 192.9L381.8 193.6L381.2 194.3L380.4 194.9L379.5 195.5L378.6 196L377.5 196.5L376.4 197L375.2 197.4L373.9 197.8L372.6 198.1L371.2 198.3L369.8 198.5L368.3 198.6L366.9 198.7L365.4 198.7L363.9 198.6L362.5 198.5L361.1 198.3L359.7 198.1L358.4 197.8L357.1 197.4L355.9 197L354.7 196.5L353.7 196L352.7 195.5L351.8 194.9L351.1 194.3L350.4 193.6L349.9 192.9L349.4 192.2L349.1 191.5L348.9 190.8L348.9 190.1\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M348.9 190.4L348.9 189.6L349 188.9L349.3 188.2L349.7 187.4L350.2 186.7L350.8 186.1L351.6 185.4L352.4 184.8L353.4 184.3L354.4 183.7L355.6 183.2L356.8 182.8L358 182.4L359.4 182.1L360.8 181.9L362.2 181.7L363.7 181.5L365.1 181.4L366.6 181.4L368.1 181.5L369.6 181.6L371 181.8L372.4 182L373.8 182.3L375.1 182.7L376.3 183.1L377.5 183.6L378.5 184.1L379.5 184.6L380.4 185.2L381.2 185.9L381.8 186.5L382.4 187.2L382.8 187.9L383.1 188.6L383.3 189.4L383.4 190.1L383.4 192.3L383.3 193L383.1 193.7L382.8 194.4L382.3 195.2L381.7 195.8L381.1 196.5L380.3 197.1L379.4 197.7L378.4 198.3L377.3 198.8L376.1 199.2L374.9 199.6L373.5 200L372.2 200.3L370.8 200.5L369.3 200.7L367.9 200.8L366.4 200.8L364.9 200.8L363.4 200.7L362 200.6L360.5 200.3L359.2 200.1L357.8 199.7L356.6 199.4L355.4 198.9L354.2 198.4L353.2 197.9L352.3 197.3L351.4 196.7L350.7 196.1L350.1 195.4L349.6 194.7L349.3 194L349 193.2L348.9 192.5Z\"/></g></g><g class=\"iso-solid\" data-p=\"28\" data-name=\"bomba.corona.5\" data-mat=\"gunmetal\"><path class=\"iso-fill\" data-r=\"fill\" d=\"M374.75 182.59L370.19 186.54L364.02 186.13L361.66 181.73L361.66 168.93L365 168.66L368.37 168.71L371.67 169.1L374.75 169.8Z\"/><path class=\"iso-tn\" data-r=\"f0\" data-b=\"3\" d=\"M364.02 173.34L361.66 168.93L361.66 181.73L364.02 186.13Z\"/><path class=\"iso-tn\" data-r=\"f1\" d=\"\"/><path class=\"iso-tn\" data-r=\"f2\" d=\"\"/><path class=\"iso-tn\" data-r=\"f3\" d=\"\"/><path class=\"iso-tn\" data-r=\"f4\" d=\"\"/><path class=\"iso-tn\" data-r=\"f5\" d=\"M374.75 169.8L370.19 173.74L370.19 186.54L374.75 182.59Z\"/><path class=\"iso-tn\" data-r=\"f6\" data-b=\"2\" d=\"M370.19 173.74L364.02 173.34L364.02 186.13L370.19 186.54Z\"/><path class=\"iso-top\" data-r=\"top\" transform=\"matrix(1.06653 0.30788 -0.61576 0.53326 300 158.17)\" d=\"M57.333 -4.667L52.101 -9.899L54.222 -11.641L56.642 -12.934L59.269 -13.731L62 -14L62 -6.6Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" data-r=\"crease\" d=\"M374.75 169.8L370.19 173.74L364.02 173.34L361.66 168.93\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" data-r=\"edge\" d=\"M374.75 182.59L370.19 186.54L364.02 186.13L361.66 181.73L361.66 168.93L365 168.66L368.37 168.71L371.67 169.1L374.75 169.8Z\"/></g><g class=\"iso-solid\" data-p=\"27\" data-name=\"bomba.corona.4\" data-mat=\"gunmetal\"><path class=\"iso-fill\" data-r=\"fill\" d=\"M364.02 186.13L359.09 188.03L351.19 185.75L351.19 172.95L353.16 171.58L355.63 170.42L358.5 169.53L361.66 168.93L364.02 173.34Z\"/><path class=\"iso-tn\" data-r=\"f0\" data-b=\"2\" style=\"--f:0.5\" d=\"M359.09 175.23L351.19 172.95L351.19 185.75L359.09 188.03Z\"/><path class=\"iso-tn\" data-r=\"f1\" d=\"\"/><path class=\"iso-tn\" data-r=\"f2\" d=\"\"/><path class=\"iso-tn\" data-r=\"f3\" d=\"\"/><path class=\"iso-tn\" data-r=\"f4\" d=\"\"/><path class=\"iso-tn\" data-r=\"f5\" d=\"\"/><path class=\"iso-tn\" data-r=\"f6\" d=\"M364.02 173.34L359.09 175.23L359.09 188.03L364.02 186.13Z\"/><path class=\"iso-top\" data-r=\"top\" transform=\"matrix(1.06653 0.30788 -0.61576 0.53326 300 158.17)\" d=\"M55.4 0L48 0L48.269 -2.731L49.066 -5.358L50.359 -7.778L52.101 -9.899L57.333 -4.667Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" data-r=\"crease\" d=\"M364.02 173.34L359.09 175.23L351.19 172.95\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" data-r=\"edge\" d=\"M364.02 186.13L359.09 188.03L351.19 185.75L351.19 172.95L353.16 171.58L355.63 170.42L358.5 169.53L361.66 168.93L364.02 173.34Z\"/></g><g class=\"iso-solid\" data-p=\"29\" data-name=\"bomba.corona.6\" data-mat=\"gunmetal\"><path class=\"iso-fill\" data-r=\"fill\" d=\"M382.78 187.83L373.98 189.01L370.19 186.54L370.19 173.74L374.75 169.8L377.49 170.78L379.8 172.01L381.59 173.45L382.78 175.03Z\"/><path class=\"iso-tn\" data-r=\"f0\" d=\"\"/><path class=\"iso-tn\" data-r=\"f1\" d=\"\"/><path class=\"iso-tn\" data-r=\"f2\" d=\"\"/><path class=\"iso-tn\" data-r=\"f3\" d=\"\"/><path class=\"iso-tn\" data-r=\"f4\" d=\"\"/><path class=\"iso-tn\" data-r=\"f5\" data-b=\"1\" d=\"M382.78 175.03L373.98 176.21L373.98 189.01L382.78 187.83Z\"/><path class=\"iso-tn\" data-r=\"f6\" data-b=\"3\" d=\"M373.98 176.21L370.19 173.74L370.19 186.54L373.98 189.01Z\"/><path class=\"iso-top\" data-r=\"top\" transform=\"matrix(1.06653 0.30788 -0.61576 0.53326 300 158.17)\" d=\"M62 -6.6L62 -14L64.731 -13.731L67.358 -12.934L69.778 -11.641L71.899 -9.899L66.667 -4.667Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" data-r=\"crease\" d=\"M382.78 175.03L373.98 176.21L370.19 173.74\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" data-r=\"edge\" d=\"M382.78 187.83L373.98 189.01L370.19 186.54L370.19 173.74L374.75 169.8L377.49 170.78L379.8 172.01L381.59 173.45L382.78 175.03Z\"/></g><g class=\"iso-solid\" data-p=\"26\" data-name=\"bomba.corona.3\" data-mat=\"gunmetal\"><path class=\"iso-fill\" data-r=\"fill\" d=\"M359.09 188.03L358.27 191.11L349.47 192.29L348.92 190.62L348.92 177.82L349.03 176.14L349.8 174.49L351.19 172.95L359.09 175.23Z\"/><path class=\"iso-tn\" data-r=\"f0\" data-b=\"1\" d=\"M358.27 178.31L349.47 179.49L349.47 192.29L358.27 191.11Z\"/><path class=\"iso-tn\" data-r=\"f1\" data-b=\"3\" d=\"M349.47 179.49L348.92 177.82L348.92 190.62L349.47 192.29Z\"/><path class=\"iso-tn\" data-r=\"f2\" d=\"\"/><path class=\"iso-tn\" data-r=\"f3\" d=\"\"/><path class=\"iso-tn\" data-r=\"f4\" d=\"\"/><path class=\"iso-tn\" data-r=\"f5\" d=\"\"/><path class=\"iso-tn\" data-r=\"f6\" d=\"M359.09 175.23L358.27 178.31L358.27 191.11L359.09 188.03Z\"/><path class=\"iso-top\" data-r=\"top\" transform=\"matrix(1.06653 0.30788 -0.61576 0.53326 300 158.17)\" d=\"M57.333 4.667L52.101 9.899L50.359 7.778L49.066 5.358L48.269 2.731L48 0L55.4 0Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" data-r=\"crease\" d=\"M359.09 175.23L358.27 178.31L349.47 179.49L348.92 177.82\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" data-r=\"edge\" d=\"M359.09 188.03L358.27 191.11L349.47 192.29L348.92 190.62L348.92 177.82L349.03 176.14L349.8 174.49L351.19 172.95L359.09 175.23Z\"/></g><g class=\"iso-part\" data-p=\"36\" data-name=\"embolo\" data-mat=\"chrome\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M358.8 171.8L358.8 171.1L359.1 170.4L359.7 169.7L360.6 169.1L361.6 168.6L362.9 168.3L364.2 168L365.6 167.9L367.1 167.9L368.5 168.1L369.8 168.4L371 168.8L372 169.3L372.8 169.9L373.3 170.6L373.5 171.3L373.5 189.8L373.5 190.5L373.1 191.2L372.5 191.9L371.7 192.5L370.6 193L369.4 193.4L368 193.6L366.6 193.7L365.2 193.7L363.8 193.6L362.4 193.3L361.3 192.8L360.3 192.3L359.5 191.7L359 191L358.8 190.3Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M373.5 189.8L373.5 190.5L373.1 191.2L372.5 191.9L371.7 192.5L370.6 193L369.4 193.4L368 193.6L366.6 193.7L366.6 175.3L368 175.1L369.4 174.9L370.6 174.5L371.7 174L372.5 173.4L373.1 172.8L373.5 172L373.5 171.3Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M366.6 193.7L365.2 193.7L363.8 193.6L363.8 175.1L365.2 175.2L366.6 175.3Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M363.8 193.6L362.4 193.3L361.3 192.8L361.3 174.3L362.4 174.8L363.8 175.1Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M361.3 192.8L360.3 192.3L359.5 191.7L359 191L359 172.5L359.5 173.2L360.3 173.8L361.3 174.3Z\"/><path class=\"iso-top\" d=\"M359 191L358.8 190.3L358.8 171.8L359 172.5ZM372.5 173.4L371.7 174L370.6 174.5L369.4 174.9L368 175.1L366.6 175.3L365.2 175.2L363.8 175.1L362.4 174.8L361.3 174.3L360.3 173.8L359.5 173.2L359 172.5L358.8 171.8L358.8 171.1L359.1 170.4L359.7 169.7L360.6 169.1L361.6 168.6L362.9 168.3L364.2 168L365.6 167.9L367.1 167.9L368.5 168.1L369.8 168.4L371 168.8L372 169.3L372.8 169.9L373.3 170.6L373.5 171.3L373.5 172L373.1 172.8L372.5 173.4L366.1 171.6L366.1 171.6L366.1 171.6L366.1 171.6L366.1 171.6L366.1 171.6L366.1 171.6L366.1 171.6L366.1 171.6L366.1 171.6L366.1 171.6L366.1 171.6L366.1 171.6L366.1 171.6L366.1 171.6L366.1 171.6L366.1 171.6L366.1 171.6L366.1 171.6L366.1 171.6L366.1 171.6L366.1 171.6L366.1 171.6L366.1 171.6L366.1 171.6L366.1 171.6L366.1 171.6L366.1 171.6L366.1 171.6L366.1 171.6L366.1 171.6L366.1 171.6L366.1 171.6Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M373.5 171.6L373.4 172.3L373 173L372.3 173.6L371.4 174.2L370.2 174.6L369 175L367.6 175.2L366.1 175.3L364.7 175.2L363.3 175L362 174.6L360.9 174.2L360 173.6L359.3 173L358.9 172.3L358.7 171.6\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M358.8 171.8L358.8 171.1L359.1 170.4L359.7 169.7L360.6 169.1L361.6 168.6L362.9 168.3L364.2 168L365.6 167.9L367.1 167.9L368.5 168.1L369.8 168.4L371 168.8L372 169.3L372.8 169.9L373.3 170.6L373.5 171.3L373.5 189.8L373.5 190.5L373.1 191.2L372.5 191.9L371.7 192.5L370.6 193L369.4 193.4L368 193.6L366.6 193.7L365.2 193.7L363.8 193.6L362.4 193.3L361.3 192.8L360.3 192.3L359.5 191.7L359 191L358.8 190.3Z\"/></g></g><g class=\"iso-solid\" data-p=\"30\" data-name=\"bomba.corona.7\" data-mat=\"gunmetal\"><path class=\"iso-fill\" data-r=\"fill\" d=\"M383.33 189.5L383.22 191.18L382.45 192.83L381.06 194.37L373.16 192.09L373.16 179.29L373.98 176.21L382.78 175.03L383.33 176.7Z\"/><path class=\"iso-tn\" data-r=\"f0\" d=\"\"/><path class=\"iso-tn\" data-r=\"f1\" d=\"\"/><path class=\"iso-tn\" data-r=\"f2\" style=\"stroke-width:0.11\" d=\"M383.33 176.7L383.22 178.39L383.22 191.18L383.33 189.5Z\"/><path class=\"iso-tn\" data-r=\"f3\" d=\"M383.22 178.39L382.45 180.03L382.45 192.83L383.22 191.18Z\"/><path class=\"iso-tn\" data-r=\"f4\" d=\"M382.45 180.03L381.06 181.57L381.06 194.37L382.45 192.83Z\"/><path class=\"iso-tn\" data-r=\"f5\" data-b=\"2\" style=\"--f:0.5\" d=\"M381.06 181.57L373.16 179.29L373.16 192.09L381.06 194.37Z\"/><path class=\"iso-tn\" data-r=\"f6\" d=\"\"/><path class=\"iso-top\" data-r=\"top\" transform=\"matrix(1.06653 0.30788 -0.61576 0.53326 300 158.17)\" d=\"M66.667 -4.667L71.899 -9.899L73.641 -7.778L74.934 -5.358L75.731 -2.731L76 0L68.6 0Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" data-r=\"crease\" d=\"M383.33 176.7L383.22 178.39L382.45 180.03L381.06 181.57L373.16 179.29\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" data-r=\"edge\" d=\"M383.33 189.5L383.22 191.18L382.45 192.83L381.06 194.37L373.16 192.09L373.16 179.29L373.98 176.21L382.78 175.03L383.33 176.7Z\"/></g><g class=\"iso-solid\" data-p=\"38\" data-name=\"mensula\" data-mat=\"copper\"><path class=\"iso-fill\" data-r=\"fill\" d=\"M356.85 155.37L356.77 155.65L349.88 161.62L349.43 161.79L348.87 161.76L326.68 155.35L326.34 155.13L326.34 144.46L326.41 144.18L333.31 138.21L333.76 138.04L334.32 138.07L356.5 144.48L356.85 144.7Z\"/><path class=\"iso-tn\" data-r=\"f0\" d=\"\"/><path class=\"iso-tn\" data-r=\"f1\" style=\"stroke-width:0.07\" d=\"M356.85 144.7L356.77 144.98L356.77 155.65L356.85 155.37Z\"/><path class=\"iso-tn\" data-r=\"f2\" d=\"M356.77 144.98L349.88 150.96L349.88 161.62L356.77 155.65Z\"/><path class=\"iso-tn\" data-r=\"f3\" d=\"M349.88 150.96L349.43 151.13L349.43 161.79L349.88 161.62Z\"/><path class=\"iso-tn\" data-r=\"f4\" data-b=\"2\" d=\"M349.43 151.13L348.87 151.09L348.87 161.76L349.43 161.79Z\"/><path class=\"iso-tn\" data-r=\"f5\" data-b=\"2\" style=\"--f:0.5\" d=\"M348.87 151.09L326.68 144.69L326.68 155.35L348.87 161.76Z\"/><path class=\"iso-tn\" data-r=\"f6\" data-b=\"3\" style=\"stroke-width:0.34\" d=\"M326.68 144.69L326.34 144.46L326.34 155.13L326.68 155.35Z\"/><path class=\"iso-tn\" data-r=\"f7\" d=\"\"/><path class=\"iso-tn\" data-r=\"f8\" d=\"\"/><path class=\"iso-tn\" data-r=\"f9\" d=\"\"/><path class=\"iso-tn\" data-r=\"f10\" d=\"\"/><path class=\"iso-tn\" data-r=\"f11\" d=\"\"/><path class=\"iso-top\" data-r=\"top\" transform=\"matrix(1.06653 0.30788 -0.61576 0.53326 300 132.58)\" d=\"M49.4 -6.2L49.824 -6.024L50 -5.6L50 5.6L49.824 6.024L49.4 6.2L28.6 6.2L28.176 6.024L28 5.6L28 -5.6L28.176 -6.024L28.6 -6.2Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" data-r=\"crease\" d=\"M356.85 144.7L356.77 144.98L349.88 150.96L349.43 151.13L348.87 151.09L326.68 144.69L326.34 144.46\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" data-r=\"v0\" opacity=\"1\" d=\"M356.19 144.88L349.42 150.75M349.42 150.75L349.27 150.83M349.27 150.83L349.07 150.8M349.07 150.8L327.09 144.46M327.09 144.46L326.94 144.38M326.94 144.38L326.34 144.46\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" data-r=\"v1\" opacity=\"0.906\" d=\"M356.25 144.78L356.19 144.88M356.25 144.78L356.85 144.7\"/><path class=\"iso-line iso-bevel\" data-tone=\"faint\" data-r=\"v2\" opacity=\"0.094\" d=\"M356.19 144.88L356.77 144.98\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" data-r=\"edge\" d=\"M356.85 155.37L356.77 155.65L349.88 161.62L349.43 161.79L348.87 161.76L326.68 155.35L326.34 155.13L326.34 144.46L326.41 144.18L333.31 138.21L333.76 138.04L334.32 138.07L356.5 144.48L356.85 144.7Z\"/></g><g class=\"iso-solid\" data-p=\"39\" data-name=\"oreja.-\" data-mat=\"copper\"><path class=\"iso-fill\" data-r=\"fill\" d=\"M357.14 144.66L357.14 136.13L352.88 129.57L344.35 127.1L343.36 127.96L339.09 132.06L339.09 140.59L356.16 145.52Z\"/><path class=\"iso-tn\" data-r=\"f0\" d=\"\"/><path class=\"iso-tn\" data-r=\"f1\" d=\"M356.16 145.52L356.16 136.98L357.14 136.13L357.14 144.66Z\"/><path class=\"iso-tn\" data-r=\"f2\" data-b=\"1\" d=\"M356.16 136.98L351.89 130.42L352.88 129.57L357.14 136.13Z\"/><path class=\"iso-tn\" data-r=\"f3\" data-b=\"3\" style=\"--f:1\" d=\"M351.89 130.42L343.36 127.96L344.35 127.1L352.88 129.57Z\"/><path class=\"iso-tn\" data-r=\"f4\" d=\"\"/><path class=\"iso-tn\" data-r=\"f5\" d=\"\"/><path class=\"iso-tn\" data-r=\"f6\" d=\"\"/><path class=\"iso-tn\" data-r=\"f7\" data-b=\"2\" d=\"M339.09 140.59L356.16 145.52L356.16 136.98L351.89 130.42L343.36 127.96L339.09 132.06Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" data-r=\"crease\" d=\"M357.14 136.13L356.16 136.98M352.88 129.57L351.89 130.42M356.16 145.52L356.16 136.98L351.89 130.42L343.36 127.96\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" data-r=\"edge\" d=\"M357.14 144.66L357.14 136.13L352.88 129.57L344.35 127.1L343.36 127.96L339.09 132.06L339.09 140.59L356.16 145.52Z\"/><g class=\"iso-dots\" data-tone=\"mid\"><circle data-r=\"c0\" cx=\"348.61\" cy=\"135.8\" r=\"0.6\" fill-opacity=\"0\"/></g></g><g class=\"iso-part\" data-p=\"3\" data-name=\"tapa.base\" data-mat=\"gunmetal\" transform=\"translate(0 0.01)\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M215.9 105.1L215.9 104.3L215.9 103.6L216 102.8L216.1 102.1L216.3 101.4L216.5 100.6L216.7 99.9L217 99.1L217.3 98.4L217.6 97.7L218 97L218.4 96.2L218.8 95.5L219.3 94.8L219.8 94.1L220.4 93.4L220.9 92.7L221.5 92L222.2 91.4L222.8 90.7L223.5 90L224.3 89.4L225 88.7L225.8 88.1L226.7 87.5L227.5 86.9L228.4 86.3L229.3 85.7L230.2 85.1L231.2 84.5L232.2 84L233.2 83.4L234.3 82.9L235.3 82.4L236.4 81.8L237.5 81.3L238.7 80.9L239.8 80.4L241 79.9L242.2 79.5L243.5 79.1L244.7 78.7L246 78.3L247.3 77.9L248.6 77.5L249.9 77.2L251.2 76.8L252.6 76.5L253.9 76.2L255.3 75.9L256.7 75.7L258.1 75.4L259.5 75.2L261 74.9L262.4 74.7L263.9 74.6L265.3 74.4L266.8 74.2L268.3 74.1L269.7 74L271.2 73.9L272.7 73.8L274.2 73.8L275.7 73.7L277.2 73.7L278.7 73.7L280.2 73.7L281.7 73.7L283.1 73.8L284.6 73.8L286.1 73.9L287.6 74L289.1 74.1L290.6 74.2L292 74.4L293.5 74.6L294.9 74.7L296.4 74.9L297.8 75.2L299.2 75.4L300.6 75.7L302 75.9L303.4 76.2L304.8 76.5L306.1 76.8L307.4 77.2L308.8 77.5L310.1 77.9L311.4 78.3L312.6 78.7L313.9 79.1L315.1 79.5L316.3 79.9L317.5 80.4L318.7 80.9L319.8 81.3L320.9 81.8L322 82.4L323.1 82.9L324.1 83.4L325.1 84L326.1 84.5L327.1 85.1L328 85.7L329 86.3L329.8 86.9L330.7 87.5L331.5 88.1L332.3 88.7L333.1 89.4L333.8 90L334.5 90.7L335.2 91.4L335.8 92L336.4 92.7L337 93.4L337.5 94.1L338 94.8L338.5 95.5L338.9 96.2L339.3 97L339.7 97.7L340 98.4L340.3 99.1L340.6 99.9L340.8 100.6L341 101.4L341.2 102.1L341.3 102.8L341.4 103.6L341.5 104.3L341.5 105.1L341.5 109.3L341.5 110.1L341.4 110.8L341.3 111.6L341.2 112.3L341 113.1L340.8 113.8L340.6 114.6L340.3 115.3L340 116L339.7 116.8L339.3 117.5L338.9 118.2L338.5 118.9L338 119.6L337.5 120.3L337 121L336.4 121.7L335.8 122.4L335.2 123.1L334.5 123.7L333.8 124.4L333.1 125L332.3 125.7L331.5 126.3L330.7 126.9L329.8 127.6L329 128.2L328 128.8L327.1 129.3L326.1 129.9L325.1 130.5L324.1 131L323.1 131.6L322 132.1L320.9 132.6L319.8 133.1L318.7 133.6L317.5 134L316.3 134.5L315.1 134.9L313.9 135.4L312.6 135.8L311.4 136.2L310.1 136.5L308.8 136.9L307.4 137.3L306.1 137.6L304.8 137.9L303.4 138.2L302 138.5L300.6 138.8L299.2 139L297.8 139.3L296.4 139.5L294.9 139.7L293.5 139.9L292 140L290.6 140.2L289.1 140.3L287.6 140.4L286.1 140.5L284.6 140.6L283.1 140.7L281.7 140.7L280.2 140.7L278.7 140.8L277.2 140.7L275.7 140.7L274.2 140.7L272.7 140.6L271.2 140.5L269.7 140.4L268.3 140.3L266.8 140.2L265.3 140L263.9 139.9L262.4 139.7L261 139.5L259.5 139.3L258.1 139L256.7 138.8L255.3 138.5L253.9 138.2L252.6 137.9L251.2 137.6L249.9 137.3L248.6 136.9L247.3 136.5L246 136.2L244.7 135.8L243.5 135.4L242.2 134.9L241 134.5L239.8 134L238.7 133.6L237.5 133.1L236.4 132.6L235.3 132.1L234.3 131.6L233.2 131L232.2 130.5L231.2 129.9L230.2 129.3L229.3 128.8L228.4 128.2L227.5 127.6L226.7 126.9L225.8 126.3L225 125.7L224.3 125L223.5 124.4L222.8 123.7L222.2 123.1L221.5 122.4L220.9 121.7L220.4 121L219.8 120.3L219.3 119.6L218.8 118.9L218.4 118.2L218 117.5L217.6 116.8L217.3 116L217 115.3L216.7 114.6L216.5 113.8L216.3 113.1L216.1 112.3L216 111.6L215.9 110.8L215.9 110.1L215.9 109.3Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M341.5 109.3L341.4 110.8L341.2 112.3L340.8 113.8L340.3 115.3L339.7 116.8L338.9 118.2L338 119.6L337 121L335.8 122.4L334.5 123.7L333.1 125L331.5 126.3L329.8 127.6L328 128.8L326.1 129.9L324.1 131L322 132.1L319.8 133.1L317.5 134L315.1 134.9L312.6 135.8L310.1 136.5L307.4 137.3L304.8 137.9L302 138.5L299.2 139L296.4 139.5L293.5 139.9L290.6 140.2L287.6 140.4L284.6 140.6L281.7 140.7L278.7 140.8L278.7 136.5L281.7 136.4L284.6 136.3L287.6 136.2L290.6 135.9L293.5 135.6L296.4 135.2L299.2 134.8L302 134.2L304.8 133.6L307.4 133L310.1 132.3L312.6 131.5L315.1 130.7L317.5 129.8L319.8 128.8L322 127.8L324.1 126.8L326.1 125.6L328 124.5L329.8 123.3L331.5 122.1L333.1 120.8L334.5 119.5L335.8 118.1L337 116.8L338 115.4L338.9 113.9L339.7 112.5L340.3 111L340.8 109.5L341.2 108.1L341.4 106.6L341.5 105.1Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M278.7 140.8L275.7 140.7L272.7 140.6L269.7 140.4L266.8 140.2L263.9 139.9L261 139.5L258.1 139L258.1 134.8L261 135.2L263.9 135.6L266.8 135.9L269.7 136.2L272.7 136.3L275.7 136.4L278.7 136.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M258.1 139L255.3 138.5L252.6 137.9L249.9 137.3L247.3 136.5L244.7 135.8L242.2 134.9L239.8 134L237.5 133.1L237.5 128.8L239.8 129.8L242.2 130.7L244.7 131.5L247.3 132.3L249.9 133L252.6 133.6L255.3 134.2L258.1 134.8Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M237.5 133.1L235.3 132.1L233.2 131L231.2 129.9L229.3 128.8L227.5 127.6L225.8 126.3L224.3 125L222.8 123.7L221.5 122.4L220.4 121L219.3 119.6L218.4 118.2L217.6 116.8L217.6 112.5L218.4 113.9L219.3 115.4L220.4 116.8L221.5 118.1L222.8 119.5L224.3 120.8L225.8 122.1L227.5 123.3L229.3 124.5L231.2 125.6L233.2 126.8L235.3 127.8L237.5 128.8Z\"/><path class=\"iso-top\" d=\"M217.6 116.8L217 115.3L216.5 113.8L216.1 112.3L215.9 110.8L215.9 109.3L215.9 105.1L215.9 106.6L216.1 108.1L216.5 109.5L217 111L217.6 112.5ZM333.1 120.8L331.5 122.1L329.8 123.3L328 124.5L326.1 125.6L324.1 126.8L322 127.8L319.8 128.8L317.5 129.8L315.1 130.7L312.6 131.5L310.1 132.3L307.4 133L304.8 133.6L302 134.2L299.2 134.8L296.4 135.2L293.5 135.6L290.6 135.9L287.6 136.2L284.6 136.3L281.7 136.4L278.7 136.5L275.7 136.4L272.7 136.3L269.7 136.2L266.8 135.9L263.9 135.6L261 135.2L258.1 134.8L255.3 134.2L252.6 133.6L249.9 133L247.3 132.3L244.7 131.5L242.2 130.7L239.8 129.8L237.5 128.8L235.3 127.8L233.2 126.8L231.2 125.6L229.3 124.5L227.5 123.3L225.8 122.1L224.3 120.8L222.8 119.5L221.5 118.1L220.4 116.8L219.3 115.4L218.4 113.9L217.6 112.5L217 111L216.5 109.5L216.1 108.1L215.9 106.6L215.9 105.1L215.9 103.6L216.1 102.1L216.5 100.6L217 99.1L217.6 97.7L218.4 96.2L219.3 94.8L220.4 93.4L221.5 92L222.8 90.7L224.3 89.4L225.8 88.1L227.5 86.9L229.3 85.7L231.2 84.5L233.2 83.4L235.3 82.4L237.5 81.3L239.8 80.4L242.2 79.5L244.7 78.7L247.3 77.9L249.9 77.2L252.6 76.5L255.3 75.9L258.1 75.4L261 74.9L263.9 74.6L266.8 74.2L269.7 74L272.7 73.8L275.7 73.7L278.7 73.7L281.7 73.7L284.6 73.8L287.6 74L290.6 74.2L293.5 74.6L296.4 74.9L299.2 75.4L302 75.9L304.8 76.5L307.4 77.2L310.1 77.9L312.6 78.7L315.1 79.5L317.5 80.4L319.8 81.3L322 82.4L324.1 83.4L326.1 84.5L328 85.7L329.8 86.9L331.5 88.1L333.1 89.4L334.5 90.7L335.8 92L337 93.4L338 94.8L338.9 96.2L339.7 97.7L340.3 99.1L340.8 100.6L341.2 102.1L341.4 103.6L341.5 105.1L341.4 106.6L341.2 108.1L340.8 109.5L340.3 111L339.7 112.5L338.9 113.9L338 115.4L337 116.8L335.8 118.1L334.5 119.5L333.1 120.8L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1L278.7 105.1Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M341.5 105.1L341.5 105.8L341.4 106.6L341.3 107.3L341.2 108.1L341 108.8L340.8 109.5L340.6 110.3L340.3 111L340 111.8L339.7 112.5L339.3 113.2L338.9 113.9L338.5 114.6L338 115.4L337.5 116.1L337 116.8L336.4 117.4L335.8 118.1L335.2 118.8L334.5 119.5L333.8 120.1L333.1 120.8L332.3 121.4L331.5 122.1L330.7 122.7L329.8 123.3L329 123.9L328 124.5L327.1 125.1L326.1 125.6L325.1 126.2L324.1 126.8L323.1 127.3L322 127.8L320.9 128.3L319.8 128.8L318.7 129.3L317.5 129.8L316.3 130.2L315.1 130.7L313.9 131.1L312.6 131.5L311.4 131.9L310.1 132.3L308.8 132.6L307.4 133L306.1 133.3L304.8 133.6L303.4 133.9L302 134.2L300.6 134.5L299.2 134.8L297.8 135L296.4 135.2L294.9 135.4L293.5 135.6L292 135.8L290.6 135.9L289.1 136.1L287.6 136.2L286.1 136.3L284.6 136.3L283.1 136.4L281.7 136.4L280.2 136.5L278.7 136.5L277.2 136.5L275.7 136.4L274.2 136.4L272.7 136.3L271.2 136.3L269.7 136.2L268.3 136.1L266.8 135.9L265.3 135.8L263.9 135.6L262.4 135.4L261 135.2L259.5 135L258.1 134.8L256.7 134.5L255.3 134.2L253.9 133.9L252.6 133.6L251.2 133.3L249.9 133L248.6 132.6L247.3 132.3L246 131.9L244.7 131.5L243.5 131.1L242.2 130.7L241 130.2L239.8 129.8L238.7 129.3L237.5 128.8L236.4 128.3L235.3 127.8L234.3 127.3L233.2 126.8L232.2 126.2L231.2 125.6L230.2 125.1L229.3 124.5L228.4 123.9L227.5 123.3L226.7 122.7L225.8 122.1L225 121.4L224.3 120.8L223.5 120.1L222.8 119.5L222.2 118.8L221.5 118.1L220.9 117.4L220.4 116.8L219.8 116.1L219.3 115.4L218.8 114.6L218.4 113.9L218 113.2L217.6 112.5L217.3 111.8L217 111L216.7 110.3L216.5 109.5L216.3 108.8L216.1 108.1L216 107.3L215.9 106.6L215.9 105.8L215.9 105.1\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M215.9 105.1L215.9 104.3L215.9 103.6L216 102.8L216.1 102.1L216.3 101.4L216.5 100.6L216.7 99.9L217 99.1L217.3 98.4L217.6 97.7L218 97L218.4 96.2L218.8 95.5L219.3 94.8L219.8 94.1L220.4 93.4L220.9 92.7L221.5 92L222.2 91.4L222.8 90.7L223.5 90L224.3 89.4L225 88.7L225.8 88.1L226.7 87.5L227.5 86.9L228.4 86.3L229.3 85.7L230.2 85.1L231.2 84.5L232.2 84L233.2 83.4L234.3 82.9L235.3 82.4L236.4 81.8L237.5 81.3L238.7 80.9L239.8 80.4L241 79.9L242.2 79.5L243.5 79.1L244.7 78.7L246 78.3L247.3 77.9L248.6 77.5L249.9 77.2L251.2 76.8L252.6 76.5L253.9 76.2L255.3 75.9L256.7 75.7L258.1 75.4L259.5 75.2L261 74.9L262.4 74.7L263.9 74.6L265.3 74.4L266.8 74.2L268.3 74.1L269.7 74L271.2 73.9L272.7 73.8L274.2 73.8L275.7 73.7L277.2 73.7L278.7 73.7L280.2 73.7L281.7 73.7L283.1 73.8L284.6 73.8L286.1 73.9L287.6 74L289.1 74.1L290.6 74.2L292 74.4L293.5 74.6L294.9 74.7L296.4 74.9L297.8 75.2L299.2 75.4L300.6 75.7L302 75.9L303.4 76.2L304.8 76.5L306.1 76.8L307.4 77.2L308.8 77.5L310.1 77.9L311.4 78.3L312.6 78.7L313.9 79.1L315.1 79.5L316.3 79.9L317.5 80.4L318.7 80.9L319.8 81.3L320.9 81.8L322 82.4L323.1 82.9L324.1 83.4L325.1 84L326.1 84.5L327.1 85.1L328 85.7L329 86.3L329.8 86.9L330.7 87.5L331.5 88.1L332.3 88.7L333.1 89.4L333.8 90L334.5 90.7L335.2 91.4L335.8 92L336.4 92.7L337 93.4L337.5 94.1L338 94.8L338.5 95.5L338.9 96.2L339.3 97L339.7 97.7L340 98.4L340.3 99.1L340.6 99.9L340.8 100.6L341 101.4L341.2 102.1L341.3 102.8L341.4 103.6L341.5 104.3L341.5 105.1L341.5 109.3L341.5 110.1L341.4 110.8L341.3 111.6L341.2 112.3L341 113.1L340.8 113.8L340.6 114.6L340.3 115.3L340 116L339.7 116.8L339.3 117.5L338.9 118.2L338.5 118.9L338 119.6L337.5 120.3L337 121L336.4 121.7L335.8 122.4L335.2 123.1L334.5 123.7L333.8 124.4L333.1 125L332.3 125.7L331.5 126.3L330.7 126.9L329.8 127.6L329 128.2L328 128.8L327.1 129.3L326.1 129.9L325.1 130.5L324.1 131L323.1 131.6L322 132.1L320.9 132.6L319.8 133.1L318.7 133.6L317.5 134L316.3 134.5L315.1 134.9L313.9 135.4L312.6 135.8L311.4 136.2L310.1 136.5L308.8 136.9L307.4 137.3L306.1 137.6L304.8 137.9L303.4 138.2L302 138.5L300.6 138.8L299.2 139L297.8 139.3L296.4 139.5L294.9 139.7L293.5 139.9L292 140L290.6 140.2L289.1 140.3L287.6 140.4L286.1 140.5L284.6 140.6L283.1 140.7L281.7 140.7L280.2 140.7L278.7 140.8L277.2 140.7L275.7 140.7L274.2 140.7L272.7 140.6L271.2 140.5L269.7 140.4L268.3 140.3L266.8 140.2L265.3 140L263.9 139.9L262.4 139.7L261 139.5L259.5 139.3L258.1 139L256.7 138.8L255.3 138.5L253.9 138.2L252.6 137.9L251.2 137.6L249.9 137.3L248.6 136.9L247.3 136.5L246 136.2L244.7 135.8L243.5 135.4L242.2 134.9L241 134.5L239.8 134L238.7 133.6L237.5 133.1L236.4 132.6L235.3 132.1L234.3 131.6L233.2 131L232.2 130.5L231.2 129.9L230.2 129.3L229.3 128.8L228.4 128.2L227.5 127.6L226.7 126.9L225.8 126.3L225 125.7L224.3 125L223.5 124.4L222.8 123.7L222.2 123.1L221.5 122.4L220.9 121.7L220.4 121L219.8 120.3L219.3 119.6L218.8 118.9L218.4 118.2L218 117.5L217.6 116.8L217.3 116L217 115.3L216.7 114.6L216.5 113.8L216.3 113.1L216.1 112.3L216 111.6L215.9 110.8L215.9 110.1L215.9 109.3Z\"/></g></g><g class=\"iso-solid\" data-p=\"41\" data-name=\"palanca.nudillo-\" data-mat=\"steel\" data-seamless=\"\"><path class=\"iso-fill\" data-r=\"fill\" d=\"M350.92 141.95L350.43 142.3L349.88 142.57L349.28 142.75L348.63 142.84L347.96 142.83L347.27 142.72L346.57 142.53L345.88 142.24L345.2 141.87L344.56 141.42L343.95 140.9L343.4 140.32L342.9 139.68L342.47 139.01L342.12 138.31L341.85 137.59L341.66 136.86L341.57 136.14L341.56 135.44L341.65 134.77L341.83 134.15L342.09 133.58L342.44 133.07L342.86 132.64L343.6 132L344.09 131.64L344.64 131.38L345.24 131.2L345.88 131.11L346.55 131.12L347.24 131.23L347.94 131.42L348.63 131.71L349.31 132.08L349.96 132.53L350.56 133.05L351.12 133.63L351.61 134.26L352.04 134.94L352.39 135.64L352.67 136.36L352.85 137.09L352.95 137.81L352.95 138.51L352.86 139.17L352.69 139.8L352.42 140.37L352.08 140.87L351.66 141.31Z\"/><path class=\"iso-shade\" data-shade=\"0\" data-r=\"s0\" d=\"M351.95 134.78L352.53 135.98L352.87 137.22L352.95 138.43L352.77 139.55L352.33 140.52L351.66 141.31L350.92 141.95L351.59 141.16L352.03 140.19L352.22 139.07L352.14 137.86L351.8 136.62L351.21 135.42Z\"/><path class=\"iso-shade\" data-shade=\"1\" data-r=\"s1\" d=\"M351.19 133.72L351.95 134.78L351.21 135.42L350.46 134.36Z\"/><path class=\"iso-shade\" data-shade=\"2\" data-r=\"s2\" d=\"M350.12 132.66L351.19 133.72L350.46 134.36L349.38 133.3Z\"/><path class=\"iso-shade\" data-shade=\"3\" data-r=\"s3\" d=\"M348.85 131.82L350.12 132.66L349.38 133.3L348.11 132.46Z\"/><path class=\"iso-top\" data-r=\"s4\" d=\"M343.6 132L344.45 131.46L345.45 131.16L346.55 131.12L347.7 131.34L348.85 131.82L348.11 132.46L346.96 131.98L345.81 131.76L344.71 131.8L343.71 132.1L342.86 132.64Z\"/><path class=\"iso-tn\" data-r=\"k0\" data-b=\"2\" d=\"M352.22 138.83L352.07 140.07L351.61 141.14L350.88 141.98L349.92 142.56L348.78 142.83L347.53 142.77L346.24 142.4L345 141.73L343.86 140.81L342.9 139.68L342.17 138.41L341.71 137.08L341.56 135.75L341.71 134.52L342.17 133.45L342.9 132.61L343.86 132.03L345 131.76L346.24 131.82L347.53 132.19L348.78 132.85L349.92 133.78L350.88 134.91L351.61 136.18L352.07 137.51Z\"/><path class=\"iso-tn\" data-r=\"k1\" d=\"\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" data-r=\"crease\" d=\"M342.86 132.64L343.81 132.05L344.94 131.77L346.19 131.81L347.47 132.16L348.72 132.82L349.87 133.73L350.84 134.85L351.58 136.12L352.05 137.45L352.22 138.77L352.08 140.01L351.64 141.09L350.92 141.95\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" data-r=\"edge\" d=\"M350.92 141.95L350.43 142.3L349.88 142.57L349.28 142.75L348.63 142.84L347.96 142.83L347.27 142.72L346.57 142.53L345.88 142.24L345.2 141.87L344.56 141.42L343.95 140.9L343.4 140.32L342.9 139.68L342.47 139.01L342.12 138.31L341.85 137.59L341.66 136.86L341.57 136.14L341.56 135.44L341.65 134.77L341.83 134.15L342.09 133.58L342.44 133.07L342.86 132.64L343.6 132L344.09 131.64L344.64 131.38L345.24 131.2L345.88 131.11L346.55 131.12L347.24 131.23L347.94 131.42L348.63 131.71L349.31 132.08L349.96 132.53L350.56 133.05L351.12 133.63L351.61 134.26L352.04 134.94L352.39 135.64L352.67 136.36L352.85 137.09L352.95 137.81L352.95 138.51L352.86 139.17L352.69 139.8L352.42 140.37L352.08 140.87L351.66 141.31Z\"/></g><g class=\"iso-solid\" data-p=\"43\" data-name=\"palanca.cuenca\" data-mat=\"copper\"><path class=\"iso-fill\" data-r=\"fill\" d=\"M337.37 143.01L337.37 135.75L341.56 132.13L395.95 147.83L395.95 155.08L391.76 158.71Z\"/><path class=\"iso-tn\" data-r=\"f0\" d=\"\"/><path class=\"iso-tn\" data-r=\"f1\" data-b=\"2\" d=\"M391.76 158.71L391.76 151.46L337.37 135.75L337.37 143.01Z\"/><path class=\"iso-tn\" data-r=\"f2\" data-b=\"3\" style=\"--f:1\" d=\"M391.76 151.46L395.95 147.83L341.56 132.13L337.37 135.75Z\"/><path class=\"iso-tn\" data-r=\"f3\" d=\"\"/><path class=\"iso-tn\" data-r=\"f4\" d=\"\"/><path class=\"iso-tn\" data-r=\"f5\" d=\"M395.95 155.08L391.76 158.71L391.76 151.46L395.95 147.83Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" data-r=\"crease\" d=\"M337.37 135.75L391.76 151.46M391.76 158.71L391.76 151.46L395.95 147.83\"/><path class=\"iso-line iso-bevel\" data-tone=\"lo\" data-r=\"v0\" opacity=\"1\" d=\"M391.98 158.14L391.98 151.65M391.98 158.14L391.76 158.71M391.98 151.65L395.73 148.4M395.73 148.4L395.95 147.83\"/><path class=\"iso-line iso-bevel\" data-tone=\"lo\" data-r=\"v1\" opacity=\"0\" d=\"\"/><path class=\"iso-line iso-bevel\" data-tone=\"lo\" data-r=\"v2\" opacity=\"0\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" data-r=\"edge\" d=\"M337.37 143.01L337.37 135.75L341.56 132.13L395.95 147.83L395.95 155.08L391.76 158.71Z\"/></g><g class=\"iso-solid\" data-p=\"42\" data-name=\"palanca.nudillo+\" data-mat=\"steel\" data-seamless=\"\"><path class=\"iso-fill\" data-r=\"fill\" d=\"M346.73 145.58L347.15 145.14L347.5 144.63L347.76 144.06L347.94 143.44L348.02 142.77L348.02 142.07L347.92 141.36L347.74 140.63L347.47 139.91L347.12 139.2L346.69 138.53L346.19 137.9L345.64 137.32L345.03 136.8L344.38 136.35L343.71 135.97L343.02 135.69L342.32 135.49L341.63 135.39L340.95 135.38L340.31 135.46L339.71 135.64L339.16 135.91L338.67 136.27L337.93 136.91L337.51 137.34L337.16 137.85L336.9 138.42L336.73 139.04L336.64 139.71L336.64 140.41L336.74 141.13L336.92 141.85L337.19 142.57L337.55 143.28L337.97 143.95L338.47 144.58L339.03 145.17L339.63 145.69L340.28 146.13L340.95 146.51L341.65 146.79L342.34 146.99L343.03 147.09L343.71 147.1L344.35 147.02L344.95 146.84L345.5 146.57L345.99 146.22Z\"/><path class=\"iso-shade\" data-shade=\"0\" data-r=\"s0\" d=\"M345.99 146.22L346.67 145.43L347.1 144.45L347.29 143.33L347.21 142.13L346.87 140.89L346.29 139.69L347.02 139.05L347.61 140.25L347.95 141.49L348.03 142.69L347.84 143.81L347.4 144.79L346.73 145.58Z\"/><path class=\"iso-shade\" data-shade=\"1\" data-r=\"s1\" d=\"M346.29 139.69L345.53 138.63L346.27 137.99L347.02 139.05Z\"/><path class=\"iso-shade\" data-shade=\"2\" data-r=\"s2\" d=\"M345.53 138.63L344.45 137.57L345.19 136.93L346.27 137.99Z\"/><path class=\"iso-shade\" data-shade=\"3\" data-r=\"s3\" d=\"M344.45 137.57L343.19 136.73L343.93 136.09L345.19 136.93Z\"/><path class=\"iso-top\" data-r=\"s4\" d=\"M343.19 136.73L342.04 136.25L340.88 136.03L339.78 136.06L338.78 136.36L337.93 136.91L338.67 136.27L339.52 135.72L340.52 135.42L341.62 135.39L342.78 135.61L343.93 136.09Z\"/><path class=\"iso-tn\" data-r=\"k0\" d=\"\"/><path class=\"iso-tn\" data-r=\"k1\" data-b=\"2\" d=\"M347.29 143.1L347.14 141.78L346.68 140.45L345.95 139.18L344.99 138.05L343.85 137.12L342.6 136.45L341.32 136.08L340.07 136.03L338.93 136.3L337.97 136.87L337.24 137.72L336.78 138.79L336.63 140.02L336.78 141.34L337.24 142.68L337.97 143.94L338.93 145.07L340.07 146L341.32 146.67L342.6 147.04L343.85 147.09L344.99 146.82L345.95 146.25L346.68 145.4L347.14 144.33Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" data-r=\"crease\" d=\"M345.99 146.22L346.71 145.36L347.15 144.28L347.29 143.04L347.12 141.72L346.66 140.38L345.91 139.12L344.94 138L343.8 137.08L342.54 136.43L341.26 136.07L340.01 136.03L338.88 136.32L337.93 136.91\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" data-r=\"edge\" d=\"M346.73 145.58L347.15 145.14L347.5 144.63L347.76 144.06L347.94 143.44L348.02 142.77L348.02 142.07L347.92 141.36L347.74 140.63L347.47 139.91L347.12 139.2L346.69 138.53L346.19 137.9L345.64 137.32L345.03 136.8L344.38 136.35L343.71 135.97L343.02 135.69L342.32 135.49L341.63 135.39L340.95 135.38L340.31 135.46L339.71 135.64L339.16 135.91L338.67 136.27L337.93 136.91L337.51 137.34L337.16 137.85L336.9 138.42L336.73 139.04L336.64 139.71L336.64 140.41L336.74 141.13L336.92 141.85L337.19 142.57L337.55 143.28L337.97 143.95L338.47 144.58L339.03 145.17L339.63 145.69L340.28 146.13L340.95 146.51L341.65 146.79L342.34 146.99L343.03 147.09L343.71 147.1L344.35 147.02L344.95 146.84L345.5 146.57L345.99 146.22Z\"/></g><g class=\"iso-solid\" data-p=\"44\" data-name=\"palanca.mango\" data-mat=\"chrome\" data-seamless=\"\"><path class=\"iso-fill\" data-r=\"fill\" d=\"M392.9 156.58L392.72 156.5L392.56 156.36L392.42 156.17L392.31 155.93L392.22 155.65L392.16 155.32L392.13 154.96L392.13 154.57L392.16 154.16L392.22 153.73L392.31 153.29L392.42 152.86L392.56 152.43L392.72 152.01L392.89 151.62L393.09 151.25L393.3 150.92L393.52 150.63L393.74 150.39L393.97 150.19L394.19 150.05L394.41 149.96L394.62 149.93L394.81 149.96L437.47 162.27L437.64 162.35L437.8 162.48L437.93 162.66L438.04 162.88L438.13 163.15L438.19 163.45L438.23 163.79L438.24 164.16L438.22 164.55L438.18 164.96L438.1 165.37L438.01 165.79L437.89 166.21L437.75 166.61L437.58 167L437.41 167.37L437.21 167.71L437.01 168.02L436.8 168.28L436.58 168.51L436.37 168.69L436.15 168.82L435.95 168.9L435.75 168.92L435.56 168.9Z\"/><path class=\"iso-shade\" data-shade=\"0\" data-r=\"s0\" d=\"M392.9 156.58L392.52 156.32L392.26 155.8L434.92 168.11L435.18 168.64L435.56 168.9Z\"/><path class=\"iso-shade\" data-shade=\"1\" data-r=\"s1\" d=\"M392.26 155.8L392.15 155.2L434.81 167.51L434.92 168.11Z\"/><path class=\"iso-shade\" data-shade=\"2\" data-r=\"s2\" d=\"M392.15 155.2L392.15 154.35L434.81 166.67L434.81 167.51Z\"/><path class=\"iso-shade\" data-shade=\"3\" data-r=\"s3\" d=\"M392.15 154.35L392.3 153.33L434.96 165.64L434.81 166.67ZM394.42 149.96L394.81 149.96L437.47 162.27L437.08 162.27Z\"/><path class=\"iso-top\" data-r=\"s4\" d=\"M392.3 153.33L392.67 152.13L393.19 151.09L393.8 150.33L394.42 149.96L437.08 162.27L436.46 162.64L435.85 163.4L435.33 164.45L434.96 165.64Z\"/><path class=\"iso-tn\" data-r=\"k0\" d=\"\"/><path class=\"iso-tn\" data-r=\"k1\" d=\"M434.79 167.08L434.92 165.82L435.3 164.53L435.86 163.4L436.52 162.6L437.18 162.25L437.73 162.42L438.11 163.06L438.24 164.09L438.11 165.35L437.73 166.64L437.18 167.77L436.52 168.57L435.86 168.92L435.3 168.75L434.92 168.11Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" data-r=\"crease\" d=\"M435.56 168.9L435.08 168.49L434.82 167.63L434.82 166.47L435.08 165.17L435.56 163.93L436.18 162.95L436.85 162.37L437.47 162.27\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" data-r=\"edge\" d=\"M392.9 156.58L392.72 156.5L392.56 156.36L392.42 156.17L392.31 155.93L392.22 155.65L392.16 155.32L392.13 154.96L392.13 154.57L392.16 154.16L392.22 153.73L392.31 153.29L392.42 152.86L392.56 152.43L392.72 152.01L392.89 151.62L393.09 151.25L393.3 150.92L393.52 150.63L393.74 150.39L393.97 150.19L394.19 150.05L394.41 149.96L394.62 149.93L394.81 149.96L437.47 162.27L437.64 162.35L437.8 162.48L437.93 162.66L438.04 162.88L438.13 163.15L438.19 163.45L438.23 163.79L438.24 164.16L438.22 164.55L438.18 164.96L438.1 165.37L438.01 165.79L437.89 166.21L437.75 166.61L437.58 167L437.41 167.37L437.21 167.71L437.01 168.02L436.8 168.28L436.58 168.51L436.37 168.69L436.15 168.82L435.95 168.9L435.75 168.92L435.56 168.9Z\"/></g><g class=\"iso-solid\" data-p=\"14\" data-name=\"tapa.corona.10\" data-mat=\"gunmetal\"><path class=\"iso-fill\" data-r=\"fill\" d=\"M286.87 73.95L283.64 86.22L268.82 86.71L262.41 74.75L262.41 59.82L268.44 59.17L274.56 58.82L280.72 58.77L286.87 59.02Z\"/><path class=\"iso-tn\" data-r=\"f0\" data-b=\"3\" d=\"M268.82 71.78L262.41 59.82L262.41 74.75L268.82 86.71Z\"/><path class=\"iso-tn\" data-r=\"f1\" d=\"\"/><path class=\"iso-tn\" data-r=\"f2\" d=\"\"/><path class=\"iso-tn\" data-r=\"f3\" d=\"\"/><path class=\"iso-tn\" data-r=\"f4\" d=\"\"/><path class=\"iso-tn\" data-r=\"f5\" d=\"M286.87 59.02L283.64 71.29L283.64 86.22L286.87 73.95Z\"/><path class=\"iso-tn\" data-r=\"f6\" data-b=\"1\" d=\"M283.64 71.29L268.82 71.78L268.82 86.71L283.64 86.22Z\"/><path class=\"iso-top\" data-r=\"top\" transform=\"matrix(1.06653 0.30788 -0.61576 0.53326 300 96.31)\" d=\"M-41.85 -21.85L-56.062 -36.062L-52.354 -39.424L-48.334 -42.405L-44.041 -44.978L-39.517 -47.118L-31.825 -28.548Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" data-r=\"crease\" d=\"M286.87 59.02L283.64 71.29L268.82 71.78L262.41 59.82\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" data-r=\"edge\" d=\"M286.87 73.95L283.64 86.22L268.82 86.71L262.41 74.75L262.41 59.82L268.44 59.17L274.56 58.82L280.72 58.77L286.87 59.02Z\"/></g><g class=\"iso-solid\" data-p=\"15\" data-name=\"tapa.corona.11\" data-mat=\"gunmetal\"><path class=\"iso-fill\" data-r=\"fill\" d=\"M310.07 77.89L297.7 88.61L283.64 86.22L283.64 71.29L286.87 59.02L292.93 59.57L298.86 60.42L304.59 61.55L310.07 62.96Z\"/><path class=\"iso-tn\" data-r=\"f0\" d=\"\"/><path class=\"iso-tn\" data-r=\"f1\" d=\"\"/><path class=\"iso-tn\" data-r=\"f2\" d=\"\"/><path class=\"iso-tn\" data-r=\"f3\" d=\"\"/><path class=\"iso-tn\" data-r=\"f4\" d=\"\"/><path class=\"iso-tn\" data-r=\"f5\" d=\"M310.07 62.96L297.7 73.68L297.7 88.61L310.07 77.89Z\"/><path class=\"iso-tn\" data-r=\"f6\" data-b=\"2\" d=\"M297.7 73.68L283.64 71.29L283.64 86.22L297.7 88.61Z\"/><path class=\"iso-top\" data-r=\"top\" transform=\"matrix(1.06653 0.30788 -0.61576 0.53326 300 96.31)\" d=\"M-31.825 -28.548L-39.517 -47.118L-34.805 -48.804L-29.95 -50.02L-24.999 -50.754L-20 -51L-20 -30.9Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" data-r=\"crease\" d=\"M310.07 62.96L297.7 73.68L283.64 71.29\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" data-r=\"edge\" d=\"M310.07 77.89L297.7 88.61L283.64 86.22L283.64 71.29L286.87 59.02L292.93 59.57L298.86 60.42L304.59 61.55L310.07 62.96Z\"/></g><g class=\"iso-solid\" data-p=\"13\" data-name=\"tapa.corona.9\" data-mat=\"gunmetal\"><path class=\"iso-fill\" data-r=\"fill\" d=\"M268.82 86.71L255.5 89.99L240.43 80.17L240.43 65.24L245.5 63.49L250.89 61.99L256.55 60.77L262.41 59.82L268.82 71.78Z\"/><path class=\"iso-tn\" data-r=\"f0\" data-b=\"3\" d=\"M255.5 75.06L240.43 65.24L240.43 80.17L255.5 89.99Z\"/><path class=\"iso-tn\" data-r=\"f1\" d=\"\"/><path class=\"iso-tn\" data-r=\"f2\" d=\"\"/><path class=\"iso-tn\" data-r=\"f3\" d=\"\"/><path class=\"iso-tn\" data-r=\"f4\" d=\"\"/><path class=\"iso-tn\" data-r=\"f5\" d=\"\"/><path class=\"iso-tn\" data-r=\"f6\" style=\"--f:0.984375\" d=\"M268.82 71.78L255.5 75.06L255.5 89.99L268.82 86.71Z\"/><path class=\"iso-top\" data-r=\"top\" transform=\"matrix(1.06653 0.30788 -0.61576 0.53326 300 96.31)\" d=\"M-48.548 -11.825L-67.118 -19.517L-64.978 -24.041L-62.405 -28.334L-59.424 -32.354L-56.062 -36.062L-41.85 -21.85Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" data-r=\"crease\" d=\"M268.82 71.78L255.5 75.06L240.43 65.24\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" data-r=\"edge\" d=\"M268.82 86.71L255.5 89.99L240.43 80.17L240.43 65.24L245.5 63.49L250.89 61.99L256.55 60.77L262.41 59.82L268.82 71.78Z\"/></g><g class=\"iso-solid\" data-p=\"45\" data-name=\"palanca.puno\" data-mat=\"rubber\" data-seamless=\"\"><path class=\"iso-fill\" data-r=\"fill\" d=\"M435.08 170.55L434.81 170.43L434.57 170.22L434.37 169.94L434.2 169.58L434.07 169.15L433.98 168.66L433.93 168.12L433.93 167.53L433.98 166.91L434.07 166.27L434.19 165.62L434.36 164.96L434.57 164.32L434.81 163.7L435.08 163.11L435.37 162.56L435.68 162.07L436.01 161.63L436.34 161.26L436.68 160.97L437.02 160.76L437.34 160.62L437.66 160.58L437.95 160.62L465.68 168.62L465.94 168.74L466.17 168.93L466.37 169.2L466.54 169.53L466.67 169.93L466.76 170.39L466.82 170.9L466.83 171.45L466.8 172.04L466.73 172.65L466.63 173.27L466.48 173.9L466.3 174.52L466.09 175.13L465.85 175.72L465.58 176.27L465.29 176.78L464.99 177.24L464.67 177.64L464.35 177.98L464.02 178.24L463.7 178.44L463.39 178.56L463.09 178.6L462.81 178.56Z\"/><path class=\"iso-shade\" data-shade=\"0\" data-r=\"s0\" d=\"M435.08 170.55L434.69 170.34L434.37 169.94L434.13 169.38L461.86 177.38L462.1 177.95L462.42 178.34L462.81 178.56Z\"/><path class=\"iso-shade\" data-shade=\"1\" data-r=\"s1\" d=\"M434.13 169.38L433.96 168.48L461.69 176.48L461.86 177.38Z\"/><path class=\"iso-shade\" data-shade=\"2\" data-r=\"s2\" d=\"M433.96 168.48L433.93 167.86L433.95 167.21L461.68 175.21L461.66 175.87L461.69 176.48Z\"/><path class=\"iso-shade\" data-shade=\"3\" data-r=\"s3\" d=\"M433.95 167.21L434.04 166.45L434.18 165.67L461.91 173.68L461.77 174.46L461.68 175.21ZM437.37 160.62L437.95 160.62L465.68 168.62L465.1 168.62Z\"/><path class=\"iso-top\" data-r=\"s4\" d=\"M434.18 165.67L434.52 164.47L434.97 163.32L435.52 162.31L436.13 161.49L436.75 160.92L437.37 160.62L465.1 168.62L464.48 168.92L463.85 169.5L463.25 170.32L462.7 171.33L462.25 172.47L461.91 173.68Z\"/><path class=\"iso-tn\" data-r=\"k0\" d=\"\"/><path class=\"iso-tn\" data-r=\"k1\" d=\"M461.66 175.83L461.75 174.59L462.01 173.29L462.42 172.01L462.95 170.83L463.58 169.84L464.24 169.11L464.91 168.68L465.54 168.59L466.07 168.84L466.48 169.41L466.74 170.27L466.83 171.35L466.74 172.59L466.48 173.89L466.07 175.17L465.54 176.35L464.91 177.34L464.24 178.07L463.58 178.5L462.95 178.59L462.42 178.34L462.01 177.77L461.75 176.91Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" data-r=\"crease\" d=\"M462.81 178.56L462.26 178.18L461.87 177.43L461.68 176.37L461.69 175.09L461.91 173.68L462.32 172.27L462.88 170.96L463.56 169.87L464.29 169.07L465.02 168.65L465.68 168.62\"/><path class=\"iso-line\" data-tone=\"faint\" data-r=\"inner\" d=\"M436.94 171.04L436.46 170.48L436.16 169.57L436.06 168.38L436.18 167.01L436.5 165.58L436.99 164.2L437.62 162.98L438.34 162.02L439.08 161.41L439.79 161.19M460.41 177.82L459.92 177.26L459.62 176.35L459.53 175.16L459.64 173.79L459.96 172.35L460.46 170.97L461.09 169.75L461.8 168.8L462.54 168.18L463.25 167.97\"/><path class=\"iso-line\" data-tone=\"lo\" data-r=\"r0\" opacity=\"1\" d=\"M436.06 168.44L459.53 175.21M436.09 167.71L459.56 174.49M436.19 166.95L459.65 173.72M436.34 166.16L459.81 172.94M436.56 165.38L460.02 172.15M436.82 164.62L460.28 171.39M437.13 163.89L460.59 170.67M437.47 163.23L460.94 170M437.85 162.63L461.31 169.41M438.24 162.13L461.71 168.9M438.65 161.72L462.11 168.49M436.19 169.72L459.65 176.49M436.09 169.11L459.56 175.89\"/><path class=\"iso-line\" data-tone=\"lo\" data-r=\"r1\" opacity=\"0.938\" d=\"M436.34 170.23L459.81 177\"/><path class=\"iso-line\" data-tone=\"lo\" data-r=\"r2\" opacity=\"0.781\" d=\"M439.05 161.43L462.52 168.2\"/><path class=\"iso-line\" data-tone=\"lo\" data-r=\"r3\" opacity=\"0.594\" d=\"M436.56 170.65L460.02 177.42\"/><path class=\"iso-line\" data-tone=\"lo\" data-r=\"r4\" opacity=\"0.344\" d=\"M439.45 161.25L462.91 168.02\"/><path class=\"iso-line\" data-tone=\"lo\" data-r=\"r5\" opacity=\"0.125\" d=\"M436.82 170.95L460.28 177.73\"/><path class=\"iso-line\" data-tone=\"lo\" data-r=\"r6\" opacity=\"0\" d=\"\"/><path class=\"iso-line\" data-tone=\"lo\" data-r=\"r7\" opacity=\"0\" d=\"\"/><path class=\"iso-line\" data-tone=\"lo\" data-r=\"r8\" opacity=\"0\" d=\"\"/><path class=\"iso-line\" data-tone=\"lo\" data-r=\"r9\" opacity=\"0\" d=\"\"/><path class=\"iso-line\" data-tone=\"lo\" data-r=\"r10\" opacity=\"0\" d=\"\"/><path class=\"iso-line\" data-tone=\"lo\" data-r=\"r11\" opacity=\"0\" d=\"\"/><path class=\"iso-line\" data-tone=\"lo\" data-r=\"r12\" opacity=\"0\" d=\"\"/><path class=\"iso-line\" data-tone=\"lo\" data-r=\"r13\" opacity=\"0\" d=\"\"/><path class=\"iso-line\" data-tone=\"lo\" data-r=\"r14\" opacity=\"0\" d=\"\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" data-r=\"edge\" d=\"M435.08 170.55L434.81 170.43L434.57 170.22L434.37 169.94L434.2 169.58L434.07 169.15L433.98 168.66L433.93 168.12L433.93 167.53L433.98 166.91L434.07 166.27L434.19 165.62L434.36 164.96L434.57 164.32L434.81 163.7L435.08 163.11L435.37 162.56L435.68 162.07L436.01 161.63L436.34 161.26L436.68 160.97L437.02 160.76L437.34 160.62L437.66 160.58L437.95 160.62L465.68 168.62L465.94 168.74L466.17 168.93L466.37 169.2L466.54 169.53L466.67 169.93L466.76 170.39L466.82 170.9L466.83 171.45L466.8 172.04L466.73 172.65L466.63 173.27L466.48 173.9L466.3 174.52L466.09 175.13L465.85 175.72L465.58 176.27L465.29 176.78L464.99 177.24L464.67 177.64L464.35 177.98L464.02 178.24L463.7 178.44L463.39 178.56L463.09 178.6L462.81 178.56Z\"/></g><g class=\"iso-solid\" data-p=\"16\" data-name=\"tapa.corona.12\" data-mat=\"gunmetal\"><path class=\"iso-fill\" data-r=\"fill\" d=\"M328.5 85.97L308.86 93.5L297.7 88.61L297.7 73.68L310.07 62.96L315.25 64.63L320.08 66.55L324.51 68.69L328.5 71.04Z\"/><path class=\"iso-tn\" data-r=\"f0\" d=\"\"/><path class=\"iso-tn\" data-r=\"f1\" d=\"\"/><path class=\"iso-tn\" data-r=\"f2\" d=\"\"/><path class=\"iso-tn\" data-r=\"f3\" d=\"\"/><path class=\"iso-tn\" data-r=\"f4\" d=\"\"/><path class=\"iso-tn\" data-r=\"f5\" d=\"M328.5 71.04L308.86 78.57L308.86 93.5L328.5 85.97Z\"/><path class=\"iso-tn\" data-r=\"f6\" data-b=\"3\" d=\"M308.86 78.57L297.7 73.68L297.7 88.61L308.86 93.5Z\"/><path class=\"iso-top\" data-r=\"top\" transform=\"matrix(1.06653 0.30788 -0.61576 0.53326 300 96.31)\" d=\"M-20 -30.9L-20 -51L-15.001 -50.754L-10.05 -50.02L-5.195 -48.804L-0.483 -47.118L-8.175 -28.548Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" data-r=\"crease\" d=\"M328.5 71.04L308.86 78.57L297.7 73.68\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" data-r=\"edge\" d=\"M328.5 85.97L308.86 93.5L297.7 88.61L297.7 73.68L310.07 62.96L315.25 64.63L320.08 66.55L324.51 68.69L328.5 71.04Z\"/></g><g class=\"iso-solid\" data-p=\"12\" data-name=\"tapa.corona.8\" data-mat=\"gunmetal\"><path class=\"iso-fill\" data-r=\"fill\" d=\"M255.5 89.99L245.71 95.57L224.28 89.39L224.28 74.45L227.62 71.86L231.45 69.45L235.74 67.24L240.43 65.24L255.5 75.06Z\"/><path class=\"iso-tn\" data-r=\"f0\" data-b=\"2\" style=\"--f:0.5\" d=\"M245.71 80.64L224.28 74.45L224.28 89.39L245.71 95.57Z\"/><path class=\"iso-tn\" data-r=\"f1\" d=\"\"/><path class=\"iso-tn\" data-r=\"f2\" d=\"\"/><path class=\"iso-tn\" data-r=\"f3\" d=\"\"/><path class=\"iso-tn\" data-r=\"f4\" d=\"\"/><path class=\"iso-tn\" data-r=\"f5\" d=\"\"/><path class=\"iso-tn\" data-r=\"f6\" d=\"M255.5 75.06L245.71 80.64L245.71 95.57L255.5 89.99Z\"/><path class=\"iso-top\" data-r=\"top\" transform=\"matrix(1.06653 0.30788 -0.61576 0.53326 300 96.31)\" d=\"M-50.9 0L-71 0L-70.754 -4.999L-70.02 -9.95L-68.804 -14.805L-67.118 -19.517L-48.548 -11.825Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" data-r=\"crease\" d=\"M255.5 75.06L245.71 80.64L224.28 74.45\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" data-r=\"edge\" d=\"M255.5 89.99L245.71 95.57L224.28 89.39L224.28 74.45L227.62 71.86L231.45 69.45L235.74 67.24L240.43 65.24L255.5 75.06Z\"/></g><g class=\"iso-solid\" data-p=\"17\" data-name=\"tapa.corona.13\" data-mat=\"gunmetal\"><path class=\"iso-fill\" data-r=\"fill\" d=\"M339.34 96.96L315.43 100.16L308.86 93.5L308.86 78.57L328.5 71.04L332.01 73.57L335 76.27L337.45 79.09L339.34 82.03Z\"/><path class=\"iso-tn\" data-r=\"f0\" d=\"\"/><path class=\"iso-tn\" data-r=\"f1\" d=\"\"/><path class=\"iso-tn\" data-r=\"f2\" d=\"\"/><path class=\"iso-tn\" data-r=\"f3\" d=\"\"/><path class=\"iso-tn\" data-r=\"f4\" d=\"\"/><path class=\"iso-tn\" data-r=\"f5\" data-b=\"1\" d=\"M339.34 82.03L315.43 85.23L315.43 100.16L339.34 96.96Z\"/><path class=\"iso-tn\" data-r=\"f6\" data-b=\"3\" d=\"M315.43 85.23L308.86 78.57L308.86 93.5L315.43 100.16Z\"/><path class=\"iso-top\" data-r=\"top\" transform=\"matrix(1.06653 0.30788 -0.61576 0.53326 300 96.31)\" d=\"M-8.175 -28.548L-0.483 -47.118L4.041 -44.978L8.334 -42.405L12.354 -39.424L16.062 -36.062L1.85 -21.85Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" data-r=\"crease\" d=\"M339.34 82.03L315.43 85.23L308.86 78.57\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" data-r=\"edge\" d=\"M339.34 96.96L315.43 100.16L308.86 93.5L308.86 78.57L328.5 71.04L332.01 73.57L335 76.27L337.45 79.09L339.34 82.03Z\"/></g><g class=\"iso-solid\" data-p=\"11\" data-name=\"tapa.corona.7\" data-mat=\"gunmetal\"><path class=\"iso-fill\" data-r=\"fill\" d=\"M245.71 95.57L240.94 102.6L216.4 100.99L216.4 86.06L217.5 83.03L219.2 80.06L221.46 77.2L224.28 74.45L245.71 80.64Z\"/><path class=\"iso-tn\" data-r=\"f0\" data-b=\"2\" d=\"M240.94 87.67L216.4 86.06L216.4 100.99L240.94 102.6Z\"/><path class=\"iso-tn\" data-r=\"f1\" d=\"\"/><path class=\"iso-tn\" data-r=\"f2\" d=\"\"/><path class=\"iso-tn\" data-r=\"f3\" d=\"\"/><path class=\"iso-tn\" data-r=\"f4\" d=\"\"/><path class=\"iso-tn\" data-r=\"f5\" d=\"\"/><path class=\"iso-tn\" data-r=\"f6\" d=\"M245.71 80.64L240.94 87.67L240.94 102.6L245.71 95.57Z\"/><path class=\"iso-top\" data-r=\"top\" transform=\"matrix(1.06653 0.30788 -0.61576 0.53326 300 96.31)\" d=\"M-48.548 11.825L-67.118 19.517L-68.804 14.805L-70.02 9.95L-70.754 4.999L-71 0L-50.9 0Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" data-r=\"crease\" d=\"M245.71 80.64L240.94 87.67L216.4 86.06\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" data-r=\"edge\" d=\"M245.71 95.57L240.94 102.6L216.4 100.99L216.4 86.06L217.5 83.03L219.2 80.06L221.46 77.2L224.28 74.45L245.71 80.64Z\"/></g><g class=\"iso-solid\" data-p=\"18\" data-name=\"tapa.corona.14\" data-mat=\"gunmetal\"><path class=\"iso-fill\" data-r=\"fill\" d=\"M341.44 106.12L340.94 109.19L316.4 107.57L315.43 100.16L315.43 85.23L339.34 82.03L340.64 85.04L341.34 88.1L341.44 91.18Z\"/><path class=\"iso-tn\" data-r=\"f0\" d=\"\"/><path class=\"iso-tn\" data-r=\"f1\" d=\"\"/><path class=\"iso-tn\" data-r=\"f2\" d=\"\"/><path class=\"iso-tn\" data-r=\"f3\" d=\"\"/><path class=\"iso-tn\" data-r=\"f4\" d=\"M341.44 91.18L340.94 94.26L340.94 109.19L341.44 106.12Z\"/><path class=\"iso-tn\" data-r=\"f5\" data-b=\"2\" d=\"M340.94 94.26L316.4 92.64L316.4 107.57L340.94 109.19Z\"/><path class=\"iso-tn\" data-r=\"f6\" data-b=\"3\" d=\"M316.4 92.64L315.43 85.23L315.43 100.16L316.4 107.57Z\"/><path class=\"iso-top\" data-r=\"top\" transform=\"matrix(1.06653 0.30788 -0.61576 0.53326 300 96.31)\" d=\"M1.85 -21.85L16.062 -36.062L19.424 -32.354L22.405 -28.334L24.978 -24.041L27.118 -19.517L8.548 -11.825Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" data-r=\"crease\" d=\"M341.44 91.18L340.94 94.26L316.4 92.64L315.43 85.23\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" data-r=\"edge\" d=\"M341.44 106.12L340.94 109.19L316.4 107.57L315.43 100.16L315.43 85.23L339.34 82.03L340.64 85.04L341.34 88.1L341.44 91.18Z\"/></g><g class=\"iso-part\" data-p=\"31\" data-name=\"piston\" data-mat=\"chrome\" transform=\"translate(0 0.01)\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M241.7 77L241.8 76.3L241.9 75.5L242.1 74.8L242.3 74.1L242.6 73.3L243 72.6L243.4 71.9L243.9 71.2L244.4 70.5L245 69.8L245.6 69.1L246.3 68.4L247.1 67.8L247.9 67.2L248.7 66.5L249.6 65.9L250.6 65.4L251.5 64.8L252.6 64.3L253.7 63.7L254.8 63.3L256 62.8L257.2 62.3L258.4 61.9L259.7 61.5L261 61.1L262.3 60.8L263.6 60.5L265 60.2L266.4 59.9L267.8 59.7L269.3 59.5L270.7 59.3L272.2 59.2L273.7 59L275.2 59L276.7 58.9L278.2 58.9L279.7 58.9L281.2 58.9L282.7 59L284.1 59.1L285.6 59.2L287.1 59.4L288.5 59.5L290 59.8L291.4 60L292.8 60.3L294.2 60.6L295.5 60.9L296.8 61.3L298.1 61.6L299.4 62L300.6 62.5L301.8 62.9L302.9 63.4L304 63.9L305.1 64.4L306.1 65L307.1 65.6L308 66.1L308.9 66.7L309.8 67.4L310.5 68L311.3 68.7L311.9 69.3L312.6 70L313.1 70.7L313.6 71.4L314.1 72.1L314.5 72.8L314.8 73.6L315.1 74.3L315.3 75L315.5 75.8L315.6 76.5L315.6 77.3L315.6 105L315.6 105.8L315.5 106.5L315.4 107.3L315.2 108L314.9 108.7L314.6 109.5L314.2 110.2L313.7 110.9L313.2 111.6L312.7 112.3L312.1 113L311.4 113.7L310.7 114.3L309.9 115L309.1 115.6L308.2 116.2L307.3 116.8L306.3 117.3L305.3 117.9L304.2 118.4L303.1 118.9L302 119.4L300.8 119.9L299.6 120.3L298.3 120.7L297 121.1L295.7 121.5L294.4 121.8L293 122.1L291.6 122.4L290.2 122.6L288.8 122.8L287.3 123L285.9 123.2L284.4 123.3L282.9 123.4L281.4 123.5L279.9 123.5L278.4 123.6L276.9 123.5L275.4 123.5L273.9 123.4L272.5 123.3L271 123.2L269.5 123L268.1 122.8L266.7 122.6L265.3 122.3L263.9 122L262.5 121.7L261.2 121.4L259.9 121L258.6 120.6L257.4 120.2L256.2 119.7L255 119.3L253.9 118.8L252.8 118.3L251.7 117.7L250.7 117.2L249.8 116.6L248.9 116L248 115.4L247.2 114.7L246.4 114.1L245.7 113.4L245.1 112.8L244.5 112.1L243.9 111.4L243.5 110.7L243 110L242.7 109.2L242.4 108.5L242.1 107.8L241.9 107L241.8 106.3L241.7 105.5L241.7 104.8Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M315.6 105.8L315.3 107.3L314.9 108.8L314.2 110.2L313.2 111.6L312 113L310.7 114.3L309.1 115.6L307.3 116.8L305.3 117.9L303.2 118.9L300.9 119.8L298.4 120.7L295.8 121.4L293.2 122.1L290.4 122.6L287.5 123L284.6 123.3L281.6 123.5L278.7 123.6L278.7 95.8L281.6 95.8L284.6 95.6L287.5 95.3L290.4 94.9L293.2 94.3L295.8 93.7L298.4 93L300.9 92.1L303.2 91.2L305.3 90.1L307.3 89L309.1 87.8L310.7 86.6L312 85.3L313.2 83.9L314.2 82.5L314.9 81L315.3 79.6L315.6 78.1Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M278.7 123.6L275.7 123.5L272.7 123.3L269.8 123L267 122.6L267 94.9L269.8 95.3L272.7 95.6L275.7 95.8L278.7 95.8Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M267 122.6L264.2 122.1L261.5 121.4L258.9 120.7L256.5 119.8L254.2 118.9L254.2 91.2L256.5 92.1L258.9 93L261.5 93.7L264.2 94.3L267 94.9Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M254.2 118.9L252 117.9L250 116.8L248.3 115.6L246.7 114.3L245.3 113L244.1 111.6L243.2 110.2L243.2 82.5L244.1 83.9L245.3 85.3L246.7 86.6L248.3 87.8L250 89L252 90.1L254.2 91.2Z\"/><path class=\"iso-top\" d=\"M243.2 110.2L242.5 108.8L242 107.3L241.8 105.8L241.8 78.1L242 79.6L242.5 81L243.2 82.5ZM310.7 86.6L309.1 87.8L307.3 89L305.3 90.1L303.2 91.2L300.9 92.1L298.4 93L295.8 93.7L293.2 94.3L290.4 94.9L287.5 95.3L284.6 95.6L281.6 95.8L278.7 95.8L275.7 95.8L272.7 95.6L269.8 95.3L267 94.9L264.2 94.3L261.5 93.7L258.9 93L256.5 92.1L254.2 91.2L252 90.1L250 89L248.3 87.8L246.7 86.6L245.3 85.3L244.1 83.9L243.2 82.5L242.5 81L242 79.6L241.8 78.1L241.8 76.6L242 75.1L242.5 73.7L243.2 72.2L244.1 70.8L245.3 69.4L246.7 68.1L248.3 66.9L250 65.7L252 64.6L254.2 63.5L256.5 62.6L258.9 61.7L261.5 61L264.2 60.4L267 59.8L269.8 59.4L272.7 59.1L275.7 58.9L278.7 58.9L281.6 58.9L284.6 59.1L287.5 59.4L290.4 59.8L293.2 60.4L295.8 61L298.4 61.7L300.9 62.6L303.2 63.5L305.3 64.6L307.3 65.7L309.1 66.9L310.7 68.1L312 69.4L313.2 70.8L314.2 72.2L314.9 73.7L315.3 75.1L315.6 76.6L315.6 78.1L315.3 79.6L314.9 81L314.2 82.5L313.2 83.9L312 85.3L310.7 86.6L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3L278.7 77.3Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" d=\"M315.6 77.3L315.6 78.1L315.5 78.8L315.3 79.6L315.1 80.3L314.9 81L314.5 81.8L314.2 82.5L313.7 83.2L313.2 83.9L312.7 84.6L312 85.3L311.4 85.9L310.7 86.6L309.9 87.2L309.1 87.8L308.2 88.4L307.3 89L306.3 89.6L305.3 90.1L304.3 90.7L303.2 91.2L302 91.7L300.9 92.1L299.7 92.6L298.4 93L297.1 93.3L295.8 93.7L294.5 94L293.2 94.3L291.8 94.6L290.4 94.9L288.9 95.1L287.5 95.3L286.1 95.4L284.6 95.6L283.1 95.7L281.6 95.8L280.2 95.8L278.7 95.8L277.2 95.8L275.7 95.8L274.2 95.7L272.7 95.6L271.3 95.4L269.8 95.3L268.4 95.1L267 94.9L265.6 94.6L264.2 94.3L262.8 94L261.5 93.7L260.2 93.3L258.9 93L257.7 92.6L256.5 92.1L255.3 91.7L254.2 91.2L253.1 90.7L252 90.1L251 89.6L250 89L249.1 88.4L248.3 87.8L247.4 87.2L246.7 86.6L246 85.9L245.3 85.3L244.7 84.6L244.1 83.9L243.6 83.2L243.2 82.5L242.8 81.8L242.5 81L242.2 80.3L242 79.6L241.8 78.8L241.8 78.1L241.7 77.3\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" d=\"M241.7 77L241.8 76.3L241.9 75.5L242.1 74.8L242.3 74.1L242.6 73.3L243 72.6L243.4 71.9L243.9 71.2L244.4 70.5L245 69.8L245.6 69.1L246.3 68.4L247.1 67.8L247.9 67.2L248.7 66.5L249.6 65.9L250.6 65.4L251.5 64.8L252.6 64.3L253.7 63.7L254.8 63.3L256 62.8L257.2 62.3L258.4 61.9L259.7 61.5L261 61.1L262.3 60.8L263.6 60.5L265 60.2L266.4 59.9L267.8 59.7L269.3 59.5L270.7 59.3L272.2 59.2L273.7 59L275.2 59L276.7 58.9L278.2 58.9L279.7 58.9L281.2 58.9L282.7 59L284.1 59.1L285.6 59.2L287.1 59.4L288.5 59.5L290 59.8L291.4 60L292.8 60.3L294.2 60.6L295.5 60.9L296.8 61.3L298.1 61.6L299.4 62L300.6 62.5L301.8 62.9L302.9 63.4L304 63.9L305.1 64.4L306.1 65L307.1 65.6L308 66.1L308.9 66.7L309.8 67.4L310.5 68L311.3 68.7L311.9 69.3L312.6 70L313.1 70.7L313.6 71.4L314.1 72.1L314.5 72.8L314.8 73.6L315.1 74.3L315.3 75L315.5 75.8L315.6 76.5L315.6 77.3L315.6 105L315.6 105.8L315.5 106.5L315.4 107.3L315.2 108L314.9 108.7L314.6 109.5L314.2 110.2L313.7 110.9L313.2 111.6L312.7 112.3L312.1 113L311.4 113.7L310.7 114.3L309.9 115L309.1 115.6L308.2 116.2L307.3 116.8L306.3 117.3L305.3 117.9L304.2 118.4L303.1 118.9L302 119.4L300.8 119.9L299.6 120.3L298.3 120.7L297 121.1L295.7 121.5L294.4 121.8L293 122.1L291.6 122.4L290.2 122.6L288.8 122.8L287.3 123L285.9 123.2L284.4 123.3L282.9 123.4L281.4 123.5L279.9 123.5L278.4 123.6L276.9 123.5L275.4 123.5L273.9 123.4L272.5 123.3L271 123.2L269.5 123L268.1 122.8L266.7 122.6L265.3 122.3L263.9 122L262.5 121.7L261.2 121.4L259.9 121L258.6 120.6L257.4 120.2L256.2 119.7L255 119.3L253.9 118.8L252.8 118.3L251.7 117.7L250.7 117.2L249.8 116.6L248.9 116L248 115.4L247.2 114.7L246.4 114.1L245.7 113.4L245.1 112.8L244.5 112.1L243.9 111.4L243.5 110.7L243 110L242.7 109.2L242.4 108.5L242.1 107.8L241.9 107L241.8 106.3L241.7 105.5L241.7 104.8Z\"/></g></g><g class=\"iso-solid\" data-p=\"10\" data-name=\"tapa.corona.6\" data-mat=\"gunmetal\"><path class=\"iso-fill\" data-r=\"fill\" d=\"M241.91 110.01L218 113.22L216.7 110.2L216 107.14L215.9 104.06L215.9 89.13L216.4 86.06L240.94 87.67L241.91 95.08Z\"/><path class=\"iso-tn\" data-r=\"f0\" data-b=\"1\" d=\"M241.91 95.08L218 98.28L218 113.22L241.91 110.01Z\"/><path class=\"iso-tn\" data-r=\"f1\" data-b=\"3\" d=\"M218 98.28L216.7 95.27L216.7 110.2L218 113.22Z\"/><path class=\"iso-tn\" data-r=\"f2\" data-b=\"3\" d=\"M216.7 95.27L216 92.21L216 107.14L216.7 110.2Z\"/><path class=\"iso-tn\" data-r=\"f3\" data-b=\"3\" style=\"stroke-width:0.1\" d=\"M216 92.21L215.9 89.13L215.9 104.06L216 107.14Z\"/><path class=\"iso-tn\" data-r=\"f4\" d=\"\"/><path class=\"iso-tn\" data-r=\"f5\" d=\"\"/><path class=\"iso-tn\" data-r=\"f6\" d=\"\"/><path class=\"iso-top\" data-r=\"top\" transform=\"matrix(1.06653 0.30788 -0.61576 0.53326 300 96.31)\" d=\"M-41.85 21.85L-56.062 36.062L-59.424 32.354L-62.405 28.334L-64.978 24.041L-67.118 19.517L-48.548 11.825Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" data-r=\"crease\" d=\"M241.91 95.08L218 98.28L216.7 95.27L216 92.21L215.9 89.13\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" data-r=\"edge\" d=\"M241.91 110.01L218 113.22L216.7 110.2L216 107.14L215.9 104.06L215.9 89.13L216.4 86.06L240.94 87.67L241.91 95.08Z\"/></g><g class=\"iso-part\" data-p=\"32\" data-name=\"piston.tornillo\" data-mat=\"steel\" transform=\"translate(0 0.01)\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M266.4 66.4L266.5 65.7L266.8 65L267.3 64.3L268 63.6L268.8 63L269.8 62.4L270.9 61.9L272.1 61.5L273.4 61.1L274.8 60.8L276.2 60.7L277.7 60.5L279.2 60.5L280.6 60.6L282.1 60.8L283.5 61L284.8 61.4L286.1 61.8L287.2 62.2L288.2 62.8L289.1 63.4L289.8 64L290.4 64.7L290.7 65.5L290.9 66.2L291 66.9L291 77.6L290.8 78.3L290.5 79.1L290 79.8L289.3 80.4L288.5 81L287.6 81.6L286.5 82.1L285.3 82.6L283.9 82.9L282.6 83.2L281.1 83.4L279.7 83.5L278.2 83.5L276.7 83.4L275.2 83.3L273.8 83L272.5 82.7L271.3 82.3L270.1 81.8L269.1 81.2L268.3 80.6L267.5 80L267 79.3L266.6 78.6L266.4 77.8L266.4 77.1Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M291 76.9L290.9 78.2L290.3 79.3L289.3 80.4L287.9 81.4L286.2 82.2L284.1 82.9L281.9 83.3L279.5 83.5L279.5 72.8L281.9 72.6L284.1 72.2L286.2 71.6L287.9 70.7L289.3 69.8L290.3 68.7L290.9 67.5L291 66.3Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M279.5 83.5L277.1 83.5L274.7 83.2L274.7 72.5L277.1 72.8L279.5 72.8Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M274.7 83.2L272.5 82.7L270.5 82L270.5 71.3L272.5 72L274.7 72.5Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M270.5 82L268.9 81.1L267.6 80.1L266.8 78.9L266.8 68.3L267.6 69.4L268.9 70.4L270.5 71.3Z\"/><path class=\"iso-top\" d=\"M266.8 78.9L266.4 77.8L266.4 67.1L266.8 68.3ZM289.3 69.8L287.9 70.7L286.2 71.6L284.1 72.2L281.9 72.6L279.5 72.8L277.1 72.8L274.7 72.5L272.5 72L270.5 71.3L268.9 70.4L267.6 69.4L266.8 68.3L266.4 67.1L266.5 65.9L267 64.7L268 63.6L269.4 62.6L271.2 61.8L273.2 61.2L275.5 60.7L277.9 60.5L280.3 60.6L282.6 60.9L284.8 61.4L286.8 62.1L288.4 62.9L289.7 64L290.6 65.1L291 66.3L290.9 67.5L290.3 68.7L289.3 69.8L278.7 66.7L278.7 66.7L278.7 66.7L278.7 66.7L278.7 66.7L278.7 66.7L278.7 66.7L278.7 66.7L278.7 66.7L278.7 66.7L278.7 66.7L278.7 66.7L278.7 66.7L278.7 66.7L278.7 66.7L278.7 66.7L278.7 66.7L278.7 66.7L278.7 66.7L278.7 66.7L278.7 66.7L278.7 66.7L278.7 66.7L278.7 66.7L278.7 66.7L278.7 66.7L278.7 66.7L278.7 66.7L278.7 66.7L278.7 66.7L278.7 66.7L278.7 66.7L278.7 66.7Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M291 66.7L290.9 67.4L290.6 68.2L290.2 68.9L289.6 69.5L288.8 70.2L287.9 70.8L286.8 71.3L285.7 71.8L284.4 72.1L283 72.4L281.6 72.7L280.2 72.8L278.7 72.8L277.2 72.8L275.7 72.7L274.3 72.4L272.9 72.1L271.7 71.8L270.5 71.3L269.5 70.8L268.5 70.2L267.8 69.5L267.2 68.9L266.7 68.2L266.4 67.4L266.4 66.7\"/><path class=\"iso-line\" data-tone=\"faint\" d=\"M291 75.1L290.8 75.8L290.5 76.6L289.9 77.3L289.3 77.9L288.4 78.6L287.4 79.1L286.3 79.6L285.1 80L283.8 80.4L282.4 80.7L280.9 80.8L279.4 80.9L277.9 80.9L276.4 80.8L275 80.7L273.6 80.4L272.3 80L271 79.6L269.9 79.1L268.9 78.6L268.1 77.9L267.4 77.3L266.9 76.6L266.5 75.8L266.4 75.1M291 72.5L290.8 73.3L290.5 74L289.9 74.7L289.3 75.4L288.4 76L287.4 76.6L286.3 77.1L285.1 77.5L283.8 77.8L282.4 78.1L280.9 78.3L279.4 78.4L277.9 78.4L276.4 78.3L275 78.1L273.6 77.8L272.3 77.5L271 77.1L269.9 76.6L268.9 76L268.1 75.4L267.4 74.7L266.9 74L266.5 73.3L266.4 72.5M291 70L290.8 70.7L290.5 71.4L289.9 72.1L289.3 72.8L288.4 73.4L287.4 74L286.3 74.5L285.1 74.9L283.8 75.3L282.4 75.5L280.9 75.7L279.4 75.8L277.9 75.8L276.4 75.7L275 75.5L273.6 75.3L272.3 74.9L271 74.5L269.9 74L268.9 73.4L268.1 72.8L267.4 72.1L266.9 71.4L266.5 70.7L266.4 70\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M266.4 66.4L266.5 65.7L266.8 65L267.3 64.3L268 63.6L268.8 63L269.8 62.4L270.9 61.9L272.1 61.5L273.4 61.1L274.8 60.8L276.2 60.7L277.7 60.5L279.2 60.5L280.6 60.6L282.1 60.8L283.5 61L284.8 61.4L286.1 61.8L287.2 62.2L288.2 62.8L289.1 63.4L289.8 64L290.4 64.7L290.7 65.5L290.9 66.2L291 66.9L291 77.6L290.8 78.3L290.5 79.1L290 79.8L289.3 80.4L288.5 81L287.6 81.6L286.5 82.1L285.3 82.6L283.9 82.9L282.6 83.2L281.1 83.4L279.7 83.5L278.2 83.5L276.7 83.4L275.2 83.3L273.8 83L272.5 82.7L271.3 82.3L270.1 81.8L269.1 81.2L268.3 80.6L267.5 80L267 79.3L266.6 78.6L266.4 77.8L266.4 77.1Z\"/></g></g><g class=\"iso-solid\" data-p=\"19\" data-name=\"tapa.corona.15\" data-mat=\"gunmetal\"><path class=\"iso-fill\" data-r=\"fill\" d=\"M340.94 109.19L339.84 112.22L338.14 115.18L335.88 118.05L333.06 120.79L311.63 114.6L311.63 99.67L316.4 92.64L340.94 94.26Z\"/><path class=\"iso-tn\" data-r=\"f0\" d=\"\"/><path class=\"iso-tn\" data-r=\"f1\" d=\"M340.94 94.26L339.84 97.29L339.84 112.22L340.94 109.19Z\"/><path class=\"iso-tn\" data-r=\"f2\" d=\"M339.84 97.29L338.14 100.25L338.14 115.18L339.84 112.22Z\"/><path class=\"iso-tn\" data-r=\"f3\" d=\"M338.14 100.25L335.88 103.12L335.88 118.05L338.14 115.18Z\"/><path class=\"iso-tn\" data-r=\"f4\" d=\"M335.88 103.12L333.06 105.86L333.06 120.79L335.88 118.05Z\"/><path class=\"iso-tn\" data-r=\"f5\" data-b=\"2\" style=\"--f:0.5\" d=\"M333.06 105.86L311.63 99.67L311.63 114.6L333.06 120.79Z\"/><path class=\"iso-tn\" data-r=\"f6\" d=\"\"/><path class=\"iso-top\" data-r=\"top\" transform=\"matrix(1.06653 0.30788 -0.61576 0.53326 300 96.31)\" d=\"M8.548 -11.825L27.118 -19.517L28.804 -14.805L30.02 -9.95L30.754 -4.999L31 0L10.9 0Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" data-r=\"crease\" d=\"M340.94 94.26L339.84 97.29L338.14 100.25L335.88 103.12L333.06 105.86L311.63 99.67\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" data-r=\"edge\" d=\"M340.94 109.19L339.84 112.22L338.14 115.18L335.88 118.05L333.06 120.79L311.63 114.6L311.63 99.67L316.4 92.64L340.94 94.26Z\"/></g><g class=\"iso-solid\" data-p=\"25\" data-name=\"bomba.corona.2\" data-mat=\"gunmetal\"><path class=\"iso-fill\" data-r=\"fill\" d=\"M362.06 193.58L357.5 197.52L354.76 196.54L352.45 195.31L350.66 193.87L349.47 192.29L349.47 179.49L358.27 178.31L362.06 180.78Z\"/><path class=\"iso-tn\" data-r=\"f0\" d=\"M362.06 180.78L357.5 184.73L357.5 197.52L362.06 193.58Z\"/><path class=\"iso-tn\" data-r=\"f1\" data-b=\"3\" d=\"M357.5 184.73L354.76 183.74L354.76 196.54L357.5 197.52Z\"/><path class=\"iso-tn\" data-r=\"f2\" data-b=\"3\" d=\"M354.76 183.74L352.45 182.51L352.45 195.31L354.76 196.54Z\"/><path class=\"iso-tn\" data-r=\"f3\" data-b=\"3\" d=\"M352.45 182.51L350.66 181.07L350.66 193.87L352.45 195.31Z\"/><path class=\"iso-tn\" data-r=\"f4\" data-b=\"3\" d=\"M350.66 181.07L349.47 179.49L349.47 192.29L350.66 193.87Z\"/><path class=\"iso-tn\" data-r=\"f5\" d=\"\"/><path class=\"iso-tn\" data-r=\"f6\" d=\"\"/><path class=\"iso-top\" data-r=\"top\" transform=\"matrix(1.06653 0.30788 -0.61576 0.53326 300 158.17)\" d=\"M62 6.6L62 14L59.269 13.731L56.642 12.934L54.222 11.641L52.101 9.899L57.333 4.667Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" data-r=\"crease\" d=\"M362.06 180.78L357.5 184.73L354.76 183.74L352.45 182.51L350.66 181.07L349.47 179.49\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" data-r=\"edge\" d=\"M362.06 193.58L357.5 197.52L354.76 196.54L352.45 195.31L350.66 193.87L349.47 192.29L349.47 179.49L358.27 178.31L362.06 180.78Z\"/></g><g class=\"iso-solid\" data-p=\"51\" data-name=\"botella.tapon\" data-mat=\"rubber\" data-seamless=\"\"><path class=\"iso-fill\" data-r=\"fill\" d=\"M273.13 190.1L273.18 189.48L273.32 188.86L273.55 188.27L273.87 187.7L274.27 187.18L274.75 186.71L275.3 186.3L275.9 185.95L276.55 185.67L277.24 185.47L277.95 185.34L278.67 185.3L279.39 185.34L280.1 185.47L280.79 185.67L281.44 185.95L282.04 186.3L282.59 186.71L283.07 187.18L283.47 187.7L283.79 188.27L284.02 188.86L284.16 189.48L284.21 190.1L284.21 191.95L284.16 192.58L284.02 193.19L283.79 193.79L283.47 194.35L283.07 194.87L282.59 195.34L282.04 195.76L281.44 196.11L280.79 196.38L280.1 196.59L279.39 196.71L278.67 196.75L277.95 196.71L277.24 196.59L276.55 196.38L275.9 196.11L275.3 195.76L274.75 195.34L274.27 194.87L273.87 194.35L273.55 193.79L273.32 193.19L273.18 192.58L273.13 191.95Z\"/><path class=\"iso-shade\" data-shade=\"0\" data-r=\"s0\" d=\"M282.93 187.03L283.63 187.96L284.06 189L284.21 190.1L284.21 191.95L284.06 190.85L283.63 189.81L282.93 188.88Z\"/><path class=\"iso-shade\" data-shade=\"1\" data-r=\"s1\" d=\"M282.13 186.36L282.93 187.03L282.93 188.88L282.13 188.2Z\"/><path class=\"iso-shade\" data-shade=\"2\" data-r=\"s2\" d=\"M281.04 185.77L282.13 186.36L282.13 188.2L281.04 187.61Z\"/><path class=\"iso-shade\" data-shade=\"3\" data-r=\"s3\" d=\"M279.81 185.41L281.04 185.77L281.04 187.61L279.81 187.25Z\"/><path class=\"iso-top\" data-r=\"s4\" d=\"M273.13 190.1L273.31 188.9L273.83 187.77L274.66 186.79L275.75 186.02L277.03 185.52L278.41 185.31L279.81 185.41L279.81 187.25L278.41 187.16L277.03 187.37L275.75 187.87L274.66 188.64L273.83 189.62L273.31 190.74L273.13 191.95Z\"/><path class=\"iso-tn\" data-r=\"k0\" d=\"\"/><path class=\"iso-tn\" data-r=\"k1\" style=\"--f:0.5\" d=\"M278.67 187.15L280.1 187.31L281.44 187.79L282.59 188.56L283.47 189.55L284.02 190.71L284.21 191.95L284.02 193.19L283.47 194.35L282.59 195.34L281.44 196.11L280.1 196.59L278.67 196.75L277.24 196.59L275.9 196.11L274.75 195.34L273.87 194.35L273.32 193.19L273.13 191.95L273.32 190.71L273.87 189.55L274.75 188.56L275.9 187.79L277.24 187.31Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" data-r=\"crease\" d=\"M273.13 191.95L273.32 190.71L273.87 189.55L274.75 188.56L275.9 187.79L277.24 187.31L278.67 187.15L280.1 187.31L281.44 187.79L282.59 188.56L283.47 189.55L284.02 190.71L284.21 191.95\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" data-r=\"edge\" d=\"M273.13 190.1L273.18 189.48L273.32 188.86L273.55 188.27L273.87 187.7L274.27 187.18L274.75 186.71L275.3 186.3L275.9 185.95L276.55 185.67L277.24 185.47L277.95 185.34L278.67 185.3L279.39 185.34L280.1 185.47L280.79 185.67L281.44 185.95L282.04 186.3L282.59 186.71L283.07 187.18L283.47 187.7L283.79 188.27L284.02 188.86L284.16 189.48L284.21 190.1L284.21 191.95L284.16 192.58L284.02 193.19L283.79 193.79L283.47 194.35L283.07 194.87L282.59 195.34L282.04 195.76L281.44 196.11L280.79 196.38L280.1 196.59L279.39 196.71L278.67 196.75L277.95 196.71L277.24 196.59L276.55 196.38L275.9 196.11L275.3 195.76L274.75 195.34L274.27 194.87L273.87 194.35L273.55 193.79L273.32 193.19L273.18 192.58L273.13 191.95Z\"/></g><g class=\"iso-solid\" data-p=\"37\" data-name=\"embolo.ojo\" data-mat=\"chrome\"><path class=\"iso-fill\" data-r=\"fill\" d=\"M371.66 170.92L371.57 171.29L368.36 174.07L367.77 174.3L367.02 174.25L361.04 172.52L360.59 172.22L360.59 164.12L360.68 163.74L363.89 160.97L364.48 160.74L365.23 160.79L371.2 162.52L371.66 162.81Z\"/><path class=\"iso-tn\" data-r=\"f0\" d=\"\"/><path class=\"iso-tn\" data-r=\"f1\" style=\"stroke-width:0.1\" d=\"M371.66 162.81L371.57 163.19L371.57 171.29L371.66 170.92Z\"/><path class=\"iso-tn\" data-r=\"f2\" d=\"M371.57 163.19L368.36 165.96L368.36 174.07L371.57 171.29Z\"/><path class=\"iso-tn\" data-r=\"f3\" d=\"M368.36 165.96L367.77 166.19L367.77 174.3L368.36 174.07Z\"/><path class=\"iso-tn\" data-r=\"f4\" data-b=\"2\" d=\"M367.77 166.19L367.02 166.14L367.02 174.25L367.77 174.3Z\"/><path class=\"iso-tn\" data-r=\"f5\" data-b=\"2\" style=\"--f:0.5\" d=\"M367.02 166.14L361.04 164.42L361.04 172.52L367.02 174.25Z\"/><path class=\"iso-tn\" data-r=\"f6\" data-b=\"3\" d=\"M361.04 164.42L360.59 164.12L360.59 172.22L361.04 172.52Z\"/><path class=\"iso-tn\" data-r=\"f7\" d=\"\"/><path class=\"iso-tn\" data-r=\"f8\" d=\"\"/><path class=\"iso-tn\" data-r=\"f9\" d=\"\"/><path class=\"iso-tn\" data-r=\"f10\" d=\"\"/><path class=\"iso-tn\" data-r=\"f11\" d=\"\"/><path class=\"iso-top\" data-r=\"top\" transform=\"matrix(1.06653 0.30788 -0.61576 0.53326 300 144.38)\" d=\"M64.8 -3.4L65.366 -3.166L65.6 -2.6L65.6 2.6L65.366 3.166L64.8 3.4L59.2 3.4L58.634 3.166L58.4 2.6L58.4 -2.6L58.634 -3.166L59.2 -3.4Z\"/><path class=\"iso-line iso-crease\" data-tone=\"lo\" data-r=\"crease\" d=\"M371.66 162.81L371.57 163.19L368.36 165.96L367.77 166.19L367.02 166.14L361.04 164.42L360.59 164.12\"/><path class=\"iso-line iso-bevel\" data-tone=\"lo\" data-r=\"v0\" opacity=\"1\" d=\"M371.1 163.11L367.99 165.8M367.99 165.8L367.64 165.95M367.64 165.95L367.18 165.91M367.18 165.91L361.37 164.23M361.37 164.23L361.06 164.05M361.06 164.05L360.59 164.12\"/><path class=\"iso-line iso-bevel\" data-tone=\"lo\" data-r=\"v1\" opacity=\"0.906\" d=\"M371.19 162.88L371.1 163.11M371.19 162.88L371.66 162.81\"/><path class=\"iso-line iso-bevel\" data-tone=\"lo\" data-r=\"v2\" opacity=\"0.094\" d=\"M371.1 163.11L371.57 163.19\"/><path class=\"iso-line iso-edge\" data-tone=\"hi\" data-r=\"edge\" d=\"M371.66 170.92L371.57 171.29L368.36 174.07L367.77 174.3L367.02 174.25L361.04 172.52L360.59 172.22L360.59 164.12L360.68 163.74L363.89 160.97L364.48 160.74L365.23 160.79L371.2 162.52L371.66 162.81Z\"/></g><g class=\"iso-solid\" data-p=\"47\" data-name=\"biela.+\" data-mat=\"steel\"><path class=\"iso-fill\" data-r=\"fill\" d=\"M366.59 161.68L366.59 146.75L361.47 145.27L360.73 145.91L360.73 160.84L365.85 162.32Z\"/><path class=\"iso-tn\" data-r=\"f0\" d=\"\"/><path class=\"iso-tn\" data-r=\"f1\" d=\"M365.85 162.32L365.85 147.39L366.59 146.75L366.59 161.68Z\"/><path class=\"iso-tn\" data-r=\"f2\" data-b=\"3\" style=\"--f:1\" d=\"M365.85 147.39L360.73 145.91L361.47 145.27L366.59 146.75Z\"/><path class=\"iso-tn\" data-r=\"f3\" d=\"\"/><path class=\"iso-tn\" data-r=\"f4\" d=\"\"/><path class=\"iso-tn\" data-r=\"f5\" data-b=\"2\" d=\"M360.73 160.84L365.85 162.32L365.85 147.39L360.73 145.91Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" data-r=\"crease\" d=\"M366.59 146.75L365.85 147.39M365.85 162.32L365.85 147.39L360.73 145.91\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" data-r=\"edge\" d=\"M366.59 161.68L366.59 146.75L361.47 145.27L360.73 145.91L360.73 160.84L365.85 162.32Z\"/><g class=\"iso-dots\" data-tone=\"mid\"><circle data-r=\"c0\" cx=\"363.29\" cy=\"147.72\" r=\"0.55\" fill-opacity=\"1\"/><circle data-r=\"c1\" cx=\"363.29\" cy=\"160.52\" r=\"0.55\" fill-opacity=\"1\"/></g></g><g class=\"iso-solid\" data-p=\"23\" data-name=\"bomba.corona.0\" data-mat=\"gunmetal\"><path class=\"iso-fill\" data-r=\"fill\" d=\"M381.06 194.37L379.09 195.74L376.62 196.9L373.75 197.79L370.59 198.39L368.23 193.98L368.23 181.19L373.16 179.29L381.06 181.57Z\"/><path class=\"iso-tn\" data-r=\"f0\" d=\"\"/><path class=\"iso-tn\" data-r=\"f1\" d=\"M381.06 181.57L379.09 182.94L379.09 195.74L381.06 194.37Z\"/><path class=\"iso-tn\" data-r=\"f2\" d=\"M379.09 182.94L376.62 184.1L376.62 196.9L379.09 195.74Z\"/><path class=\"iso-tn\" data-r=\"f3\" style=\"--f:0.21875\" d=\"M376.62 184.1L373.75 184.99L373.75 197.79L376.62 196.9Z\"/><path class=\"iso-tn\" data-r=\"f4\" data-b=\"1\" d=\"M373.75 184.99L370.59 185.59L370.59 198.39L373.75 197.79Z\"/><path class=\"iso-tn\" data-r=\"f5\" data-b=\"3\" d=\"M370.59 185.59L368.23 181.19L368.23 193.98L370.59 198.39Z\"/><path class=\"iso-tn\" data-r=\"f6\" d=\"\"/><path class=\"iso-top\" data-r=\"top\" transform=\"matrix(1.06653 0.30788 -0.61576 0.53326 300 158.17)\" d=\"M68.6 0L76 0L75.731 2.731L74.934 5.358L73.641 7.778L71.899 9.899L66.667 4.667Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" data-r=\"crease\" d=\"M381.06 181.57L379.09 182.94L376.62 184.1L373.75 184.99L370.59 185.59L368.23 181.19\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" data-r=\"edge\" d=\"M381.06 194.37L379.09 195.74L376.62 196.9L373.75 197.79L370.59 198.39L368.23 193.98L368.23 181.19L373.16 179.29L381.06 181.57Z\"/></g><g class=\"iso-part\" data-p=\"33\" data-name=\"piston.silla\" data-mat=\"steel\" transform=\"translate(0 0.01)\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M254 58.4L254.1 57.7L254.2 56.9L254.4 56.2L254.6 55.4L255 54.7L255.5 54L256 53.3L256.6 52.6L257.3 52L258.1 51.4L259 50.8L259.9 50.2L260.9 49.6L262 49.1L263.1 48.6L264.3 48.2L265.5 47.7L266.8 47.4L268.1 47L269.5 46.7L270.9 46.5L272.3 46.3L273.7 46.1L275.2 46L276.7 45.9L278.2 45.8L279.7 45.8L281.1 45.9L282.6 46L284.1 46.1L285.5 46.3L286.9 46.6L288.3 46.8L289.7 47.1L291 47.5L292.2 47.9L293.5 48.3L294.6 48.8L295.7 49.3L296.8 49.8L297.7 50.4L298.7 51L299.5 51.6L300.2 52.2L300.9 52.9L301.5 53.6L302 54.3L302.5 55L302.8 55.7L303.1 56.4L303.2 57.2L303.3 57.9L303.3 66.4L303.3 67.2L303.2 67.9L303 68.7L302.7 69.4L302.3 70.1L301.9 70.8L301.3 71.5L300.7 72.2L300 72.8L299.2 73.5L298.4 74.1L297.4 74.7L296.4 75.2L295.4 75.7L294.2 76.2L293.1 76.7L291.8 77.1L290.6 77.5L289.2 77.8L287.9 78.1L286.5 78.4L285 78.6L283.6 78.8L282.1 78.9L280.7 79L279.2 79L277.7 79L276.2 78.9L274.7 78.8L273.3 78.7L271.8 78.5L270.4 78.3L269 78L267.7 77.7L266.4 77.3L265.1 77L263.9 76.5L262.7 76.1L261.6 75.6L260.6 75L259.6 74.5L258.7 73.9L257.9 73.3L257.1 72.6L256.4 72L255.8 71.3L255.3 70.6L254.9 69.9L254.5 69.1L254.3 68.4L254.1 67.7L254 66.9Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M303.3 67.2L303 68.7L302.3 70.1L301.3 71.5L300 72.8L298.4 74.1L296.4 75.2L294.2 76.2L291.8 77.1L289.2 77.8L286.5 78.4L283.6 78.8L280.7 79L277.7 79L277.7 70.5L280.7 70.4L283.6 70.2L286.5 69.8L289.2 69.3L291.8 68.6L294.2 67.7L296.4 66.7L298.4 65.5L300 64.3L301.3 63L302.3 61.6L303 60.1L303.3 58.6Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M277.7 79L274.7 78.8L271.8 78.5L271.8 70L274.7 70.3L277.7 70.5Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M271.8 78.5L269 78L266.4 77.3L263.9 76.5L261.6 75.6L261.6 67L263.9 68L266.4 68.8L269 69.5L271.8 70Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M261.6 75.6L259.6 74.5L257.9 73.3L256.4 72L255.3 70.6L254.5 69.1L254.5 60.6L255.3 62.1L256.4 63.4L257.9 64.7L259.6 65.9L261.6 67Z\"/><path class=\"iso-top\" d=\"M254.5 69.1L254.1 67.7L254.1 66.2L254.1 57.7L254.1 59.1L254.5 60.6ZM300 64.3L298.4 65.5L296.4 66.7L294.2 67.7L291.8 68.6L289.2 69.3L286.5 69.8L283.6 70.2L280.7 70.4L277.7 70.5L274.7 70.3L271.8 70L269 69.5L266.4 68.8L263.9 68L261.6 67L259.6 65.9L257.9 64.7L256.4 63.4L255.3 62.1L254.5 60.6L254.1 59.1L254.1 57.7L254.4 56.2L255 54.7L256 53.3L257.3 52L259 50.8L260.9 49.6L263.1 48.6L265.5 47.7L268.1 47L270.9 46.5L273.7 46.1L276.7 45.9L279.7 45.8L282.6 46L285.5 46.3L288.3 46.8L291 47.5L293.5 48.3L295.7 49.3L297.7 50.4L299.5 51.6L300.9 52.9L302 54.3L302.8 55.7L303.2 57.2L303.3 58.6L303 60.1L302.3 61.6L301.3 63L300 64.3L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2L278.7 58.2Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M303.3 58.2L303.3 58.9L303.1 59.6L302.9 60.4L302.6 61.1L302.2 61.8L301.7 62.5L301.1 63.2L300.5 63.9L299.7 64.5L298.9 65.1L298.1 65.7L297.1 66.3L296.1 66.9L295 67.4L293.9 67.8L292.7 68.3L291.4 68.7L290.1 69.1L288.8 69.4L287.4 69.7L286 69.9L284.6 70.1L283.1 70.3L281.6 70.4L280.2 70.4L278.7 70.5L277.2 70.4L275.7 70.4L274.2 70.3L272.8 70.1L271.3 69.9L269.9 69.7L268.6 69.4L267.2 69.1L265.9 68.7L264.7 68.3L263.5 67.8L262.3 67.4L261.3 66.9L260.2 66.3L259.3 65.7L258.4 65.1L257.6 64.5L256.9 63.9L256.2 63.2L255.6 62.5L255.2 61.8L254.8 61.1L254.4 60.4L254.2 59.6L254.1 58.9L254 58.2\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M254 58.4L254.1 57.7L254.2 56.9L254.4 56.2L254.6 55.4L255 54.7L255.5 54L256 53.3L256.6 52.6L257.3 52L258.1 51.4L259 50.8L259.9 50.2L260.9 49.6L262 49.1L263.1 48.6L264.3 48.2L265.5 47.7L266.8 47.4L268.1 47L269.5 46.7L270.9 46.5L272.3 46.3L273.7 46.1L275.2 46L276.7 45.9L278.2 45.8L279.7 45.8L281.1 45.9L282.6 46L284.1 46.1L285.5 46.3L286.9 46.6L288.3 46.8L289.7 47.1L291 47.5L292.2 47.9L293.5 48.3L294.6 48.8L295.7 49.3L296.8 49.8L297.7 50.4L298.7 51L299.5 51.6L300.2 52.2L300.9 52.9L301.5 53.6L302 54.3L302.5 55L302.8 55.7L303.1 56.4L303.2 57.2L303.3 57.9L303.3 66.4L303.3 67.2L303.2 67.9L303 68.7L302.7 69.4L302.3 70.1L301.9 70.8L301.3 71.5L300.7 72.2L300 72.8L299.2 73.5L298.4 74.1L297.4 74.7L296.4 75.2L295.4 75.7L294.2 76.2L293.1 76.7L291.8 77.1L290.6 77.5L289.2 77.8L287.9 78.1L286.5 78.4L285 78.6L283.6 78.8L282.1 78.9L280.7 79L279.2 79L277.7 79L276.2 78.9L274.7 78.8L273.3 78.7L271.8 78.5L270.4 78.3L269 78L267.7 77.7L266.4 77.3L265.1 77L263.9 76.5L262.7 76.1L261.6 75.6L260.6 75L259.6 74.5L258.7 73.9L257.9 73.3L257.1 72.6L256.4 72L255.8 71.3L255.3 70.6L254.9 69.9L254.5 69.1L254.3 68.4L254.1 67.7L254 66.9Z\"/></g></g><g class=\"iso-solid\" data-p=\"24\" data-name=\"bomba.corona.1\" data-mat=\"gunmetal\"><path class=\"iso-fill\" data-r=\"fill\" d=\"M370.59 198.39L367.25 198.66L363.87 198.61L360.58 198.22L357.5 197.52L357.5 184.73L362.06 180.78L368.23 181.19L370.59 185.59Z\"/><path class=\"iso-tn\" data-r=\"f0\" d=\"\"/><path class=\"iso-tn\" data-r=\"f1\" data-b=\"1\" d=\"M370.59 185.59L367.25 185.86L367.25 198.66L370.59 198.39Z\"/><path class=\"iso-tn\" data-r=\"f2\" data-b=\"1\" style=\"--f:0.828125\" d=\"M367.25 185.86L363.87 185.81L363.87 198.61L367.25 198.66Z\"/><path class=\"iso-tn\" data-r=\"f3\" data-b=\"2\" d=\"M363.87 185.81L360.58 185.42L360.58 198.22L363.87 198.61Z\"/><path class=\"iso-tn\" data-r=\"f4\" data-b=\"2\" d=\"M360.58 185.42L357.5 184.73L357.5 197.52L360.58 198.22Z\"/><path class=\"iso-tn\" data-r=\"f5\" d=\"\"/><path class=\"iso-tn\" data-r=\"f6\" d=\"\"/><path class=\"iso-top\" data-r=\"top\" transform=\"matrix(1.06653 0.30788 -0.61576 0.53326 300 158.17)\" d=\"M66.667 4.667L71.899 9.899L69.778 11.641L67.358 12.934L64.731 13.731L62 14L62 6.6Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" data-r=\"crease\" d=\"M370.59 185.59L367.25 185.86L363.87 185.81L360.58 185.42L357.5 184.73\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" data-r=\"edge\" d=\"M370.59 198.39L367.25 198.66L363.87 198.61L360.58 198.22L357.5 197.52L357.5 184.73L362.06 180.78L368.23 181.19L370.59 185.59Z\"/></g><g class=\"iso-solid\" data-p=\"9\" data-name=\"tapa.corona.5\" data-mat=\"gunmetal\"><path class=\"iso-fill\" data-r=\"fill\" d=\"M248.48 116.67L228.84 124.2L225.33 121.67L222.34 118.98L219.89 116.15L218 113.22L218 98.28L241.91 95.08L248.48 101.74Z\"/><path class=\"iso-tn\" data-r=\"f0\" d=\"M248.48 101.74L228.84 109.27L228.84 124.2L248.48 116.67Z\"/><path class=\"iso-tn\" data-r=\"f1\" data-b=\"3\" d=\"M228.84 109.27L225.33 106.74L225.33 121.67L228.84 124.2Z\"/><path class=\"iso-tn\" data-r=\"f2\" data-b=\"3\" d=\"M225.33 106.74L222.34 104.05L222.34 118.98L225.33 121.67Z\"/><path class=\"iso-tn\" data-r=\"f3\" data-b=\"3\" d=\"M222.34 104.05L219.89 101.22L219.89 116.15L222.34 118.98Z\"/><path class=\"iso-tn\" data-r=\"f4\" data-b=\"3\" d=\"M219.89 101.22L218 98.28L218 113.22L219.89 116.15Z\"/><path class=\"iso-tn\" data-r=\"f5\" d=\"\"/><path class=\"iso-tn\" data-r=\"f6\" d=\"\"/><path class=\"iso-top\" data-r=\"top\" transform=\"matrix(1.06653 0.30788 -0.61576 0.53326 300 96.31)\" d=\"M-31.825 28.548L-39.517 47.118L-44.041 44.978L-48.334 42.405L-52.354 39.424L-56.062 36.062L-41.85 21.85Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" data-r=\"crease\" d=\"M248.48 101.74L228.84 109.27L225.33 106.74L222.34 104.05L219.89 101.22L218 98.28\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" data-r=\"edge\" d=\"M248.48 116.67L228.84 124.2L225.33 121.67L222.34 118.98L219.89 116.15L218 113.22L218 98.28L241.91 95.08L248.48 101.74Z\"/></g><g class=\"iso-part\" data-p=\"34\" data-name=\"carga.1\" transform=\"translate(0 0.01)\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M229.4 49.2L229.4 48.4L229.5 47.7L229.6 46.9L229.7 46.2L229.9 45.4L230.2 44.7L230.4 44L230.8 43.2L231.1 42.5L231.5 41.8L232 41.1L232.5 40.4L233 39.7L233.6 39L234.3 38.3L234.9 37.6L235.6 37L236.4 36.3L237.2 35.7L238 35.1L238.9 34.5L239.8 33.9L240.7 33.3L241.7 32.7L242.7 32.2L243.7 31.6L244.8 31.1L245.9 30.6L247 30.1L248.2 29.6L249.4 29.2L250.6 28.7L251.8 28.3L253.1 27.9L254.4 27.6L255.7 27.2L257 26.9L258.4 26.5L259.7 26.2L261.1 26L262.5 25.7L263.9 25.5L265.4 25.3L266.8 25.1L268.3 24.9L269.7 24.8L271.2 24.6L272.7 24.5L274.2 24.4L275.7 24.4L277.2 24.4L278.7 24.3L280.2 24.4L281.7 24.4L283.1 24.4L284.6 24.5L286.1 24.6L287.6 24.8L289.1 24.9L290.5 25.1L292 25.3L293.4 25.5L294.8 25.7L296.2 26L297.6 26.2L299 26.5L300.3 26.9L301.7 27.2L303 27.6L304.3 27.9L305.5 28.3L306.8 28.7L308 29.2L309.2 29.6L310.3 30.1L311.5 30.6L312.6 31.1L313.6 31.6L314.7 32.2L315.7 32.7L316.6 33.3L317.6 33.9L318.5 34.5L319.3 35.1L320.2 35.7L321 36.3L321.7 37L322.4 37.6L323.1 38.3L323.7 39L324.3 39.7L324.8 40.4L325.3 41.1L325.8 41.8L326.2 42.5L326.6 43.2L326.9 44L327.2 44.7L327.4 45.4L327.6 46.2L327.8 46.9L327.9 47.7L327.9 48.4L327.9 49.2L327.9 58.3L327.9 59.1L327.8 59.8L327.7 60.6L327.5 61.3L327.3 62.1L327 62.8L326.7 63.5L326.4 64.3L326 65L325.6 65.7L325.1 66.4L324.6 67.1L324 67.8L323.4 68.5L322.7 69.2L322.1 69.8L321.3 70.5L320.6 71.1L319.8 71.7L318.9 72.4L318 73L317.1 73.6L316.2 74.1L315.2 74.7L314.2 75.2L313.1 75.8L312 76.3L310.9 76.8L309.8 77.3L308.6 77.7L307.4 78.2L306.2 78.6L304.9 79L303.6 79.4L302.3 79.8L301 80.1L299.7 80.4L298.3 80.7L296.9 81L295.5 81.3L294.1 81.5L292.7 81.8L291.2 82L289.8 82.1L288.3 82.3L286.9 82.4L285.4 82.6L283.9 82.6L282.4 82.7L280.9 82.8L279.4 82.8L277.9 82.8L276.4 82.8L274.9 82.7L273.4 82.6L272 82.6L270.5 82.4L269 82.3L267.6 82.1L266.1 82L264.7 81.8L263.2 81.5L261.8 81.3L260.4 81L259 80.7L257.7 80.4L256.3 80.1L255 79.8L253.7 79.4L252.4 79L251.2 78.6L250 78.2L248.8 77.7L247.6 77.3L246.4 76.8L245.3 76.3L244.2 75.8L243.2 75.2L242.2 74.7L241.2 74.1L240.2 73.6L239.3 73L238.4 72.4L237.6 71.7L236.8 71.1L236 70.5L235.3 69.8L234.6 69.2L233.9 68.5L233.3 67.8L232.8 67.1L232.3 66.4L231.8 65.7L231.3 65L230.9 64.3L230.6 63.5L230.3 62.8L230 62.1L229.8 61.3L229.6 60.6L229.5 59.8L229.4 59.1L229.4 58.3Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M327.9 57.7L327.9 59.1L327.7 60.6L327.3 62.1L326.7 63.6L326 65L325.1 66.4L324 67.8L322.7 69.2L321.3 70.5L319.8 71.7L318.1 72.9L316.2 74.1L314.2 75.2L312.1 76.3L309.8 77.2L307.5 78.1L305 79L302.4 79.7L299.8 80.4L297.1 81L294.3 81.5L291.4 81.9L288.5 82.3L285.6 82.5L282.6 82.7L279.7 82.8L279.7 73.6L282.6 73.5L285.6 73.4L288.5 73.1L291.4 72.8L294.3 72.3L297.1 71.8L299.8 71.2L302.4 70.6L305 69.8L307.5 69L309.8 68.1L312.1 67.1L314.2 66L316.2 64.9L318.1 63.8L319.8 62.6L321.3 61.3L322.7 60L324 58.6L325.1 57.2L326 55.8L326.7 54.4L327.3 52.9L327.7 51.5L327.9 50L327.9 48.5Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M279.7 82.8L276.7 82.8L273.7 82.7L270.8 82.5L267.8 82.2L265 81.8L262.1 81.4L262.1 72.2L265 72.6L267.8 73L270.8 73.3L273.7 73.5L276.7 73.6L279.7 73.6Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M262.1 81.4L259.4 80.8L256.7 80.2L254 79.5L251.5 78.7L249.1 77.8L246.8 76.9L246.8 67.7L249.1 68.7L251.5 69.5L254 70.3L256.7 71L259.4 71.6L262.1 72.2Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M246.8 76.9L244.5 75.9L242.5 74.9L240.5 73.7L238.7 72.5L237 71.3L235.5 70L234.2 68.7L233 67.3L231.9 66L231.1 64.5L231.1 55.4L231.9 56.8L233 58.2L234.2 59.5L235.5 60.9L237 62.1L238.7 63.4L240.5 64.6L242.5 65.7L244.5 66.7L246.8 67.7Z\"/><path class=\"iso-top\" d=\"M231.1 64.5L230.4 63.1L229.9 61.6L229.6 60.1L229.4 58.6L229.4 49.5L229.6 51L229.9 52.4L230.4 53.9L231.1 55.4ZM321.3 61.3L319.8 62.6L318.1 63.8L316.2 64.9L314.2 66L312.1 67.1L309.8 68.1L307.5 69L305 69.8L302.4 70.6L299.8 71.2L297.1 71.8L294.3 72.3L291.4 72.8L288.5 73.1L285.6 73.4L282.6 73.5L279.7 73.6L276.7 73.6L273.7 73.5L270.8 73.3L267.8 73L265 72.6L262.1 72.2L259.4 71.6L256.7 71L254 70.3L251.5 69.5L249.1 68.7L246.8 67.7L244.5 66.7L242.5 65.7L240.5 64.6L238.7 63.4L237 62.1L235.5 60.9L234.2 59.5L233 58.2L231.9 56.8L231.1 55.4L230.4 53.9L229.9 52.4L229.6 51L229.4 49.5L229.4 48L229.7 46.5L230 45L230.6 43.6L231.4 42.1L232.3 40.7L233.3 39.3L234.6 38L236 36.7L237.6 35.4L239.3 34.2L241.1 33L243.1 31.9L245.3 30.9L247.5 29.9L249.9 29L252.3 28.2L254.9 27.4L257.6 26.7L260.3 26.1L263.1 25.6L265.9 25.2L268.8 24.8L271.7 24.6L274.7 24.4L277.7 24.4L280.7 24.4L283.6 24.5L286.6 24.7L289.5 24.9L292.4 25.3L295.2 25.8L298 26.3L300.7 26.9L303.3 27.6L305.8 28.4L308.3 29.3L310.6 30.2L312.8 31.2L314.9 32.3L316.8 33.4L318.6 34.6L320.3 35.8L321.8 37.1L323.2 38.4L324.4 39.8L325.4 41.2L326.3 42.6L326.9 44.1L327.4 45.5L327.8 47L327.9 48.5L327.9 50L327.7 51.5L327.3 52.9L326.7 54.4L326 55.8L325.1 57.2L324 58.6L322.7 60L321.3 61.3L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49L278.7 49Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M327.9 49L327.9 49.7L327.8 50.5L327.7 51.2L327.6 51.9L327.4 52.7L327.1 53.4L326.8 54.1L326.5 54.9L326.1 55.6L325.7 56.3L325.2 57L324.7 57.7L324.2 58.4L323.6 59.1L323 59.8L322.3 60.4L321.6 61.1L320.8 61.7L320 62.4L319.2 63L318.3 63.6L317.4 64.2L316.5 64.7L315.5 65.3L314.5 65.9L313.5 66.4L312.4 66.9L311.3 67.4L310.2 67.9L309 68.4L307.9 68.8L306.7 69.2L305.4 69.7L304.2 70.1L302.9 70.4L301.6 70.8L300.2 71.1L298.9 71.4L297.5 71.7L296.1 72L294.7 72.3L293.3 72.5L291.9 72.7L290.5 72.9L289 73.1L287.5 73.2L286.1 73.3L284.6 73.4L283.1 73.5L281.6 73.6L280.2 73.6L278.7 73.6L277.2 73.6L275.7 73.6L274.2 73.5L272.7 73.4L271.3 73.3L269.8 73.2L268.3 73.1L266.9 72.9L265.4 72.7L264 72.5L262.6 72.3L261.2 72L259.8 71.7L258.5 71.4L257.1 71.1L255.8 70.8L254.5 70.4L253.2 70.1L251.9 69.7L250.7 69.2L249.5 68.8L248.3 68.4L247.1 67.9L246 67.4L244.9 66.9L243.8 66.4L242.8 65.9L241.8 65.3L240.8 64.7L239.9 64.2L239 63.6L238.1 63L237.3 62.4L236.5 61.7L235.8 61.1L235 60.4L234.4 59.8L233.7 59.1L233.2 58.4L232.6 57.7L232.1 57L231.6 56.3L231.2 55.6L230.8 54.9L230.5 54.1L230.2 53.4L230 52.7L229.8 51.9L229.6 51.2L229.5 50.5L229.4 49.7L229.4 49\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M229.4 49.2L229.4 48.4L229.5 47.7L229.6 46.9L229.7 46.2L229.9 45.4L230.2 44.7L230.4 44L230.8 43.2L231.1 42.5L231.5 41.8L232 41.1L232.5 40.4L233 39.7L233.6 39L234.3 38.3L234.9 37.6L235.6 37L236.4 36.3L237.2 35.7L238 35.1L238.9 34.5L239.8 33.9L240.7 33.3L241.7 32.7L242.7 32.2L243.7 31.6L244.8 31.1L245.9 30.6L247 30.1L248.2 29.6L249.4 29.2L250.6 28.7L251.8 28.3L253.1 27.9L254.4 27.6L255.7 27.2L257 26.9L258.4 26.5L259.7 26.2L261.1 26L262.5 25.7L263.9 25.5L265.4 25.3L266.8 25.1L268.3 24.9L269.7 24.8L271.2 24.6L272.7 24.5L274.2 24.4L275.7 24.4L277.2 24.4L278.7 24.3L280.2 24.4L281.7 24.4L283.1 24.4L284.6 24.5L286.1 24.6L287.6 24.8L289.1 24.9L290.5 25.1L292 25.3L293.4 25.5L294.8 25.7L296.2 26L297.6 26.2L299 26.5L300.3 26.9L301.7 27.2L303 27.6L304.3 27.9L305.5 28.3L306.8 28.7L308 29.2L309.2 29.6L310.3 30.1L311.5 30.6L312.6 31.1L313.6 31.6L314.7 32.2L315.7 32.7L316.6 33.3L317.6 33.9L318.5 34.5L319.3 35.1L320.2 35.7L321 36.3L321.7 37L322.4 37.6L323.1 38.3L323.7 39L324.3 39.7L324.8 40.4L325.3 41.1L325.8 41.8L326.2 42.5L326.6 43.2L326.9 44L327.2 44.7L327.4 45.4L327.6 46.2L327.8 46.9L327.9 47.7L327.9 48.4L327.9 49.2L327.9 58.3L327.9 59.1L327.8 59.8L327.7 60.6L327.5 61.3L327.3 62.1L327 62.8L326.7 63.5L326.4 64.3L326 65L325.6 65.7L325.1 66.4L324.6 67.1L324 67.8L323.4 68.5L322.7 69.2L322.1 69.8L321.3 70.5L320.6 71.1L319.8 71.7L318.9 72.4L318 73L317.1 73.6L316.2 74.1L315.2 74.7L314.2 75.2L313.1 75.8L312 76.3L310.9 76.8L309.8 77.3L308.6 77.7L307.4 78.2L306.2 78.6L304.9 79L303.6 79.4L302.3 79.8L301 80.1L299.7 80.4L298.3 80.7L296.9 81L295.5 81.3L294.1 81.5L292.7 81.8L291.2 82L289.8 82.1L288.3 82.3L286.9 82.4L285.4 82.6L283.9 82.6L282.4 82.7L280.9 82.8L279.4 82.8L277.9 82.8L276.4 82.8L274.9 82.7L273.4 82.6L272 82.6L270.5 82.4L269 82.3L267.6 82.1L266.1 82L264.7 81.8L263.2 81.5L261.8 81.3L260.4 81L259 80.7L257.7 80.4L256.3 80.1L255 79.8L253.7 79.4L252.4 79L251.2 78.6L250 78.2L248.8 77.7L247.6 77.3L246.4 76.8L245.3 76.3L244.2 75.8L243.2 75.2L242.2 74.7L241.2 74.1L240.2 73.6L239.3 73L238.4 72.4L237.6 71.7L236.8 71.1L236 70.5L235.3 69.8L234.6 69.2L233.9 68.5L233.3 67.8L232.8 67.1L232.3 66.4L231.8 65.7L231.3 65L230.9 64.3L230.6 63.5L230.3 62.8L230 62.1L229.8 61.3L229.6 60.6L229.5 59.8L229.4 59.1L229.4 58.3Z\"/></g></g><g class=\"iso-solid\" data-p=\"40\" data-name=\"oreja.+\" data-mat=\"copper\"><path class=\"iso-fill\" data-r=\"fill\" d=\"M350.49 150.42L350.49 141.89L346.23 135.33L337.7 132.86L336.71 133.72L332.44 137.82L332.44 146.35L349.51 151.28Z\"/><path class=\"iso-tn\" data-r=\"f0\" d=\"\"/><path class=\"iso-tn\" data-r=\"f1\" d=\"M349.51 151.28L349.51 142.74L350.49 141.89L350.49 150.42Z\"/><path class=\"iso-tn\" data-r=\"f2\" data-b=\"1\" d=\"M349.51 142.74L345.24 136.18L346.23 135.33L350.49 141.89Z\"/><path class=\"iso-tn\" data-r=\"f3\" data-b=\"3\" style=\"--f:1\" d=\"M345.24 136.18L336.71 133.72L337.7 132.86L346.23 135.33Z\"/><path class=\"iso-tn\" data-r=\"f4\" d=\"\"/><path class=\"iso-tn\" data-r=\"f5\" d=\"\"/><path class=\"iso-tn\" data-r=\"f6\" d=\"\"/><path class=\"iso-tn\" data-r=\"f7\" data-b=\"2\" d=\"M332.44 146.35L349.51 151.28L349.51 142.74L345.24 136.18L336.71 133.72L332.44 137.82Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" data-r=\"crease\" d=\"M350.49 141.89L349.51 142.74M346.23 135.33L345.24 136.18M349.51 151.28L349.51 142.74L345.24 136.18L336.71 133.72\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" data-r=\"edge\" d=\"M350.49 150.42L350.49 141.89L346.23 135.33L337.7 132.86L336.71 133.72L332.44 137.82L332.44 146.35L349.51 151.28Z\"/><g class=\"iso-dots\" data-tone=\"mid\"><circle data-r=\"c0\" cx=\"340.98\" cy=\"142.41\" r=\"0.6\" fill-opacity=\"1\"/></g></g><g class=\"iso-part\" data-p=\"35\" data-name=\"carga.2\" transform=\"translate(0 0.01)\"><g class=\"iso-solid\"><path class=\"iso-fill\" d=\"M229.4 40L229.4 39.2L229.5 38.5L229.6 37.8L229.7 37L229.9 36.3L230.2 35.5L230.4 34.8L230.8 34.1L231.1 33.3L231.5 32.6L232 31.9L232.5 31.2L233 30.5L233.6 29.8L234.3 29.1L234.9 28.5L235.6 27.8L236.4 27.2L237.2 26.5L238 25.9L238.9 25.3L239.8 24.7L240.7 24.1L241.7 23.5L242.7 23L243.7 22.5L244.8 21.9L245.9 21.4L247 20.9L248.2 20.5L249.4 20L250.6 19.6L251.8 19.2L253.1 18.8L254.4 18.4L255.7 18L257 17.7L258.4 17.4L259.7 17.1L261.1 16.8L262.5 16.5L263.9 16.3L265.4 16.1L266.8 15.9L268.3 15.7L269.7 15.6L271.2 15.5L272.7 15.4L274.2 15.3L275.7 15.2L277.2 15.2L278.7 15.2L280.2 15.2L281.7 15.2L283.1 15.3L284.6 15.4L286.1 15.5L287.6 15.6L289.1 15.7L290.5 15.9L292 16.1L293.4 16.3L294.8 16.5L296.2 16.8L297.6 17.1L299 17.4L300.3 17.7L301.7 18L303 18.4L304.3 18.8L305.5 19.2L306.8 19.6L308 20L309.2 20.5L310.3 20.9L311.5 21.4L312.6 21.9L313.6 22.5L314.7 23L315.7 23.5L316.6 24.1L317.6 24.7L318.5 25.3L319.3 25.9L320.2 26.5L321 27.2L321.7 27.8L322.4 28.5L323.1 29.1L323.7 29.8L324.3 30.5L324.8 31.2L325.3 31.9L325.8 32.6L326.2 33.3L326.6 34.1L326.9 34.8L327.2 35.5L327.4 36.3L327.6 37L327.8 37.8L327.9 38.5L327.9 39.2L327.9 40L327.9 49.2L327.9 49.9L327.8 50.7L327.7 51.4L327.5 52.1L327.3 52.9L327 53.6L326.7 54.4L326.4 55.1L326 55.8L325.6 56.5L325.1 57.2L324.6 57.9L324 58.6L323.4 59.3L322.7 60L322.1 60.6L321.3 61.3L320.6 61.9L319.8 62.6L318.9 63.2L318 63.8L317.1 64.4L316.2 65L315.2 65.5L314.2 66.1L313.1 66.6L312 67.1L310.9 67.6L309.8 68.1L308.6 68.5L307.4 69L306.2 69.4L304.9 69.8L303.6 70.2L302.3 70.6L301 70.9L299.7 71.3L298.3 71.6L296.9 71.9L295.5 72.1L294.1 72.4L292.7 72.6L291.2 72.8L289.8 73L288.3 73.1L286.9 73.3L285.4 73.4L283.9 73.5L282.4 73.5L280.9 73.6L279.4 73.6L277.9 73.6L276.4 73.6L274.9 73.5L273.4 73.5L272 73.4L270.5 73.3L269 73.1L267.6 73L266.1 72.8L264.7 72.6L263.2 72.4L261.8 72.1L260.4 71.9L259 71.6L257.7 71.3L256.3 70.9L255 70.6L253.7 70.2L252.4 69.8L251.2 69.4L250 69L248.8 68.5L247.6 68.1L246.4 67.6L245.3 67.1L244.2 66.6L243.2 66.1L242.2 65.5L241.2 65L240.2 64.4L239.3 63.8L238.4 63.2L237.6 62.6L236.8 61.9L236 61.3L235.3 60.6L234.6 60L233.9 59.3L233.3 58.6L232.8 57.9L232.3 57.2L231.8 56.5L231.3 55.8L230.9 55.1L230.6 54.4L230.3 53.6L230 52.9L229.8 52.1L229.6 51.4L229.5 50.7L229.4 49.9L229.4 49.2Z\"/><path class=\"iso-shade\" data-shade=\"0\" d=\"M327.9 48.5L327.9 50L327.7 51.5L327.3 52.9L326.7 54.4L326 55.8L325.1 57.2L324 58.6L322.7 60L321.3 61.3L319.8 62.6L318.1 63.8L316.2 64.9L314.2 66L312.1 67.1L309.8 68.1L307.5 69L305 69.8L302.4 70.6L299.8 71.2L297.1 71.8L294.3 72.3L291.4 72.8L288.5 73.1L285.6 73.4L282.6 73.5L279.7 73.6L279.7 64.4L282.6 64.4L285.6 64.2L288.5 63.9L291.4 63.6L294.3 63.2L297.1 62.7L299.8 62.1L302.4 61.4L305 60.6L307.5 59.8L309.8 58.9L312.1 57.9L314.2 56.9L316.2 55.8L318.1 54.6L319.8 53.4L321.3 52.1L322.7 50.8L324 49.5L325.1 48.1L326 46.7L326.7 45.2L327.3 43.8L327.7 42.3L327.9 40.8L327.9 39.3Z\"/><path class=\"iso-shade\" data-shade=\"1\" d=\"M279.7 73.6L276.7 73.6L273.7 73.5L270.8 73.3L267.8 73L265 72.6L262.1 72.2L262.1 63L265 63.5L267.8 63.8L270.8 64.1L273.7 64.3L276.7 64.4L279.7 64.4Z\"/><path class=\"iso-shade\" data-shade=\"2\" d=\"M262.1 72.2L259.4 71.6L256.7 71L254 70.3L251.5 69.5L249.1 68.7L246.8 67.7L246.8 58.6L249.1 59.5L251.5 60.4L254 61.1L256.7 61.8L259.4 62.5L262.1 63Z\"/><path class=\"iso-shade\" data-shade=\"3\" d=\"M246.8 67.7L244.5 66.7L242.5 65.7L240.5 64.6L238.7 63.4L237 62.1L235.5 60.9L234.2 59.5L233 58.2L231.9 56.8L231.1 55.4L231.1 46.2L231.9 47.6L233 49L234.2 50.4L235.5 51.7L237 53L238.7 54.2L240.5 55.4L242.5 56.5L244.5 57.6L246.8 58.6Z\"/><path class=\"iso-top\" d=\"M231.1 55.4L230.4 53.9L229.9 52.4L229.6 51L229.4 49.5L229.4 40.3L229.6 41.8L229.9 43.3L230.4 44.7L231.1 46.2ZM321.3 52.1L319.8 53.4L318.1 54.6L316.2 55.8L314.2 56.9L312.1 57.9L309.8 58.9L307.5 59.8L305 60.6L302.4 61.4L299.8 62.1L297.1 62.7L294.3 63.2L291.4 63.6L288.5 63.9L285.6 64.2L282.6 64.4L279.7 64.4L276.7 64.4L273.7 64.3L270.8 64.1L267.8 63.8L265 63.5L262.1 63L259.4 62.5L256.7 61.8L254 61.1L251.5 60.4L249.1 59.5L246.8 58.6L244.5 57.6L242.5 56.5L240.5 55.4L238.7 54.2L237 53L235.5 51.7L234.2 50.4L233 49L231.9 47.6L231.1 46.2L230.4 44.7L229.9 43.3L229.6 41.8L229.4 40.3L229.4 38.8L229.7 37.3L230 35.9L230.6 34.4L231.4 33L232.3 31.5L233.3 30.2L234.6 28.8L236 27.5L237.6 26.2L239.3 25L241.1 23.8L243.1 22.7L245.3 21.7L247.5 20.7L249.9 19.8L252.3 19L254.9 18.2L257.6 17.6L260.3 17L263.1 16.4L265.9 16L268.8 15.7L271.7 15.4L274.7 15.3L277.7 15.2L280.7 15.2L283.6 15.3L286.6 15.5L289.5 15.8L292.4 16.1L295.2 16.6L298 17.1L300.7 17.8L303.3 18.5L305.8 19.3L308.3 20.1L310.6 21L312.8 22L314.9 23.1L316.8 24.2L318.6 25.4L320.3 26.6L321.8 27.9L323.2 29.2L324.4 30.6L325.4 32L326.3 33.4L326.9 34.9L327.4 36.3L327.8 37.8L327.9 39.3L327.9 40.8L327.7 42.3L327.3 43.8L326.7 45.2L326 46.7L325.1 48.1L324 49.5L322.7 50.8L321.3 52.1L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8L278.7 39.8Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" d=\"M327.9 39.8L327.9 40.6L327.8 41.3L327.7 42L327.6 42.8L327.4 43.5L327.1 44.2L326.8 45L326.5 45.7L326.1 46.4L325.7 47.1L325.2 47.8L324.7 48.5L324.2 49.2L323.6 49.9L323 50.6L322.3 51.3L321.6 51.9L320.8 52.5L320 53.2L319.2 53.8L318.3 54.4L317.4 55L316.5 55.6L315.5 56.1L314.5 56.7L313.5 57.2L312.4 57.7L311.3 58.2L310.2 58.7L309 59.2L307.9 59.6L306.7 60.1L305.4 60.5L304.2 60.9L302.9 61.3L301.6 61.6L300.2 62L298.9 62.3L297.5 62.6L296.1 62.8L294.7 63.1L293.3 63.3L291.9 63.5L290.5 63.7L289 63.9L287.5 64L286.1 64.2L284.6 64.3L283.1 64.3L281.6 64.4L280.2 64.4L278.7 64.4L277.2 64.4L275.7 64.4L274.2 64.3L272.7 64.3L271.3 64.2L269.8 64L268.3 63.9L266.9 63.7L265.4 63.5L264 63.3L262.6 63.1L261.2 62.8L259.8 62.6L258.5 62.3L257.1 62L255.8 61.6L254.5 61.3L253.2 60.9L251.9 60.5L250.7 60.1L249.5 59.6L248.3 59.2L247.1 58.7L246 58.2L244.9 57.7L243.8 57.2L242.8 56.7L241.8 56.1L240.8 55.6L239.9 55L239 54.4L238.1 53.8L237.3 53.2L236.5 52.5L235.8 51.9L235 51.3L234.4 50.6L233.7 49.9L233.2 49.2L232.6 48.5L232.1 47.8L231.6 47.1L231.2 46.4L230.8 45.7L230.5 45L230.2 44.2L230 43.5L229.8 42.8L229.6 42L229.5 41.3L229.4 40.6L229.4 39.8\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" d=\"M229.4 40L229.4 39.2L229.5 38.5L229.6 37.8L229.7 37L229.9 36.3L230.2 35.5L230.4 34.8L230.8 34.1L231.1 33.3L231.5 32.6L232 31.9L232.5 31.2L233 30.5L233.6 29.8L234.3 29.1L234.9 28.5L235.6 27.8L236.4 27.2L237.2 26.5L238 25.9L238.9 25.3L239.8 24.7L240.7 24.1L241.7 23.5L242.7 23L243.7 22.5L244.8 21.9L245.9 21.4L247 20.9L248.2 20.5L249.4 20L250.6 19.6L251.8 19.2L253.1 18.8L254.4 18.4L255.7 18L257 17.7L258.4 17.4L259.7 17.1L261.1 16.8L262.5 16.5L263.9 16.3L265.4 16.1L266.8 15.9L268.3 15.7L269.7 15.6L271.2 15.5L272.7 15.4L274.2 15.3L275.7 15.2L277.2 15.2L278.7 15.2L280.2 15.2L281.7 15.2L283.1 15.3L284.6 15.4L286.1 15.5L287.6 15.6L289.1 15.7L290.5 15.9L292 16.1L293.4 16.3L294.8 16.5L296.2 16.8L297.6 17.1L299 17.4L300.3 17.7L301.7 18L303 18.4L304.3 18.8L305.5 19.2L306.8 19.6L308 20L309.2 20.5L310.3 20.9L311.5 21.4L312.6 21.9L313.6 22.5L314.7 23L315.7 23.5L316.6 24.1L317.6 24.7L318.5 25.3L319.3 25.9L320.2 26.5L321 27.2L321.7 27.8L322.4 28.5L323.1 29.1L323.7 29.8L324.3 30.5L324.8 31.2L325.3 31.9L325.8 32.6L326.2 33.3L326.6 34.1L326.9 34.8L327.2 35.5L327.4 36.3L327.6 37L327.8 37.8L327.9 38.5L327.9 39.2L327.9 40L327.9 49.2L327.9 49.9L327.8 50.7L327.7 51.4L327.5 52.1L327.3 52.9L327 53.6L326.7 54.4L326.4 55.1L326 55.8L325.6 56.5L325.1 57.2L324.6 57.9L324 58.6L323.4 59.3L322.7 60L322.1 60.6L321.3 61.3L320.6 61.9L319.8 62.6L318.9 63.2L318 63.8L317.1 64.4L316.2 65L315.2 65.5L314.2 66.1L313.1 66.6L312 67.1L310.9 67.6L309.8 68.1L308.6 68.5L307.4 69L306.2 69.4L304.9 69.8L303.6 70.2L302.3 70.6L301 70.9L299.7 71.3L298.3 71.6L296.9 71.9L295.5 72.1L294.1 72.4L292.7 72.6L291.2 72.8L289.8 73L288.3 73.1L286.9 73.3L285.4 73.4L283.9 73.5L282.4 73.5L280.9 73.6L279.4 73.6L277.9 73.6L276.4 73.6L274.9 73.5L273.4 73.5L272 73.4L270.5 73.3L269 73.1L267.6 73L266.1 72.8L264.7 72.6L263.2 72.4L261.8 72.1L260.4 71.9L259 71.6L257.7 71.3L256.3 70.9L255 70.6L253.7 70.2L252.4 69.8L251.2 69.4L250 69L248.8 68.5L247.6 68.1L246.4 67.6L245.3 67.1L244.2 66.6L243.2 66.1L242.2 65.5L241.2 65L240.2 64.4L239.3 63.8L238.4 63.2L237.6 62.6L236.8 61.9L236 61.3L235.3 60.6L234.6 60L233.9 59.3L233.3 58.6L232.8 57.9L232.3 57.2L231.8 56.5L231.3 55.8L230.9 55.1L230.6 54.4L230.3 53.6L230 52.9L229.8 52.1L229.6 51.4L229.5 50.7L229.4 49.9L229.4 49.2Z\"/></g><g class=\"iso-dots\" data-tone=\"mid\"><circle data-r=\"c0\" cx=\"300.43\" cy=\"51.55\" r=\"0.5\" fill-opacity=\"1\"/><circle data-r=\"c1\" cx=\"269.21\" cy=\"55.1\" r=\"0.5\" fill-opacity=\"1\"/><circle data-r=\"c2\" cx=\"247.45\" cy=\"43.36\" r=\"0.5\" fill-opacity=\"1\"/><circle data-r=\"c3\" cx=\"256.91\" cy=\"28.06\" r=\"0.5\" fill-opacity=\"1\"/><circle data-r=\"c4\" cx=\"288.13\" cy=\"24.51\" r=\"0.5\" fill-opacity=\"1\"/><circle data-r=\"c5\" cx=\"309.89\" cy=\"36.26\" r=\"0.5\" fill-opacity=\"1\"/></g></g><g class=\"iso-solid\" data-p=\"4\" data-name=\"tapa.corona.0\" data-mat=\"gunmetal\"><path class=\"iso-fill\" data-r=\"fill\" d=\"M333.06 120.79L329.72 123.38L325.89 125.79L321.6 128.01L316.9 130L301.84 120.18L301.84 105.25L311.63 99.67L333.06 105.86Z\"/><path class=\"iso-tn\" data-r=\"f0\" d=\"\"/><path class=\"iso-tn\" data-r=\"f1\" d=\"M333.06 105.86L329.72 108.45L329.72 123.38L333.06 120.79Z\"/><path class=\"iso-tn\" data-r=\"f2\" d=\"M329.72 108.45L325.89 110.86L325.89 125.79L329.72 123.38Z\"/><path class=\"iso-tn\" data-r=\"f3\" d=\"M325.89 110.86L321.6 113.08L321.6 128.01L325.89 125.79Z\"/><path class=\"iso-tn\" data-r=\"f4\" d=\"M321.6 113.08L316.9 115.07L316.9 130L321.6 128.01Z\"/><path class=\"iso-tn\" data-r=\"f5\" data-b=\"3\" d=\"M316.9 115.07L301.84 105.25L301.84 120.18L316.9 130Z\"/><path class=\"iso-tn\" data-r=\"f6\" d=\"\"/><path class=\"iso-top\" data-r=\"top\" transform=\"matrix(1.06653 0.30788 -0.61576 0.53326 300 96.31)\" d=\"M10.9 0L31 0L30.754 4.999L30.02 9.95L28.804 14.805L27.118 19.517L8.548 11.825Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" data-r=\"crease\" d=\"M333.06 105.86L329.72 108.45L325.89 110.86L321.6 113.08L316.9 115.07L301.84 105.25\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" data-r=\"edge\" d=\"M333.06 120.79L329.72 123.38L325.89 125.79L321.6 128.01L316.9 130L301.84 120.18L301.84 105.25L311.63 99.67L333.06 105.86Z\"/></g><g class=\"iso-solid\" data-p=\"8\" data-name=\"tapa.corona.4\" data-mat=\"gunmetal\"><path class=\"iso-fill\" data-r=\"fill\" d=\"M259.64 121.57L247.27 132.28L242.09 130.61L237.26 128.7L232.83 126.55L228.84 124.2L228.84 109.27L248.48 101.74L259.64 106.63Z\"/><path class=\"iso-tn\" data-r=\"f0\" d=\"M259.64 106.63L247.27 117.35L247.27 132.28L259.64 121.57Z\"/><path class=\"iso-tn\" data-r=\"f1\" data-b=\"2\" style=\"--f:0.890625\" d=\"M247.27 117.35L242.09 115.68L242.09 130.61L247.27 132.28Z\"/><path class=\"iso-tn\" data-r=\"f2\" data-b=\"3\" d=\"M242.09 115.68L237.26 113.77L237.26 128.7L242.09 130.61Z\"/><path class=\"iso-tn\" data-r=\"f3\" data-b=\"3\" d=\"M237.26 113.77L232.83 111.62L232.83 126.55L237.26 128.7Z\"/><path class=\"iso-tn\" data-r=\"f4\" data-b=\"3\" d=\"M232.83 111.62L228.84 109.27L228.84 124.2L232.83 126.55Z\"/><path class=\"iso-tn\" data-r=\"f5\" d=\"\"/><path class=\"iso-tn\" data-r=\"f6\" d=\"\"/><path class=\"iso-top\" data-r=\"top\" transform=\"matrix(1.06653 0.30788 -0.61576 0.53326 300 96.31)\" d=\"M-20 30.9L-20 51L-24.999 50.754L-29.95 50.02L-34.805 48.804L-39.517 47.118L-31.825 28.548Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" data-r=\"crease\" d=\"M259.64 106.63L247.27 117.35L242.09 115.68L237.26 113.77L232.83 111.62L228.84 109.27\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" data-r=\"edge\" d=\"M259.64 121.57L247.27 132.28L242.09 130.61L237.26 128.7L232.83 126.55L228.84 124.2L228.84 109.27L248.48 101.74L259.64 106.63Z\"/></g><g class=\"iso-solid\" data-p=\"5\" data-name=\"tapa.corona.1\" data-mat=\"gunmetal\"><path class=\"iso-fill\" data-r=\"fill\" d=\"M316.9 130L311.84 131.76L306.45 133.25L300.79 134.48L294.93 135.42L288.52 123.47L288.52 108.54L301.84 105.25L316.9 115.07Z\"/><path class=\"iso-tn\" data-r=\"f0\" d=\"\"/><path class=\"iso-tn\" data-r=\"f1\" d=\"M316.9 115.07L311.84 116.82L311.84 131.76L316.9 130Z\"/><path class=\"iso-tn\" data-r=\"f2\" style=\"--f:0.65625\" d=\"M311.84 116.82L306.45 118.32L306.45 133.25L311.84 131.76Z\"/><path class=\"iso-tn\" data-r=\"f3\" data-b=\"1\" d=\"M306.45 118.32L300.79 119.55L300.79 134.48L306.45 133.25Z\"/><path class=\"iso-tn\" data-r=\"f4\" data-b=\"1\" d=\"M300.79 119.55L294.93 120.49L294.93 135.42L300.79 134.48Z\"/><path class=\"iso-tn\" data-r=\"f5\" data-b=\"3\" d=\"M294.93 120.49L288.52 108.54L288.52 123.47L294.93 135.42Z\"/><path class=\"iso-tn\" data-r=\"f6\" d=\"\"/><path class=\"iso-top\" data-r=\"top\" transform=\"matrix(1.06653 0.30788 -0.61576 0.53326 300 96.31)\" d=\"M8.548 11.825L27.118 19.517L24.978 24.041L22.405 28.334L19.424 32.354L16.062 36.062L1.85 21.85Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" data-r=\"crease\" d=\"M316.9 115.07L311.84 116.82L306.45 118.32L300.79 119.55L294.93 120.49L288.52 108.54\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" data-r=\"edge\" d=\"M316.9 130L311.84 131.76L306.45 133.25L300.79 134.48L294.93 135.42L288.52 123.47L288.52 108.54L301.84 105.25L316.9 115.07Z\"/></g><g class=\"iso-solid\" data-p=\"7\" data-name=\"tapa.corona.3\" data-mat=\"gunmetal\"><path class=\"iso-fill\" data-r=\"fill\" d=\"M273.7 123.95L270.47 136.22L264.41 135.67L258.48 134.82L252.75 133.69L247.27 132.28L247.27 117.35L259.64 106.63L273.7 109.02Z\"/><path class=\"iso-tn\" data-r=\"f0\" d=\"M273.7 109.02L270.47 121.29L270.47 136.22L273.7 123.95Z\"/><path class=\"iso-tn\" data-r=\"f1\" data-b=\"2\" d=\"M270.47 121.29L264.41 120.74L264.41 135.67L270.47 136.22Z\"/><path class=\"iso-tn\" data-r=\"f2\" data-b=\"2\" d=\"M264.41 120.74L258.48 119.89L258.48 134.82L264.41 135.67Z\"/><path class=\"iso-tn\" data-r=\"f3\" data-b=\"2\" d=\"M258.48 119.89L252.75 118.76L252.75 133.69L258.48 134.82Z\"/><path class=\"iso-tn\" data-r=\"f4\" data-b=\"2\" style=\"--f:0.09375\" d=\"M252.75 118.76L247.27 117.35L247.27 132.28L252.75 133.69Z\"/><path class=\"iso-tn\" data-r=\"f5\" d=\"\"/><path class=\"iso-tn\" data-r=\"f6\" d=\"\"/><path class=\"iso-top\" data-r=\"top\" transform=\"matrix(1.06653 0.30788 -0.61576 0.53326 300 96.31)\" d=\"M-8.175 28.548L-0.483 47.118L-5.195 48.804L-10.05 50.02L-15.001 50.754L-20 51L-20 30.9Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" data-r=\"crease\" d=\"M273.7 109.02L270.47 121.29L264.41 120.74L258.48 119.89L252.75 118.76L247.27 117.35\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" data-r=\"edge\" d=\"M273.7 123.95L270.47 136.22L264.41 135.67L258.48 134.82L252.75 133.69L247.27 132.28L247.27 117.35L259.64 106.63L273.7 109.02Z\"/></g><g class=\"iso-solid\" data-p=\"6\" data-name=\"tapa.corona.2\" data-mat=\"gunmetal\"><path class=\"iso-fill\" data-r=\"fill\" d=\"M294.93 135.42L288.9 136.07L282.78 136.42L276.61 136.47L270.47 136.22L270.47 121.29L273.7 109.02L288.52 108.54L294.93 120.49Z\"/><path class=\"iso-tn\" data-r=\"f0\" d=\"\"/><path class=\"iso-tn\" data-r=\"f1\" data-b=\"1\" d=\"M294.93 120.49L288.9 121.14L288.9 136.07L294.93 135.42Z\"/><path class=\"iso-tn\" data-r=\"f2\" data-b=\"1\" d=\"M288.9 121.14L282.78 121.49L282.78 136.42L288.9 136.07Z\"/><path class=\"iso-tn\" data-r=\"f3\" data-b=\"1\" style=\"--f:0.328125\" d=\"M282.78 121.49L276.61 121.54L276.61 136.47L282.78 136.42Z\"/><path class=\"iso-tn\" data-r=\"f4\" data-b=\"2\" d=\"M276.61 121.54L270.47 121.29L270.47 136.22L276.61 136.47Z\"/><path class=\"iso-tn\" data-r=\"f5\" d=\"\"/><path class=\"iso-tn\" data-r=\"f6\" d=\"\"/><path class=\"iso-top\" data-r=\"top\" transform=\"matrix(1.06653 0.30788 -0.61576 0.53326 300 96.31)\" d=\"M1.85 21.85L16.062 36.062L12.354 39.424L8.334 42.405L4.041 44.978L-0.483 47.118L-8.175 28.548Z\"/><path class=\"iso-line iso-crease\" data-tone=\"faint\" data-r=\"crease\" d=\"M294.93 120.49L288.9 121.14L282.78 121.49L276.61 121.54L270.47 121.29\"/><path class=\"iso-line iso-edge\" data-tone=\"mid\" data-r=\"edge\" d=\"M294.93 135.42L288.9 136.07L282.78 136.42L276.61 136.47L270.47 136.22L270.47 121.29L273.7 109.02L288.52 108.54L294.93 120.49Z\"/></g></g></svg></div>";
const CSS = ".iso-live{--tn-0:var(--anatomy-shade-0);--tn-1:var(--anatomy-shade-1);--tn-2:var(--anatomy-shade-2);--tn-3:var(--anatomy-shade-3);--tn-4:var(--anatomy-top)}\n.iso-live [data-mat]{--tn-0:var(--anatomy-shade-0);--tn-1:var(--anatomy-shade-1);--tn-2:var(--anatomy-shade-2);--tn-3:var(--anatomy-shade-3);--tn-4:var(--anatomy-top)}\n.iso-live [data-lit]{--tn-0:var(--anatomy-lit-shade);--tn-1:var(--anatomy-lit-shade);--tn-2:var(--anatomy-lit-shade);--tn-3:var(--anatomy-lit-shade);--tn-4:var(--anatomy-lit-top)}\n.iso-tn{stroke-width:.4;stroke-linejoin:round;--ta:var(--tn-0);--tb:var(--tn-1);fill:color-mix(in srgb,var(--ta) calc(100% - var(--f,0) * 100%),var(--tb));stroke:color-mix(in srgb,var(--ta) calc(100% - var(--f,0) * 100%),var(--tb))}\n.iso-tn[data-b=\"1\"]{--ta:var(--tn-1);--tb:var(--tn-2)}\n.iso-tn[data-b=\"2\"]{--ta:var(--tn-2);--tb:var(--tn-3)}\n.iso-tn[data-b=\"3\"]{--ta:var(--tn-3);--tb:var(--tn-4)}\n[data-mat] .tb-body{fill:var(--mat-body)}\n[data-mat] .tb-shine{fill:var(--mat-shine)}\n[data-mat] .tb-shade{fill:var(--mat-shade)}\n[data-mat] .tb-edge{stroke:var(--mat-edge)}\n.tb[data-hue=\"red\"]{--tb-ink:var(--anatomy-red)}\n.tb[data-hue=\"green\"]{--tb-ink:var(--anatomy-green)}\n.tb[data-hue=\"blue\"]{--tb-ink:var(--anatomy-blue)}\n.tb[data-hue] .tb-body{fill:color-mix(in srgb,var(--tb-ink) 54%,var(--anatomy-shade-2))}\n.tb[data-hue] .tb-shine{fill:color-mix(in srgb,var(--tb-ink) 16%,var(--anatomy-top))}\n.tb[data-hue] .tb-shade{fill:color-mix(in srgb,var(--tb-ink) 30%,var(--anatomy-hi))}\n.tb[data-hue] .tb-edge{stroke:color-mix(in srgb,var(--tb-ink) 38%,var(--anatomy-hi))}\n.tb[data-hue][data-mat] .tb-body{fill:color-mix(in srgb,var(--tb-ink) 62%,var(--mat-body))}\n.tb[data-hue][data-mat] .tb-shine{fill:color-mix(in srgb,var(--tb-ink) 22%,var(--mat-shine))}\n.tb[data-hue][data-mat] .tb-shade{fill:color-mix(in srgb,var(--tb-ink) 46%,var(--mat-shade))}\n.tb[data-hue][data-mat] .tb-edge{stroke:color-mix(in srgb,var(--tb-ink) 30%,var(--mat-edge))}\n.iso-turn{position:relative}\n.iso-turn>.iso-layer{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}";
const follow = function (v) {
const THETA_DOWN=-0.28870506988513855,THETA_UP=0.32,PIVOT=[42,148],ARM=20,LINK=12,X_P=62,RISE=12,CM=6,BASE_PIN=130.33435906678758;
  const q = v.q ?? 1;
  const theta = THETA_DOWN + (THETA_UP - THETA_DOWN) * q;
  const lx = PIVOT[0] + ARM * Math.cos(theta), lz = PIVOT[1] + ARM * Math.sin(theta);
  const pin = lz - Math.sqrt(LINK * LINK - (X_P - lx) * (X_P - lx));
  const tilt = Math.asin((X_P - lx) / LINK);
  return { gato: v.gato ?? 0, piston: Math.min(RISE, Math.max(0, (v.y ?? 0) * CM)), embolo: pin - BASE_PIN, palanca: -theta * 180 / Math.PI, biela: (theta - tilt) * 180 / Math.PI };
};
export function start(root, { still, hold }) {
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);
  root.querySelector(".ph-cargando").insertAdjacentHTML("beforebegin", STAGE);
  const stage = root.querySelector(".iso-turn");
  let angle = 0, spin = still ? 0 : 14, shown = false, drag = null, lastQ = -1, lastY = -1, lastA = -1;
  // Una herramienta que toma el control (__isoTurn) detiene el giro y el bombeo propios.
  const controller = TURN.mount(stage, DATA, { follow, onHold: () => { spin = 0; hold(); } });
  stage.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, a: angle }; stage.setPointerCapture(e.pointerId); spin = 0; hold(); });
  stage.addEventListener("pointermove", (e) => { if (drag) angle = drag.a + (e.clientX - drag.x) * 0.6; });
  const up = () => { if (drag) { drag = null; setTimeout(() => { if (!drag && !still) spin = 14; }, 4000); } };
  stage.addEventListener("pointerup", up);
  stage.addEventListener("pointercancel", up);
  stage.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft") angle -= 10; if (e.key === "ArrowRight") angle += 10; });
  let t0 = 0, cost = 0, half = false, skip = false;
  window.__ph3d = {
    show(on) { shown = on; t0 = 0; },
    busy: () => shown && (spin !== 0 || drag !== null),
    frame(S, y) {
      if (!shown) return;
      const now = performance.now();
      const dt = t0 ? Math.min((now - t0) / 1000, 0.05) : 0;
      t0 = now;
      angle += spin * dt;
      if (Math.abs(S.q - lastQ) < 1e-4 && Math.abs(y - lastY) < 1e-4 && Math.abs(angle - lastA) < 1e-3) return;
      // Media tasa adaptable: si un cuadro cuesta más de 14 ms, el 3D se pinta uno sí y uno no.
      skip = half && !skip;
      if (skip) return;
      lastQ = S.q; lastY = y; lastA = angle;
      const t = performance.now();
      controller.set({ gato: angle, q: S.q, y });
      cost += (performance.now() - t - cost) * 0.1;
      half = cost > 14 ? true : cost < 9 ? false : half;
    },
  };
  return controller;
}

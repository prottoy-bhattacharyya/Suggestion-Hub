import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Circle,
  UploadCloud,
  FileText,
  Clapperboard,
  X,
  LoaderCircle,
  AlertCircle,
  ShieldCheck,
  GraduationCap,
  BookOpenCheck,
} from "lucide-react";
import axios from "axios";

import api from "@/lib/api";
import { getCSRFToken } from "@/lib/utils";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload — Suggestion Hub" },
      {
        name: "description",
        content: "Share a PDF note or a video lesson for teacher review.",
      },
      { property: "og:title", content: "Upload — Suggestion Hub" },
      {
        property: "og:description",
        content: "Submit notes or videos for teacher review.",
      },
    ],
  }),
  component: Upload,
});

type Course = {
  id: number;
  code: string;
  title: string;
  department_id: number;
};

type MediaKind = "pdf" | "video";

const MAX_PDF_SIZE = 20 * 1024 * 1024; // 20 MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500 MB

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov"];

const TYPES = [
  {
    value: "note",
    label: "Note",
    hint: "Class notes, summaries, worked solutions",
  },
  {
    value: "suggestion",
    label: "Suggestion",
    hint: "Exam suggestions and likely questions",
  },
] as const;

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/* ==========================================================================
   Basketball physics
   --------------------------------------------------------------------------
   Everything is in CSS pixels and seconds. The court is a 2D side view:
   the sling is on the left, the backboard on the right, the rim is a pair of
   end points (front rim and back rim) that the ball can hit, and the net is
   a soft region under the rim that drags on the ball.

   Tuning knobs: GRAVITY, the REST_* bounce values, RIM_OPEN (how wide the
   hoop is) and the maxSpeed formula in buildCourt().
   ========================================================================== */

type Vec = { x: number; y: number };
type Ball = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number; // rad, cosmetic card rotation
  spin: number; // rad/s
};
type Court = {
  width: number;
  height: number;
  floorY: number;
  anchor: Vec; // where the sling holds the ball at rest
  maxPull: number; // longest stretch of the band
  maxSpeed: number; // launch speed at full stretch
  rimY: number;
  frontX: number; // front rim end point
  backX: number; // back rim end point (touches the backboard)
  board: { left: number; right: number; top: number; bottom: number };
};
type Hits = { floor: number; wall: number; board: number; rim: number };
type Shot = { band: boolean; dirX: number; dirY: number };
type Spring = { x: number; v: number };
type Phase = "idle" | "aiming" | "flying" | "scored" | "returning";
type ResultKind = "swish" | "bank" | "rim" | "lucky";
type AimInfo = { dots: Vec[]; power: number; angle: number };

const GRAVITY = 1600; // px/s²
const BALL_R = 21; // collider radius
const RIM_TUBE_R = 3.5;
const RIM_OPEN = 96; // front rim to back rim, about 2.3 ball diameters
const NET_H = 64;
const FIXED_DT = 1 / 240; // physics step, small enough that nothing tunnels
const REST_FLOOR = 0.55;
const REST_WALL = 0.6;
const REST_BOARD = 0.68;
const REST_RIM = 0.52;
const AIR_DRAG = 0.12;
const NET_DRAG_X = 8;
const NET_DRAG_Y = 3.2;
const PREVIEW_DOTS = 16;
const BALL_HIT = 84; // size of the grab target around the card
const CARD_W = 44;
const CARD_H = 54;

const RESULT_COPY: Record<ResultKind, { title: string; detail: string }> = {
  swish: { title: "Swish!", detail: "Nothing but net." },
  bank: { title: "Bank shot!", detail: "Off the glass and in." },
  rim: { title: "Rattled in!", detail: "That was close." },
  lucky: { title: "Lucky bounce!", detail: "It still counts." },
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function buildCourt(width: number, height: number): Court {
  const floorY = height - 44;
  const boardRight = width - 14;
  const boardLeft = boardRight - 10;
  const backX = boardLeft - 3;
  const frontX = backX - RIM_OPEN;
  const rimY = Math.round(height * 0.4);
  const anchorX = clamp(width * 0.22, 96, 160);
  const anchor = { x: anchorX, y: floorY - 150 };
  const maxPull = Math.min(120, anchorX - BALL_R - 6, floorY - BALL_R - anchor.y);
  // Smaller courts need less speed to reach the hoop.
  const maxSpeed = 1250 * Math.sqrt(clamp(width / 700, 0.55, 1.1));

  return {
    width,
    height,
    floorY,
    anchor,
    maxPull,
    maxSpeed,
    rimY,
    frontX,
    backX,
    board: { left: boardLeft, right: boardRight, top: rimY - 104, bottom: rimY + 34 },
  };
}

function newHits(): Hits {
  return { floor: 0, wall: 0, board: 0, rim: 0 };
}

// Bounce off a surface with the given normal (pointing out of the surface).
function resolve(
  b: Ball,
  nx: number,
  ny: number,
  rest: number,
  friction: number,
  hits: Hits,
  key: keyof Hits,
) {
  const vn = b.vx * nx + b.vy * ny;
  if (vn >= 0) return; // already moving away

  b.vx -= (1 + rest) * vn * nx;
  b.vy -= (1 + rest) * vn * ny;

  // Friction along the surface, and the card picks up spin from the slip.
  const tx = -ny;
  const ty = nx;
  const vt = b.vx * tx + b.vy * ty;
  const dvt = vt * friction;
  b.vx -= dvt * tx;
  b.vy -= dvt * ty;
  b.spin += ((vt - dvt) / BALL_R - b.spin) * 0.35;

  hits[key] = Math.max(hits[key], -vn);
}

// Static circle (a rim end point).
function collideCircle(b: Ball, cx: number, cy: number, cr: number, hits: Hits) {
  const dx = b.x - cx;
  const dy = b.y - cy;
  const minD = BALL_R + cr;
  const d2 = dx * dx + dy * dy;
  if (d2 >= minD * minD) return;

  const d = Math.sqrt(d2);
  const nx = d < 1e-6 ? 0 : dx / d;
  const ny = d < 1e-6 ? -1 : dy / d;

  b.x = cx + nx * minD;
  b.y = cy + ny * minD;
  resolve(b, nx, ny, REST_RIM, 0.12, hits, "rim");

  // A ball can't balance on top of a rim point.
  if (Math.abs(nx) < 0.04 && ny < 0) b.vx += (b.x >= cx ? 1 : -1) * 14;
}

// Backboard: a solid rectangle.
function collideBoard(b: Ball, c: Court, hits: Hits) {
  const { left, right, top, bottom } = c.board;
  const px = clamp(b.x, left, right);
  const py = clamp(b.y, top, bottom);
  const dx = b.x - px;
  const dy = b.y - py;
  const d2 = dx * dx + dy * dy;
  if (d2 >= BALL_R * BALL_R) return;

  const d = Math.sqrt(d2);
  let nx: number;
  let ny: number;

  if (d < 1e-6) {
    // Centre is inside the board; push out through the left face.
    nx = -1;
    ny = 0;
    b.x = left - BALL_R;
  } else {
    nx = dx / d;
    ny = dy / d;
    b.x = px + nx * BALL_R;
    b.y = py + ny * BALL_R;
  }

  resolve(b, nx, ny, REST_BOARD, 0.04, hits, "board");

  // The top edge is thin; don't let the ball balance on it.
  if (ny < -0.98) b.vx += (b.x < (left + right) / 2 ? -1 : 1) * 12;
}

// How much the net is gripping the ball, 0 to 1.
function netEngagement(b: Ball, c: Court): number {
  const cx = (c.frontX + c.backX) / 2;
  if (Math.abs(b.x - cx) > RIM_OPEN / 2) return 0;

  const depth = (b.y - c.rimY) / NET_H;
  const enter = clamp((depth + BALL_R / NET_H) / 0.5, 0, 1);
  const leave = clamp((1.3 - depth) / 0.4, 0, 1);

  return Math.min(enter, leave);
}

// Advance the ball by dt. Returns true on the step it drops through the hoop.
function stepBall(b: Ball, c: Court, dt: number, hits: Hits): boolean {
  const prevY = b.y;

  // Gravity and a little air drag (semi-implicit Euler).
  const drag = Math.exp(-AIR_DRAG * dt);
  b.vx *= drag;
  b.vy = b.vy * drag + GRAVITY * dt;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  b.angle += b.spin * dt;

  // Rim and backboard.
  collideCircle(b, c.frontX, c.rimY, RIM_TUBE_R, hits);
  collideCircle(b, c.backX, c.rimY, RIM_TUBE_R, hits);
  collideBoard(b, c, hits);

  // Net: slows the ball down and funnels it toward the middle.
  const engaged = netEngagement(b, c);
  if (engaged > 0) {
    b.vx *= Math.exp(-NET_DRAG_X * engaged * dt);
    b.vy *= Math.exp(-NET_DRAG_Y * engaged * dt);
    b.spin *= Math.exp(-4 * engaged * dt);

    const depth = (b.y - c.rimY) / NET_H;
    if (depth > 0) {
      const cx = (c.frontX + c.backX) / 2;
      const half = (RIM_OPEN / 2) * (1 - 0.34 * clamp(depth, 0, 1)) - BALL_R * 0.55;
      const dx = b.x - cx;

      if (Math.abs(dx) > half) {
        b.x = cx + Math.sign(dx) * half;
        if (b.vx * dx > 0) b.vx *= -0.15;
      }
    }
  }

  // Side walls and ceiling.
  if (b.x < BALL_R) {
    b.x = BALL_R;
    if (b.vx < 0) {
      hits.wall = Math.max(hits.wall, -b.vx);
      b.vx *= -REST_WALL;
      b.spin *= 0.7;
    }
  } else if (b.x > c.width - BALL_R) {
    b.x = c.width - BALL_R;
    if (b.vx > 0) {
      hits.wall = Math.max(hits.wall, b.vx);
      b.vx *= -REST_WALL;
      b.spin *= 0.7;
    }
  }

  if (b.y < BALL_R) {
    b.y = BALL_R;
    if (b.vy < 0) b.vy *= -REST_WALL;
  }

  // Floor: bounce, settle, then roll with friction.
  const floor = c.floorY - BALL_R;
  if (b.y >= floor) {
    b.y = floor;

    if (b.vy > 0) {
      const impact = b.vy;
      if (impact > 70) {
        b.vy = -impact * REST_FLOOR;
        b.vx *= 0.93;
        b.spin += (b.vx / BALL_R - b.spin) * 0.4;
        hits.floor = Math.max(hits.floor, impact);
      } else {
        b.vy = 0;
      }
    }

    if (b.vy === 0) {
      b.vx *= Math.exp(-1.9 * dt);
      b.spin = b.vx / BALL_R;
    }
  }

  // Scored: centre crosses the rim plane going down, between the two ends.
  return prevY < c.rimY && b.y >= c.rimY && b.vy > 0 && b.x > c.frontX && b.x < c.backX;
}

// One step of a shot. While the band is attached it pulls the ball toward the
// sling like a spring, so launch speed is proportional to how far you pulled.
function stepShot(b: Ball, c: Court, shot: Shot, dt: number, hits: Hits): boolean {
  if (shot.band) {
    const omega = c.maxSpeed / c.maxPull;
    const k = omega * omega;
    b.vx += k * (c.anchor.x - b.x) * dt;
    b.vy += k * (c.anchor.y - b.y) * dt;
  }

  const scored = stepBall(b, c, dt, hits);

  // The band lets go once the ball passes the sling.
  if (shot.band && (b.x - c.anchor.x) * shot.dirX + (b.y - c.anchor.y) * shot.dirY >= 0) {
    shot.band = false;
  }

  return scored;
}

// Dots showing where the shot will go, using the exact same physics.
// Stops at the first thing the ball hits.
function previewShot(c: Court, pull: Vec): Vec[] {
  const dx = c.anchor.x - pull.x;
  const dy = c.anchor.y - pull.y;
  const len = Math.hypot(dx, dy) || 1;
  const shot: Shot = { band: true, dirX: dx / len, dirY: dy / len };
  const b: Ball = { x: pull.x, y: pull.y, vx: 0, vy: 0, angle: 0, spin: 0 };
  const hits = newHits();
  const dots: Vec[] = [];
  let sinceDot = 0;

  for (let i = 0; i < 600 && dots.length < PREVIEW_DOTS; i++) {
    const scored = stepShot(b, c, shot, FIXED_DT, hits);

    if (shot.band) sinceDot = 0;
    else sinceDot += FIXED_DT;

    const collided = hits.floor || hits.wall || hits.board || hits.rim;

    if (scored || collided) {
      dots.push({ x: b.x, y: b.y });
      break;
    }

    if (!shot.band && sinceDot >= 0.05) {
      dots.push({ x: b.x, y: b.y });
      sinceDot = 0;
    }
  }

  return dots;
}

// Rubber band feel: 1:1 for the first part of the pull, then it gets stiffer.
function rubber(raw: number, max: number) {
  const soft = max * 0.6;
  if (raw <= soft) return raw;
  return soft + (max - soft) * Math.tanh((raw - soft) / (max - soft));
}

function clampPull(c: Court, p: Vec): Vec {
  return {
    x: clamp(p.x, BALL_R, c.width - BALL_R),
    y: clamp(p.y, BALL_R, c.floorY - BALL_R),
  };
}

// Where the ball sits when the pointer is at `target`.
function pullPosition(c: Court, target: Vec): Vec {
  const rx = target.x - c.anchor.x;
  const ry = target.y - c.anchor.y;
  const raw = Math.hypot(rx, ry);
  if (raw < 1e-6) return { ...c.anchor };

  const s = rubber(raw, c.maxPull);
  return clampPull(c, {
    x: c.anchor.x + (rx / raw) * s,
    y: c.anchor.y + (ry / raw) * s,
  });
}

// Keyboard aiming: angle above the horizontal and power from 0 to 1.
function keyboardPull(c: Court, aim: { power: number; angle: number }): Vec {
  const stretch = aim.power * c.maxPull;
  const rad = (aim.angle * Math.PI) / 180;

  return clampPull(c, {
    x: c.anchor.x - Math.cos(rad) * stretch,
    y: c.anchor.y + Math.sin(rad) * stretch,
  });
}

// Net strands and cross-links as SVG path data, deformed by the springs.
function netPaths(c: Court, s: { stretch: Spring; bulge: Spring; sway: Spring }) {
  const cx = (c.frontX + c.backX) / 2;
  const strands = 5;
  const bottomY = c.rimY + NET_H + s.stretch.x;
  const ctrlY = c.rimY + (bottomY - c.rimY) / 2;

  const at = (i: number, t: number): Vec => {
    const u = i / (strands - 1);
    const topX = c.frontX + u * (c.backX - c.frontX);
    const botX = cx + (u - 0.5) * RIM_OPEN * 0.62 + s.sway.x;
    const ctrlX = (topX + botX) / 2 + (u - 0.5) * 2 * s.bulge.x;
    const m = 1 - t;

    return {
      x: m * m * topX + 2 * m * t * ctrlX + t * t * botX,
      y: m * m * c.rimY + 2 * m * t * ctrlY + t * t * bottomY,
    };
  };

  let strandsD = "";
  for (let i = 0; i < strands; i++) {
    for (let k = 0; k <= 8; k++) {
      const p = at(i, k / 8);
      strandsD += `${k === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)} `;
    }
  }

  const levels = [0.2, 0.45, 0.7, 0.95];
  let crossD = "";
  for (let j = 0; j < levels.length - 1; j++) {
    const topLevel = levels[j];
    const bottomLevel = levels[j + 1];
    if (topLevel === undefined || bottomLevel === undefined) continue;
    for (let i = 0; i < strands - 1; i++) {
      const even = (i + j) % 2 === 0;
      const a = even ? at(i, topLevel) : at(i + 1, topLevel);
      const b = even ? at(i + 1, bottomLevel) : at(i, bottomLevel);
      crossD += `M${a.x.toFixed(1)} ${a.y.toFixed(1)} L${b.x.toFixed(1)} ${b.y.toFixed(1)} `;
    }
  }

  return { strandsD, crossD };
}

type Sim = {
  ball: Ball;
  shot: Shot;
  tipActive: boolean; // band end follows the ball
  tipX: Spring; // band end when it snaps back
  tipY: Spring;
  rim: Spring; // visual rim shake
  board: Spring; // visual backboard shake
  netStretch: Spring;
  netBulge: Spring;
  netSway: Spring;
  netTarget: number;
  acc: number;
  last: number;
  raf: number | null;
  flightTime: number;
  floorTime: number;
  restTime: number;
  scored: boolean;
  stats: {
    apexY: number;
    crossX: number | null;
    hitRim: boolean;
    hitBoard: boolean;
    bounced: boolean;
  };
  ret: {
    t: number;
    from: { x: number; y: number; angle: number };
  } | null;
};

function createSim(): Sim {
  const spring = (): Spring => ({ x: 0, v: 0 });

  return {
    ball: { x: 0, y: 0, vx: 0, vy: 0, angle: 0, spin: 0 },
    shot: { band: false, dirX: 1, dirY: 0 },
    tipActive: false,
    tipX: spring(),
    tipY: spring(),
    rim: spring(),
    board: spring(),
    netStretch: spring(),
    netBulge: spring(),
    netSway: spring(),
    netTarget: 0,
    acc: 0,
    last: 0,
    raf: null,
    flightTime: 0,
    floorTime: 0,
    restTime: 0,
    scored: false,
    stats: {
      apexY: Infinity,
      crossX: null,
      hitRim: false,
      hitBoard: false,
      bounced: false,
    },
    ret: null,
  };
}

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

function Upload() {
  const [mediaKind, setMediaKind] = useState<MediaKind>("pdf");
  const [file, setFile] = useState<File | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [courseId, setCourseId] = useState("");
  const [type, setType] = useState<string>("note");
  const [intake, setIntake] = useState("");
  const [section, setSection] = useState("");
  const [description, setDescription] = useState("");

  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);

  // Basketball state
  const [courtSize, setCourtSize] = useState({ width: 640, height: 460 });
  const [phase, setPhaseState] = useState<Phase>("idle");
  const [aim, setAim] = useState<AimInfo | null>(null);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<ResultKind | null>(null);

  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState("");

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState(
    "Your upload has been submitted successfully.",
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const basketballRef = useRef<HTMLDivElement>(null);
  const ballElRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<SVGEllipseElement>(null);
  const bandLRef = useRef<SVGLineElement>(null);
  const bandRRef = useRef<SVGLineElement>(null);
  const netStrandsRef = useRef<SVGPathElement>(null);
  const netCrossRef = useRef<SVGPathElement>(null);
  const rimGroupRef = useRef<SVGGElement>(null);
  const boardGroupRef = useRef<SVGGElement>(null);

  const [sim] = useState<Sim>(createSim);
  const court = useMemo(() => buildCourt(courtSize.width, courtSize.height), [courtSize]);
  const courtRef = useRef(court);
  courtRef.current = court;

  const phaseRef = useRef<Phase>("idle");
  const pendingFileRef = useRef<File | null>(null);
  pendingFileRef.current = pendingFile;
  const scoredFileRef = useRef<File | null>(null);
  const commitTimerRef = useRef<number | null>(null);
  const grabRef = useRef<Vec | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const kbAimRef = useRef({ power: 0.62, angle: 52 });

  const isVideo = mediaKind === "video";
  const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_PDF_SIZE;
  const mediaLabel = isVideo ? "video" : "PDF";

  const setPhase = (next: Phase) => {
    phaseRef.current = next;
    setPhaseState(next);
  };

  /* ---------------------------------------------------------------------
     Drawing: positions are written straight to the DOM every frame so the
     animation doesn't re-render React.
     --------------------------------------------------------------------- */
  const renderScene = () => {
    const c = courtRef.current;
    const ball = sim.ball;

    const ballEl = ballElRef.current;
    if (ballEl) {
      ballEl.style.transform = `translate3d(${(ball.x - BALL_HIT / 2).toFixed(2)}px, ${(ball.y - BALL_HIT / 2).toFixed(2)}px, 0) rotate(${ball.angle.toFixed(4)}rad)`;
    }

    // Sling bands run from the two posts to the ball (or the snapping tip).
    const tip = sim.tipActive ? { x: ball.x, y: ball.y } : { x: sim.tipX.x, y: sim.tipY.x };

    const bands: [SVGLineElement | null, number][] = [
      [bandLRef.current, c.anchor.x - 22],
      [bandRRef.current, c.anchor.x + 22],
    ];

    for (const [line, postX] of bands) {
      if (!line) continue;
      line.setAttribute("x1", String(postX));
      line.setAttribute("y1", String(c.anchor.y + 14));
      line.setAttribute("x2", tip.x.toFixed(2));
      line.setAttribute("y2", tip.y.toFixed(2));
    }

    // Soft shadow on the floor shows how high the ball is.
    const shadow = shadowRef.current;
    if (shadow) {
      const height = Math.max(0, c.floorY - BALL_R - ball.y);
      const k = clamp(1 - height / 520, 0.25, 1);
      shadow.setAttribute("cx", ball.x.toFixed(2));
      shadow.setAttribute("cy", String(c.floorY + 6));
      shadow.setAttribute("rx", (20 * k + 4).toFixed(2));
      shadow.setAttribute("ry", (3.5 * k + 1.5).toFixed(2));
      shadow.setAttribute("opacity", pendingFileRef.current ? (0.3 * k).toFixed(3) : "0");
    }

    const net = netPaths(c, {
      stretch: sim.netStretch,
      bulge: sim.netBulge,
      sway: sim.netSway,
    });
    netStrandsRef.current?.setAttribute("d", net.strandsD);
    netCrossRef.current?.setAttribute("d", net.crossD);

    rimGroupRef.current?.setAttribute("transform", `translate(0 ${sim.rim.x.toFixed(2)})`);
    boardGroupRef.current?.setAttribute("transform", `translate(${sim.board.x.toFixed(2)} 0)`);
  };

  const resetBall = () => {
    const c = courtRef.current;
    sim.ball = { x: c.anchor.x, y: c.anchor.y, vx: 0, vy: 0, angle: 0, spin: 0 };
    sim.shot.band = false;
    sim.tipActive = false;
    sim.tipX = { x: c.anchor.x, v: 0 };
    sim.tipY = { x: c.anchor.y, v: 0 };
    sim.ret = null;
    setAim(null);
    renderScene();
  };

  const hardReset = () => {
    if (commitTimerRef.current !== null) {
      window.clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }
    scoredFileRef.current = null;
    pointerIdRef.current = null;
    setPhase("idle");
    setResult(null);
    setStatus("");
    resetBall();
  };

  const hostPoint = (clientX: number, clientY: number): Vec => {
    const el = basketballRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return { x: clientX - r.left - el.clientLeft, y: clientY - r.top - el.clientTop };
  };

  /* ---------------------------------------------------------------------
     Simulation loop
     --------------------------------------------------------------------- */
  const stepSprings = (dt: number) => {
    const c = courtRef.current;
    const spr = (s: Spring, target: number, k: number, damping: number) => {
      s.v += (k * (target - s.x) - damping * s.v) * dt;
      s.x += s.v * dt;
    };

    spr(sim.rim, 0, 1600, 22);
    spr(sim.board, 0, 1000, 18);
    spr(sim.netStretch, sim.netTarget * 8, 360, 10);
    spr(sim.netBulge, sim.netTarget * 10, 420, 12);
    spr(sim.netSway, 0, 300, 8);

    if (!sim.tipActive) {
      spr(sim.tipX, c.anchor.x, 900, 14);
      spr(sim.tipY, c.anchor.y, 900, 14);
    }
  };

  const springsMoving = () => {
    const c = courtRef.current;
    const rest = (s: Spring, target = 0) => Math.abs(s.x - target) < 0.03 && Math.abs(s.v) < 0.3;

    return !(
      rest(sim.rim) &&
      rest(sim.board) &&
      rest(sim.netSway) &&
      rest(sim.netStretch, sim.netTarget * 8) &&
      rest(sim.netBulge, sim.netTarget * 10) &&
      (sim.tipActive || (rest(sim.tipX, c.anchor.x) && rest(sim.tipY, c.anchor.y)))
    );
  };

  const commitShot = () => {
    commitTimerRef.current = null;
    const accepted = scoredFileRef.current;
    scoredFileRef.current = null;

    sim.shot.band = false;
    setPhase("idle");
    setAim(null);
    setResult(null);
    setStatus("");

    if (accepted) {
      setFile(accepted);
      setPendingFile(null);
      setError("");
    }
  };

  const onScore = () => {
    sim.scored = true;
    setPhase("scored");

    const st = sim.stats;
    const kind: ResultKind = st.hitRim
      ? "rim"
      : st.hitBoard
        ? "bank"
        : st.bounced
          ? "lucky"
          : "swish";

    // The net reacts to how hard the ball came in.
    sim.netStretch.v += sim.ball.vy * 0.35;
    sim.netBulge.v += Math.abs(sim.ball.vy) * 0.12;
    sim.netSway.v += sim.ball.vx * 0.25;

    try {
      navigator.vibrate?.(kind === "swish" ? 12 : 8);
    } catch {
      /* vibration is optional */
    }

    scoredFileRef.current = pendingFileRef.current;
    setResult(kind);
    setStatus("");
    commitTimerRef.current = window.setTimeout(commitShot, 1250);
  };

  const beginReturn = () => {
    const c = courtRef.current;
    const st = sim.stats;

    let message = "Missed. Give it another shot.";
    if (st.hitRim) message = "Rimmed out! So close. Try again.";
    else if (st.hitBoard) message = "Off the backboard. Try a softer shot.";
    else if (st.crossX !== null && st.crossX < c.frontX) {
      message = "Too short. Pull back farther.";
    } else if (st.apexY > c.rimY - 4) {
      message = "Didn't reach the hoop. Aim steeper or pull farther.";
    }

    setStatus(message);

    // Wrap the angle so the card spins back the short way.
    const wrapped = Math.atan2(Math.sin(sim.ball.angle), Math.cos(sim.ball.angle));

    sim.ret = { t: 0, from: { x: sim.ball.x, y: sim.ball.y, angle: wrapped } };
    sim.ball.vx = 0;
    sim.ball.vy = 0;
    sim.ball.spin = 0;
    sim.shot.band = false;
    setPhase("returning");
  };

  const stepFlight = (dt: number) => {
    const c = courtRef.current;
    const hits = newHits();
    const prevBand = sim.shot.band;
    const prevY = sim.ball.y;

    const scored = stepShot(sim.ball, c, sim.shot, dt, hits);
    sim.flightTime += dt;

    const st = sim.stats;
    if (sim.ball.y < st.apexY) st.apexY = sim.ball.y;
    if (hits.rim > 20) st.hitRim = true;
    if (hits.board > 20) st.hitBoard = true;
    if (hits.floor > 80 || hits.wall > 60) st.bounced = true;

    // Visual reactions to impacts.
    if (hits.rim > 60) sim.rim.v += hits.rim * 0.25;
    if (hits.board > 60) sim.board.v += hits.board * 0.12;

    // The band snaps back once the ball is gone.
    if (prevBand && !sim.shot.band) {
      sim.tipActive = false;
      sim.tipX = { x: sim.ball.x, v: sim.ball.vx * 0.25 };
      sim.tipY = { x: sim.ball.y, v: sim.ball.vy * 0.25 };
    }

    // Remember where the ball came down through the rim plane.
    if (prevY < c.rimY && sim.ball.y >= c.rimY && sim.ball.vy > 0 && st.crossX === null) {
      st.crossX = sim.ball.x;
    }

    sim.netTarget = netEngagement(sim.ball, c);

    if (scored && !sim.scored) onScore();
  };

  const advance = (dtFrame: number) => {
    const c = courtRef.current;
    sim.acc += dtFrame;

    while (sim.acc >= FIXED_DT) {
      sim.acc -= FIXED_DT;

      if (phaseRef.current === "flying" || phaseRef.current === "scored") {
        stepFlight(FIXED_DT);
      } else {
        sim.netTarget = 0;
      }

      stepSprings(FIXED_DT);
    }

    // Missed shots roll to a stop, then the ball slides back to the sling.
    if (phaseRef.current === "flying") {
      const onFloor = sim.ball.y >= c.floorY - BALL_R - 0.5;
      const speed = Math.hypot(sim.ball.vx, sim.ball.vy);

      if (onFloor) sim.floorTime += dtFrame;
      if (onFloor && speed < 18) sim.restTime += dtFrame;
      else sim.restTime = 0;

      if (sim.restTime > 0.3 || sim.floorTime > 1.5 || sim.flightTime > 7) {
        beginReturn();
      }
    } else if (phaseRef.current === "returning" && sim.ret) {
      sim.ret.t += dtFrame / 0.5;
      const t = Math.min(1, sim.ret.t);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const from = sim.ret.from;

      sim.ball.x = from.x + (c.anchor.x - from.x) * e;
      sim.ball.y = from.y + (c.anchor.y - from.y) * e;
      sim.ball.angle = from.angle * (1 - e);

      if (t >= 1) {
        sim.ret = null;
        sim.ball.x = c.anchor.x;
        sim.ball.y = c.anchor.y;
        sim.ball.angle = 0;
        setPhase("idle");
      }
    }
  };

  const ensureLoop = () => {
    if (sim.raf !== null) return;
    sim.last = performance.now();

    const tick = (now: number) => {
      const dtFrame = Math.min(0.05, (now - sim.last) / 1000);
      sim.last = now;

      advance(dtFrame);
      renderScene();

      if (phaseRef.current !== "idle" || springsMoving()) {
        sim.raf = requestAnimationFrame(tick);
      } else {
        sim.raf = null;
      }
    };

    sim.raf = requestAnimationFrame(tick);
  };

  /* ---------------------------------------------------------------------
     Aiming and shooting
     --------------------------------------------------------------------- */
  const setPull = (p: Vec) => {
    const c = courtRef.current;
    sim.ball.x = p.x;
    sim.ball.y = p.y;
    sim.ball.vx = 0;
    sim.ball.vy = 0;
    sim.ball.angle = 0;
    sim.tipActive = true;

    const stretch = Math.hypot(p.x - c.anchor.x, p.y - c.anchor.y);
    const angle = (Math.atan2(p.y - c.anchor.y, c.anchor.x - p.x) * 180) / Math.PI;

    setAim({
      dots: previewShot(c, p),
      power: stretch / c.maxPull,
      angle,
    });
    renderScene();
  };

  const cancelAim = (message = "") => {
    const c = courtRef.current;
    const stretch = Math.hypot(sim.ball.x - c.anchor.x, sim.ball.y - c.anchor.y);

    // The band eases back to the sling.
    sim.tipActive = false;
    sim.tipX = { x: sim.ball.x, v: 0 };
    sim.tipY = { x: sim.ball.y, v: 0 };
    sim.ball.x = c.anchor.x;
    sim.ball.y = c.anchor.y;
    sim.ball.angle = 0;

    setAim(null);
    setPhase("idle");
    if (message && stretch > 4) setStatus(message);
    renderScene();
    ensureLoop();
  };

  const launch = (p: Vec) => {
    const c = courtRef.current;
    const dx = c.anchor.x - p.x;
    const dy = c.anchor.y - p.y;
    const len = Math.hypot(dx, dy) || 1;

    sim.ball = { x: p.x, y: p.y, vx: 0, vy: 0, angle: 0, spin: 0 };
    sim.shot = { band: true, dirX: dx / len, dirY: dy / len };
    sim.tipActive = true;
    sim.acc = 0;
    sim.flightTime = 0;
    sim.floorTime = 0;
    sim.restTime = 0;
    sim.scored = false;
    sim.stats = {
      apexY: Infinity,
      crossX: null,
      hitRim: false,
      hitBoard: false,
      bounced: false,
    };

    setAim(null);
    setStatus("");
    setPhase("flying");
    ensureLoop();
  };

  const releasePull = (cancelled: boolean) => {
    const c = courtRef.current;
    const p = { x: sim.ball.x, y: sim.ball.y };
    const stretch = Math.hypot(p.x - c.anchor.x, p.y - c.anchor.y);

    if (cancelled || stretch < 10) {
      cancelAim("Pull back a little farther to shoot.");
      return;
    }

    launch(p);
  };

  function onBallPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (loading || !pendingFile || phaseRef.current !== "idle") return;

    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    const c = courtRef.current;
    const pt = hostPoint(e.clientX, e.clientY);

    grabRef.current = { x: pt.x - c.anchor.x, y: pt.y - c.anchor.y };
    pointerIdRef.current = e.pointerId;
    sim.tipActive = true;

    setStatus("");
    setPhase("aiming");
    ensureLoop();
  }

  function onBallPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== "aiming" || pointerIdRef.current !== e.pointerId) return;

    const grab = grabRef.current;
    if (!grab) return;

    const pt = hostPoint(e.clientX, e.clientY);
    setPull(pullPosition(courtRef.current, { x: pt.x - grab.x, y: pt.y - grab.y }));
  }

  function onBallPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (pointerIdRef.current !== e.pointerId) return;
    pointerIdRef.current = null;

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    if (phaseRef.current === "aiming") releasePull(e.type === "pointercancel");
  }

  function onBallKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (loading || !pendingFile) return;

    const current = phaseRef.current;
    if (current !== "idle" && current !== "aiming") return;
    if (pointerIdRef.current !== null) return;

    const keys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", " ", "Escape"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();

    if (e.key === "Escape") {
      if (current === "aiming") cancelAim();
      return;
    }

    if (current === "idle") {
      kbAimRef.current = { power: 0.62, angle: 52 };
      sim.tipActive = true;
      setStatus("");
      setPhase("aiming");
      ensureLoop();
    } else if (e.key === "Enter" || e.key === " ") {
      releasePull(false);
      return;
    }

    const kb = kbAimRef.current;
    const step = e.shiftKey ? 3 : 1;

    if (e.key === "ArrowUp") kb.angle = clamp(kb.angle + 2 * step, 10, 85);
    if (e.key === "ArrowDown") kb.angle = clamp(kb.angle - 2 * step, 10, 85);
    if (e.key === "ArrowRight") kb.power = clamp(kb.power + 0.03 * step, 0.1, 1);
    if (e.key === "ArrowLeft") kb.power = clamp(kb.power - 0.03 * step, 0.1, 1);

    setPull(keyboardPull(courtRef.current, kb));
  }

  /* --------------------------------------------------------------------- */

  // Keep the court sized to its container.
  useEffect(() => {
    const el = basketballRef.current;
    if (!el) return;

    const measure = () => {
      const width = el.clientWidth;
      const height = el.clientHeight;
      if (width < 200) return;

      setCourtSize((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height },
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);

    return () => observer.disconnect();
  }, [file, mediaKind]);

  // Put the ball on the sling whenever a new file arrives or the court resizes.
  useEffect(() => {
    if (phaseRef.current === "idle") resetBall();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingFile, court]);

  // Re-apply positions after every render (refs can be new after remounts).
  useIsoLayoutEffect(() => {
    renderScene();
  });

  useEffect(() => {
    return () => {
      if (sim.raf !== null) cancelAnimationFrame(sim.raf);
      sim.raf = null;
      if (commitTimerRef.current !== null) window.clearTimeout(commitTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load courses from Django.
  useEffect(() => {
    let active = true;

    async function getCoursesList() {
      try {
        setCoursesLoading(true);
        setCoursesError("");

        const csrfToken = await getCSRFToken();

        const response = await api.get("/academics/courses_list/", {
          headers: {
            Accept: "application/json",
            ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
          },
        });

        if (!active) return;

        const courseList = response.data.courses;

        if (!Array.isArray(courseList)) {
          throw new Error("Invalid course list received from server.");
        }

        setCourses(courseList);
      } catch (err: unknown) {
        if (!active) return;

        console.error("Error fetching courses:", err);

        if (axios.isAxiosError(err)) {
          setCoursesError(
            err.response?.data?.error ??
              err.response?.data?.detail ??
              "Failed to load courses. Please refresh the page.",
          );
        } else {
          setCoursesError(err instanceof Error ? err.message : "Failed to load courses.");
        }
      } finally {
        if (active) setCoursesLoading(false);
      }
    }

    void getCoursesList();

    return () => {
      active = false;
    };
  }, []);

  // Switch between the PDF and video sections, clearing any picked file.
  function switchMedia(kind: MediaKind) {
    if (kind === mediaKind || loading) return;
    setMediaKind(kind);
    setFile(null);
    setPendingFile(null);
    hardReset();
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Validate a file coming from the picker or from drag and drop.
  function acceptFile(selectedFile: File | null): boolean {
    setError("");
    setFile(null);
    setPendingFile(null);
    setStatus("");

    if (!selectedFile) return false;

    const name = selectedFile.name.toLowerCase();

    if (isVideo) {
      const isVideoFile =
        selectedFile.type.startsWith("video/") ||
        VIDEO_EXTENSIONS.some((ext) => name.endsWith(ext));

      if (!isVideoFile) {
        setError("Only video files are allowed (MP4, WebM, MOV).");
        return false;
      }
    } else {
      const isPdf = selectedFile.type === "application/pdf" || name.endsWith(".pdf");

      if (!isPdf) {
        setError("Only PDF files are allowed.");
        return false;
      }
    }

    if (selectedFile.size === 0) {
      setError("The selected file is empty.");
      return false;
    }

    if (selectedFile.size > maxSize) {
      setError(isVideo ? "Video size must be 500 MB or less." : "File size must be 20 MB or less.");
      return false;
    }

    setPendingFile(selectedFile);
    setError("");
    return true;
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (phaseRef.current !== "idle") {
      e.target.value = "";
      return;
    }

    const ok = acceptFile(e.target.files?.[0] ?? null);
    if (!ok) e.target.value = "";
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    if (loading || phaseRef.current !== "idle") return;

    const dropped = e.dataTransfer.files?.[0] ?? null;
    const ok = acceptFile(dropped);

    if (fileInputRef.current) {
      if (ok && dropped) {
        const transfer = new DataTransfer();
        transfer.items.add(dropped);
        fileInputRef.current.files = transfer.files;
      } else {
        fileInputRef.current.value = "";
      }
    }
  }

  function removeFile() {
    setFile(null);
    setPendingFile(null);
    setError("");
    hardReset();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Submit the file to Django.
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");

    if (!file) {
      setError(`Please shoot your ${mediaLabel} through the hoop before submitting.`);
      return;
    }

    if (!courseId) {
      setError("Please select a course.");
      return;
    }

    if (!title.trim()) {
      setError("Please enter a title.");
      return;
    }

    if (!intake.trim() || !section.trim()) {
      setError("Please enter your intake and section.");
      return;
    }

    try {
      setLoading(true);
      setProgress(0);

      const csrfToken = await getCSRFToken();

      // FormData is required for file uploads.
      const formData = new FormData();

      formData.append("file", file);
      formData.append("media_type", mediaKind); // "pdf" or "video" — Django can branch on this
      formData.append("title", title.trim());
      formData.append("course_id", courseId);
      formData.append("type", type);
      formData.append("intake", intake.trim());
      formData.append("section", section.trim());
      formData.append("description", description.trim());

      const response = await api.post("/notes/upload/", formData, {
        headers: {
          Accept: "application/json",
          ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
        },
        onUploadProgress: (event) => {
          const total = event.total ?? file.size;
          if (total > 0) {
            setProgress(Math.min(100, Math.round((event.loaded / total) * 100)));
          }
        },
      });

      setSuccessMessage(
        response.data?.message ?? `Your ${mediaLabel} has been submitted successfully.`,
      );

      setProgress(100);
      setDone(true);
    } catch (err: unknown) {
      console.error("Upload failed:", err);

      if (axios.isAxiosError(err)) {
        const data = err.response?.data;

        if (data && typeof data === "object") {
          const message = data.error ?? data.detail ?? data.message;

          if (typeof message === "string") {
            setError(message);
          } else {
            // Display Django field validation errors.
            const fieldErrors = Object.entries(data)
              .map(([field, messages]) => {
                const text = Array.isArray(messages) ? messages.join(" ") : String(messages);

                return `${field}: ${text}`;
              })
              .join(" ");

            setError(fieldErrors || `Upload failed (HTTP ${err.response?.status}).`);
          }
        } else if (err.response) {
          setError(`Upload failed (HTTP ${err.response.status}). Please try again.`);
        } else {
          setError(
            "Cannot connect to the server. Check your internet connection and Django server.",
          );
        }
      } else {
        setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      }
      setProgress(0);
    } finally {
      setLoading(false);
    }
  }

  const selectedCourse = courses.find((c) => String(c.id) === courseId);
  const selectedType = TYPES.find((t) => t.value === type) ?? TYPES[0];

  // What the person still has to fill in before they can submit.
  const requirements = [
    { label: `${mediaLabel} selected`, met: Boolean(file) },
    { label: "Title added", met: Boolean(title.trim()) },
    { label: "Course chosen", met: Boolean(courseId) },
    {
      label: "Intake and section added",
      met: Boolean(intake.trim() && section.trim()),
    },
  ];
  const missing = requirements.filter((r) => !r.met);
  const ready = missing.length === 0;

  const reviewSteps = [
    {
      icon: ShieldCheck,
      title: "File check",
      text: isVideo
        ? "We make sure the video plays and isn't a duplicate."
        : "We make sure the PDF opens, isn't encrypted, and isn't a duplicate.",
    },
    {
      icon: GraduationCap,
      title: "Teacher review",
      text: "A teacher for the course checks that the content is accurate.",
    },
    {
      icon: BookOpenCheck,
      title: "Published",
      text: "Students in your course can find and rate it.",
    },
  ];

  // Success screen.
  if (done) {
    const summary = [
      { label: "Kind", value: isVideo ? "Video" : "PDF" },
      { label: "Title", value: title.trim() },
      {
        label: "Course",
        value: selectedCourse ? `${selectedCourse.code} — ${selectedCourse.title}` : "—",
      },
      { label: "Type", value: selectedType.label },
      { label: "Intake and section", value: `${intake.trim()} / ${section.trim()}` },
    ];

    return (
      <div className="mx-auto max-w-lg px-4 py-20">
        <style>{`
          @keyframes upload-pop { 0% { transform: scale(.6); opacity: 0 } 60% { transform: scale(1.08); opacity: 1 } 100% { transform: scale(1) } }
          .upload-pop { animation: upload-pop .5s cubic-bezier(.2,.8,.2,1) both }
          @media (prefers-reduced-motion: reduce) { .upload-pop { animation: none } }
        `}</style>

        <div className="text-center">
          <span className="upload-pop mx-auto grid h-16 w-16 place-items-center rounded-full bg-success/10">
            <CheckCircle2 className="h-9 w-9 text-success" />
          </span>

          <h1 className="mt-6 text-3xl font-semibold tracking-tight">Sent for review</h1>

          <p className="mt-3 text-muted-foreground">{successMessage}</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Other students will see it once a teacher for the course approves it.
          </p>
        </div>

        <dl className="paper-card mt-8 divide-y divide-border">
          {summary.map((row) => (
            <div
              key={row.label}
              className="flex items-baseline justify-between gap-6 px-5 py-3 text-sm"
            >
              <dt className="shrink-0 text-muted-foreground">{row.label}</dt>
              <dd className="min-w-0 truncate text-right font-medium">{row.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 flex flex-col gap-3">
          <Link to="/profile/$id" params={{ id: "me" }} className="btn-primary text-center">
            View my uploads
          </Link>

          <button
            type="button"
            onClick={() => {
              setDone(false);
              setFile(null);
              setPendingFile(null);
              hardReset();
              setTitle("");
              setCourseId("");
              setType("note");
              setIntake("");
              setSection("");
              setDescription("");
              setError("");
              setProgress(0);
            }}
            className="btn-ghost"
          >
            Upload another {mediaLabel}
          </button>
        </div>
      </div>
    );
  }

  // Copy shown on the court.
  const headline = !pendingFile
    ? `Drop your ${mediaLabel} here`
    : phase === "aiming"
      ? "Let go to shoot"
      : phase === "flying"
        ? "In the air…"
        : phase === "scored" && result
          ? RESULT_COPY[result].title
          : "Pull back, aim, release";

  const subline = !pendingFile
    ? "or browse your files, then shoot it through the hoop to attach it."
    : phase === "aiming" && aim
      ? `${Math.round(aim.power * 100)}% power at ${Math.round(aim.angle)}°`
      : phase === "scored" && result
        ? `${RESULT_COPY[result].detail} Attaching your file…`
        : status || "Land it in the hoop to attach your file.";

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      <style>{`
        .basketball-upload {
          position: relative;
          overflow: hidden;
          height: 460px;
          border: 1px solid hsl(var(--border));
          border-radius: 1rem;
          background: hsl(var(--secondary));
          isolation: isolate;
        }
        @keyframes basketball-pop {
          0% { transform: translate(-50%, 0) scale(.6); opacity: 0 }
          25% { transform: translate(-50%, -6px) scale(1.12); opacity: 1 }
          100% { transform: translate(-50%, -22px) scale(1); opacity: 0 }
        }
        .basketball-pop { animation: basketball-pop 1.2s ease-out both }
        @media (prefers-reduced-motion: reduce) {
          .basketball-pop { animation: none; transform: translate(-50%, 0); opacity: 1 }
        }
      `}</style>
      <header className="max-w-xl">
        <h1 className="text-4xl font-semibold tracking-tight">Upload</h1>

        <p className="mt-3 leading-relaxed text-muted-foreground">
          Share your notes or video lessons with your university community. A teacher reviews every
          upload before it goes live.
        </p>
      </header>

      {!file && (
        <div
          className="mt-6 grid max-w-3xl gap-3 sm:grid-cols-2"
          role="radiogroup"
          aria-label="Select file type"
        >
          {(
            [
              {
                value: "pdf" as MediaKind,
                label: "PDF file",
                hint: "Notes and documents — up to 20 MB",
                Icon: FileText,
              },
              {
                value: "video" as MediaKind,
                label: "Video file",
                hint: "Recorded lessons — up to 500 MB",
                Icon: Clapperboard,
              },
            ] as const
          ).map(({ value, label, hint, Icon }) => {
            const active = mediaKind === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={loading || phase !== "idle"}
                onClick={() => switchMedia(value)}
                className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                  active ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/60"
                }`}
              >
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${active ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {label}
                    {active && <CheckCircle2 className="h-4 w-4 text-primary" />}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      <form
        className={`mt-10 grid items-start gap-8 ${file ? "lg:grid-cols-[minmax(0,1fr)_300px]" : "mx-auto max-w-3xl"}`}
        onSubmit={handleSubmit}
        noValidate
      >
        {/* Main form */}
        <div className="paper-card divide-y divide-border">
          {file && (
            <section className="p-6 sm:p-8">
              <h2 className="text-lg font-semibold">What are you sharing?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick a section, then add your file.
              </p>

              <div
                className="mt-5 grid gap-3 sm:grid-cols-2"
                role="radiogroup"
                aria-label="Upload kind"
              >
                {(
                  [
                    {
                      value: "pdf" as MediaKind,
                      label: "PDF upload",
                      hint: "Notes, suggestions, slides — up to 20 MB",
                      Icon: FileText,
                    },
                    {
                      value: "video" as MediaKind,
                      label: "Video upload",
                      hint: "Recorded lessons, walkthroughs — up to 500 MB",
                      Icon: Clapperboard,
                    },
                  ] as const
                ).map(({ value, label, hint, Icon }) => {
                  const active = mediaKind === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      disabled={loading}
                      onClick={() => switchMedia(value)}
                      className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                        active
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-secondary/60"
                      }`}
                    >
                      <span
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${
                          active
                            ? "bg-primary/10 text-primary"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 text-sm font-medium">
                          {label}
                          {active && <CheckCircle2 className="h-4 w-4 text-primary" />}
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                          {hint}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* File */}
          {!file ? (
            <section className="p-6 sm:p-8">
              <h2 className="text-lg font-semibold">Your file</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {isVideo ? "MP4, WebM or MOV, up to 500 MB." : "PDF only, up to 20 MB."}
              </p>

              <div
                ref={basketballRef}
                className={`basketball-upload mt-5 ${dragging ? "ring-2 ring-primary/50" : ""}`}
                onDragEnter={(e) => {
                  e.preventDefault();
                  if (!loading && e.dataTransfer.types.includes("Files")) setDragging(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!loading) setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
              >
                {/* Back layer: floor, sling, backboard, bands, aim guide */}
                <svg
                  className="absolute inset-0 h-full w-full"
                  viewBox={`0 0 ${court.width} ${court.height}`}
                  aria-hidden="true"
                >
                  {/* Floor */}
                  <rect
                    x={0}
                    y={court.floorY}
                    width={court.width}
                    height={court.height - court.floorY}
                    style={{ fill: "hsl(var(--border))" }}
                    opacity={0.6}
                  />
                  <line
                    x1={0}
                    y1={court.floorY}
                    x2={court.width}
                    y2={court.floorY}
                    style={{ stroke: "hsl(var(--border))" }}
                    strokeWidth={2}
                  />
                  <ellipse ref={shadowRef} fill="#000" opacity={0} />

                  {/* Sling stand */}
                  <g
                    stroke="currentColor"
                    strokeLinecap="round"
                    className="text-muted-foreground/70"
                  >
                    <line
                      x1={court.anchor.x}
                      y1={court.floorY}
                      x2={court.anchor.x}
                      y2={court.anchor.y + 52}
                      strokeWidth={6}
                    />
                    <line
                      x1={court.anchor.x}
                      y1={court.anchor.y + 52}
                      x2={court.anchor.x - 22}
                      y2={court.anchor.y + 14}
                      strokeWidth={5}
                    />
                    <line
                      x1={court.anchor.x}
                      y1={court.anchor.y + 52}
                      x2={court.anchor.x + 22}
                      y2={court.anchor.y + 14}
                      strokeWidth={5}
                    />
                  </g>

                  {/* Empty slot when there is no file yet */}
                  {!pendingFile && (
                    <rect
                      x={court.anchor.x - CARD_W / 2}
                      y={court.anchor.y - CARD_H / 2}
                      width={CARD_W}
                      height={CARD_H}
                      rx={10}
                      fill="none"
                      stroke="currentColor"
                      strokeDasharray="4 5"
                      strokeWidth={1.5}
                      className="text-muted-foreground/60"
                    />
                  )}

                  {/* Pull limit while aiming */}
                  {phase === "aiming" && (
                    <circle
                      cx={court.anchor.x}
                      cy={court.anchor.y}
                      r={court.maxPull}
                      fill="none"
                      stroke="currentColor"
                      strokeDasharray="3 6"
                      className="text-muted-foreground/40"
                    />
                  )}

                  {/* Backboard */}
                  <g ref={boardGroupRef}>
                    <rect
                      x={court.board.left}
                      y={court.board.top}
                      width={court.board.right - court.board.left}
                      height={court.board.bottom - court.board.top}
                      rx={3}
                      style={{ fill: "hsl(var(--card))" }}
                      stroke="#f97316"
                      strokeWidth={2.5}
                    />
                  </g>

                  {/* Elastic bands */}
                  {pendingFile && (
                    <g stroke="#d96b35" strokeWidth={4} strokeLinecap="round">
                      <line ref={bandLRef} />
                      <line ref={bandRRef} />
                    </g>
                  )}

                  {/* Predicted path */}
                  {phase === "aiming" &&
                    aim?.dots.map((dot, i) => (
                      <circle
                        key={i}
                        cx={dot.x}
                        cy={dot.y}
                        r={Math.max(1.8, 3.4 - i * 0.1)}
                        fill="#f97316"
                        opacity={Math.max(0.25, 0.95 - i * 0.045)}
                      />
                    ))}
                </svg>

                {/* The card you shoot */}
                {pendingFile && (
                  <div
                    ref={ballElRef}
                    className={`absolute left-0 top-0 z-10 grid touch-none select-none place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                      phase === "idle" ? "cursor-grab" : phase === "aiming" ? "cursor-grabbing" : ""
                    }`}
                    style={{ width: BALL_HIT, height: BALL_HIT, willChange: "transform" }}
                    onPointerDown={onBallPointerDown}
                    onPointerMove={onBallPointerMove}
                    onPointerUp={onBallPointerUp}
                    onPointerCancel={onBallPointerUp}
                    onKeyDown={onBallKeyDown}
                    role="button"
                    tabIndex={0}
                    aria-label={`Your ${mediaLabel}, ready to shoot`}
                    aria-describedby="shot-help"
                  >
                    <span
                      className="grid place-items-center rounded-xl border border-border bg-card text-primary shadow-lg"
                      style={{ width: CARD_W, height: CARD_H }}
                    >
                      {isVideo ? (
                        <Clapperboard className="h-6 w-6" />
                      ) : (
                        <FileText className="h-6 w-6" />
                      )}
                    </span>
                  </div>
                )}

                {/* Front layer: rim and net sit in front of the ball */}
                <svg
                  className="pointer-events-none absolute inset-0 z-20 h-full w-full"
                  viewBox={`0 0 ${court.width} ${court.height}`}
                  aria-hidden="true"
                >
                  <path
                    ref={netCrossRef}
                    fill="none"
                    stroke="#f97316"
                    strokeWidth={1.4}
                    strokeLinecap="round"
                    opacity={0.7}
                  />
                  <path
                    ref={netStrandsRef}
                    fill="none"
                    stroke="#f97316"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.95}
                  />
                  <g ref={rimGroupRef}>
                    <line
                      x1={court.frontX}
                      y1={court.rimY}
                      x2={court.board.left}
                      y2={court.rimY}
                      stroke="#f97316"
                      strokeWidth={RIM_TUBE_R * 2}
                      strokeLinecap="round"
                    />
                    <circle cx={court.frontX} cy={court.rimY} r={RIM_TUBE_R + 1.5} fill="#f97316" />
                  </g>
                </svg>

                {/* Score callout */}
                {result && (
                  <div
                    className="basketball-pop pointer-events-none absolute z-30 whitespace-nowrap text-2xl font-bold text-orange-500"
                    style={{
                      left: (court.frontX + court.backX) / 2,
                      top: court.rimY - 70,
                    }}
                    aria-hidden="true"
                  >
                    {RESULT_COPY[result].title.toUpperCase()} +1
                  </div>
                )}

                {/* Aim readout above the sling */}
                {phase === "aiming" && aim && (
                  <div
                    className="pointer-events-none absolute z-30 -translate-x-1/2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium tabular-nums shadow-sm"
                    style={{
                      left: court.anchor.x,
                      top: Math.max(8, court.anchor.y - court.maxPull - 40),
                    }}
                    aria-hidden="true"
                  >
                    {Math.round(aim.power * 100)}% · {Math.round(aim.angle)}°
                  </div>
                )}

                {/* Text */}
                <div className="pointer-events-none absolute inset-x-0 top-0 z-30 px-5 pr-24 pt-5 text-left">
                  <p className="text-lg font-medium">{headline}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{subline}</p>
                </div>

                {/* Buttons live on the floor strip */}
                <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 flex h-11 items-center justify-between gap-3 px-3">
                  <div className="flex min-w-0 items-center gap-2">
                    {!pendingFile ? (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={loading}
                        className="btn-primary px-4 py-1.5 text-sm"
                      >
                        Browse files
                      </button>
                    ) : (
                      <>
                        <span className="max-w-[10rem] truncate rounded-full border border-border bg-card px-3 py-1 text-xs font-medium sm:max-w-[16rem]">
                          {pendingFile.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={loading || phase !== "idle"}
                          className="rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
                        >
                          Choose a different file
                        </button>
                      </>
                    )}
                  </div>

                  {phase === "flying" && (
                    <button
                      type="button"
                      onClick={beginReturn}
                      className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-card hover:text-foreground"
                    >
                      Reset ball
                    </button>
                  )}
                </div>

                <p id="shot-help" className="sr-only">
                  Drag the file back and let go to shoot it into the hoop. With a keyboard, press
                  the up and down arrows to change the angle, left and right to change the power,
                  Enter to shoot, and Escape to cancel.
                </p>
                <span className="sr-only" role="status" aria-live="polite">
                  {result ? `${RESULT_COPY[result].title} ${RESULT_COPY[result].detail}` : status}
                </span>
              </div>

              {loading && (
                <div className="mt-4" aria-live="polite">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-xs font-medium text-foreground">
                      {progress < 100 ? "Uploading file" : "Upload complete"}
                    </p>
                    <span className="min-w-12 rounded-full bg-primary/10 px-2.5 py-1 text-center text-xs font-semibold tabular-nums text-primary">
                      {progress}%
                    </span>
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full border border-border/60 bg-secondary"
                    role="progressbar"
                    aria-label="File upload progress"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress}
                  >
                    <div
                      className="relative h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    >
                      {progress > 0 && progress < 100 && (
                        <span className="absolute inset-y-0 right-0 w-8 animate-pulse bg-white/25" />
                      )}
                    </div>
                  </div>
                  {progress === 100 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Checking your file…
                    </p>
                  )}
                </div>
              )}

              <input
                ref={fileInputRef}
                id="media-file"
                type="file"
                accept={
                  isVideo
                    ? "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                    : ".pdf,application/pdf"
                }
                className="sr-only"
                onChange={handleFileChange}
                disabled={loading}
              />
            </section>
          ) : (
            <section className="p-6 sm:p-8">
              <h2 className="text-lg font-semibold">Attached file</h2>
              <div className="mt-4 flex items-center gap-4 rounded-xl border border-border bg-secondary/40 p-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  {isVideo ? (
                    <Clapperboard className="h-6 w-6" />
                  ) : (
                    <FileText className="h-6 w-6" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatSize(file.size)} · {isVideo ? "Video" : "PDF"}
                  </p>
                </div>
                {!loading && (
                  <button
                    type="button"
                    onClick={removeFile}
                    className="rounded-md p-2 text-muted-foreground hover:bg-secondary"
                    aria-label="Remove selected file"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
              {loading && (
                <div className="mt-4" aria-live="polite">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-xs font-medium text-foreground">
                      {progress < 100 ? "Uploading file" : "Upload complete"}
                    </p>
                    <span className="min-w-12 rounded-full bg-primary/10 px-2.5 py-1 text-center text-xs font-semibold tabular-nums text-primary">
                      {progress}%
                    </span>
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full border border-border/60 bg-secondary"
                    role="progressbar"
                    aria-label="File upload progress"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress}
                  >
                    <div
                      className="relative h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    >
                      {progress > 0 && progress < 100 && (
                        <span className="absolute inset-y-0 right-0 w-8 animate-pulse bg-white/25" />
                      )}
                    </div>
                  </div>
                  {progress === 100 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Checking your file…
                    </p>
                  )}
                </div>
              )}
            </section>
          )}

          {file && (
            <>
              {/* Details */}
              <section className="grid gap-5 p-6 sm:p-8">
                <div>
                  <h2 className="text-lg font-semibold">Details</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    A clear title helps other students find your upload.
                  </p>
                </div>

                <div>
                  <div className="flex items-baseline justify-between">
                    <label htmlFor="title" className="label-sm">
                      Title
                    </label>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {title.length}/200
                    </span>
                  </div>

                  <input
                    id="title"
                    name="title"
                    className="field w-full"
                    placeholder={
                      isVideo
                        ? "e.g. Data Structures - Chapter 1 Walkthrough"
                        : "e.g. Data Structures - Chapter 1 Notes"
                    }
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={200}
                    required
                    disabled={loading}
                  />
                </div>

                <fieldset disabled={loading}>
                  <legend className="label-sm">Type</legend>

                  <div className="mt-1.5 grid gap-3 sm:grid-cols-2">
                    {TYPES.map((t) => (
                      <label key={t.value} className="relative block cursor-pointer">
                        <input
                          type="radio"
                          name="type"
                          value={t.value}
                          checked={type === t.value}
                          onChange={() => setType(t.value)}
                          className="peer sr-only"
                        />

                        <span className="block rounded-xl border border-border p-4 transition-colors hover:bg-secondary/60 peer-checked:border-primary peer-checked:bg-primary/5 peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40">
                          <span className="flex items-center justify-between">
                            <span className="text-sm font-medium">{t.label}</span>
                            {type === t.value ? (
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                            ) : (
                              <Circle className="h-4 w-4 text-border" />
                            )}
                          </span>
                          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                            {t.hint}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div>
                  <div className="flex items-baseline justify-between">
                    <label htmlFor="description" className="label-sm">
                      Description{" "}
                      <span className="font-normal text-muted-foreground">(optional)</span>
                    </label>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {description.length}/2000
                    </span>
                  </div>

                  <textarea
                    id="description"
                    name="description"
                    className="field w-full"
                    rows={4}
                    placeholder={
                      isVideo
                        ? "What does this video cover? Mention chapters, topics, or the exam it's for."
                        : "What does this PDF cover? Mention chapters, topics, or the exam it's for."
                    }
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={2000}
                    disabled={loading}
                  />
                </div>
              </section>

              {/* Class */}
              <section className="grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
                <div className="sm:col-span-2">
                  <h2 className="text-lg font-semibold">Your class</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Used to show your upload to the right students and teachers.
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="course" className="label-sm">
                    Course
                  </label>

                  <select
                    id="course"
                    name="course_id"
                    className="field w-full"
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    required
                    disabled={coursesLoading || coursesError !== "" || loading}
                  >
                    <option value="">
                      {coursesLoading ? "Loading courses..." : "Select a course"}
                    </option>

                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.code} — {course.title}
                      </option>
                    ))}
                  </select>

                  {coursesError && (
                    <p className="mt-2 text-xs text-red-500" role="alert">
                      {coursesError}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="intake" className="label-sm">
                    Intake
                  </label>

                  <input
                    id="intake"
                    name="intake"
                    type="text"
                    inputMode="numeric"
                    className="field w-full"
                    placeholder="e.g. 49"
                    value={intake}
                    onChange={(e) => setIntake(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <label htmlFor="section" className="label-sm">
                    Section
                  </label>

                  <input
                    id="section"
                    name="section"
                    type="text"
                    className="field w-full"
                    placeholder="e.g. 3"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </section>

              {/* Actions */}
              <section className="grid gap-4 p-6 sm:p-8">
                {error && (
                  <div
                    className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-500"
                    role="alert"
                  >
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || coursesLoading || courses.length === 0 || !ready}
                  className="btn-primary inline-flex w-full items-center justify-center gap-2 py-3 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <LoaderCircle size={18} className="animate-spin motion-reduce:animate-none" />
                      {progress < 100 ? `Uploading… ${progress}%` : "Checking file…"}
                    </>
                  ) : (
                    <>
                      <UploadCloud size={18} />
                      Submit for review
                    </>
                  )}
                </button>

                <p className="text-center text-xs text-muted-foreground" aria-live="polite">
                  {ready || loading
                    ? `Your ${mediaLabel} stays private until a course teacher approves it.`
                    : `Still needed: ${missing.map((m) => m.label.toLowerCase()).join(", ")}.`}
                </p>
              </section>
            </>
          )}
        </div>

        {/* Side panel */}
        {file && (
          <aside className="grid gap-6 lg:sticky lg:top-24">
            <div className="paper-card p-5">
              <h3 className="text-base font-semibold">Ready to submit</h3>

              <ul className="mt-4 space-y-3 text-sm">
                {requirements.map((r) => (
                  <li key={r.label} className="flex items-center gap-2.5">
                    {r.met ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-border" />
                    )}

                    <span className={r.met ? "text-foreground" : "text-muted-foreground"}>
                      {r.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="paper-card p-5">
              <h3 className="text-base font-semibold">What happens next</h3>

              <ol className="mt-4">
                {reviewSteps.map((step, i) => {
                  const Icon = step.icon;
                  const last = i === reviewSteps.length - 1;

                  return (
                    <li key={step.title} className="relative flex gap-3 pb-5 last:pb-0">
                      {!last && (
                        <span
                          className="absolute left-4 top-9 -ml-px h-[calc(100%-2rem)] w-px bg-border"
                          aria-hidden="true"
                        />
                      )}

                      <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </span>

                      <div className="min-w-0">
                        <p className="text-sm font-medium">{step.title}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                          {step.text}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </aside>
        )}
      </form>
    </div>
  );
}

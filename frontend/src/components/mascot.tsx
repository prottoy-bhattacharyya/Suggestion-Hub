import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

/* ==========================================================================
   Mascot
   --------------------------------------------------------------------------
   Put this file at src/components/mascot.tsx.

   States:
     idle   eyes follow the pointer, blinks now and then
     watch  eyes follow whatever you are typing (set lookAtRef)
     cover  both hands over the eyes (password hidden)
     peek   one hand slips aside and an eye peeks out (password shown)
     error  worried face and a head shake
     happy  cheering
     busy   eyes dart side to side

   Optional extras:
     outfit  "cap" (mortarboard with a swinging tassel) or "glasses" + bow tie
     bulb    colours the antenna light: "weak" | "ok" | "strong"
   ========================================================================== */

export type MascotState =
  | "idle"
  | "watch"
  | "cover"
  | "peek"
  | "error"
  | "happy"
  | "busy";

export type MascotOutfit = "none" | "cap" | "glasses";
export type MascotBulb = "default" | "weak" | "ok" | "strong";
export type LookAt = { x: number; y: number } | null;
export type MascotHandle = { kick: () => void; bump: () => void; hop: () => void };

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

const EGG =
  "M100 24 C146 24 170 66 170 114 C170 160 142 190 100 190 C58 190 30 160 30 114 C30 66 54 24 100 24 Z";

const ink = { stroke: "hsl(var(--primary-foreground))" };

// Defined outside Mascot so React keeps the same hands between renders;
// otherwise they would remount and snap instead of sliding.
function Glove({ side }: { side: "l" | "r" }) {
  return (
    <g className={`hand hand-${side}`}>
      <g className="hand-peek">
        <ellipse cx="0" cy="2" rx="15" ry="17" fill="url(#mascot-glove)" stroke="#cbd5e1" strokeWidth="1.5" />
        {[-8, 0, 8].map((dx) => (
          <ellipse
            key={dx}
            cx={dx}
            cy={-12 + Math.abs(dx) * 0.18}
            rx="5"
            ry="8"
            fill="url(#mascot-glove)"
            stroke="#cbd5e1"
            strokeWidth="1.2"
          />
        ))}
        <ellipse
          cx={side === "l" ? 13 : -13}
          cy="4"
          rx="5"
          ry="7"
          fill="url(#mascot-glove)"
          stroke="#cbd5e1"
          strokeWidth="1.2"
        />
      </g>
    </g>
  );
}

export const Mascot = forwardRef<
  MascotHandle,
  {
    state: MascotState;
    lookAtRef: { current: LookAt };
    outfit?: MascotOutfit;
    bulb?: MascotBulb;
  }
>(function Mascot({ state, lookAtRef, outfit = "none", bulb = "default" }, ref) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const bumpRef = useRef<SVGGElement>(null);
  const tiltRef = useRef<SVGGElement>(null);
  const pupilLRef = useRef<SVGGElement>(null);
  const pupilRRef = useRef<SVGGElement>(null);
  const shineRef = useRef<SVGGElement>(null);
  const shadowRef = useRef<SVGEllipseElement>(null);
  const gradRef = useRef<SVGRadialGradientElement>(null);

  const stateRef = useRef(state);
  stateRef.current = state;

  const gaze = useRef({ x: 0, y: 0 });
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const reducedRef = useRef(false);

  // Eyes, highlight, head tilt and floor shadow all follow one smoothed gaze.
  const tick = (now: number) => {
    rafRef.current = null;

    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height * 0.48;
    const s = stateRef.current;
    const look = lookAtRef.current;

    let tx = 0;
    let ty = 0;

    if (reducedRef.current) {
      ty = s === "cover" ? 0.3 : 0;
    } else if (s === "cover") {
      ty = 0.3;
    } else if (s === "busy") {
      tx = Math.sin(now / 160) * 0.9;
      ty = 0.2;
    } else if (s === "happy") {
      ty = -0.3;
    } else if (look) {
      tx = clamp((look.x - cx) / 180, -1, 1);
      ty = clamp((look.y - cy) / 150, -1, 1);
    } else if (pointerRef.current) {
      tx = clamp((pointerRef.current.x - cx) / 260, -1, 1);
      ty = clamp((pointerRef.current.y - cy) / 220, -1, 1);
    }

    const g = gaze.current;
    const k = reducedRef.current ? 1 : 0.18;
    g.x += (tx - g.x) * k;
    g.y += (ty - g.y) * k;

    const pupil = `translate(${(g.x * 5.5).toFixed(2)} ${(g.y * 4.5).toFixed(2)})`;
    pupilLRef.current?.setAttribute("transform", pupil);
    pupilRRef.current?.setAttribute("transform", pupil);

    shineRef.current?.setAttribute(
      "transform",
      `translate(${(g.x * 9).toFixed(2)} ${(g.y * 7).toFixed(2)})`,
    );
    tiltRef.current?.setAttribute(
      "transform",
      `rotate(${(g.x * 3).toFixed(2)} 100 190)`,
    );
    shadowRef.current?.setAttribute(
      "transform",
      `translate(${(-g.x * 8).toFixed(2)} 0)`,
    );

    // The light on the body leans toward where the character is looking.
    const lx = (100 + g.x * 34).toFixed(1);
    const ly = (78 + g.y * 28).toFixed(1);
    const grad = gradRef.current;
    if (grad) {
      grad.setAttribute("cx", lx);
      grad.setAttribute("cy", ly);
      grad.setAttribute("fx", lx);
      grad.setAttribute("fy", ly);
    }

    const settling =
      Math.abs(tx - g.x) > 0.003 || Math.abs(ty - g.y) > 0.003 || s === "busy";
    if (settling) rafRef.current = requestAnimationFrame(tick);
  };

  const kick = () => {
    if (rafRef.current === null) rafRef.current = requestAnimationFrame(tick);
  };

  useImperativeHandle(ref, () => ({
    kick,
    // A little squash every time a key is pressed.
    bump: () => {
      if (reducedRef.current) return;
      bumpRef.current?.animate(
        [
          { transform: "scale(1, 1)" },
          { transform: "scale(1.035, 0.965)" },
          { transform: "scale(1, 1)" },
        ],
        { duration: 170, easing: "ease-out" },
      );
    },
    hop: () => {
      if (reducedRef.current) return;
      wrapRef.current?.animate(
        [
          { transform: "translateY(0) scale(1, 1)" },
          { transform: "translateY(-18px) scale(1.04, 0.96)" },
          { transform: "translateY(0) scale(1, 1)" },
        ],
        { duration: 420, easing: "cubic-bezier(.3, .7, .4, 1)" },
      );
    },
  }));

  useEffect(() => {
    reducedRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    kick();

    const onMove = (e: PointerEvent) => {
      pointerRef.current = { x: e.clientX, y: e.clientY };
      kick();
    };

    window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      window.removeEventListener("pointermove", onMove);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Blink every few seconds.
  useEffect(() => {
    if (reducedRef.current) return;

    let wait: number;
    let open: number;

    const schedule = () => {
      wait = window.setTimeout(() => {
        const el = svgRef.current;
        if (el) {
          el.classList.add("is-blink");
          open = window.setTimeout(() => el.classList.remove("is-blink"), 150);
        }
        schedule();
      }, 2200 + Math.random() * 3800);
    };

    schedule();

    return () => {
      window.clearTimeout(wait);
      window.clearTimeout(open);
    };
  }, []);

  // Re-aim whenever the mood changes, and react with a shake or a hop.
  useEffect(() => {
    kick();

    const el = wrapRef.current;
    if (!el || reducedRef.current) return;

    if (state === "error") {
      el.animate(
        [
          { transform: "translateX(0)" },
          { transform: "translateX(-9px) rotate(-3deg)" },
          { transform: "translateX(8px) rotate(3deg)" },
          { transform: "translateX(-6px)" },
          { transform: "translateX(4px)" },
          { transform: "translateX(0)" },
        ],
        { duration: 460, easing: "ease-in-out" },
      );
    }

    if (state === "happy") {
      el.animate(
        [
          { transform: "translateY(0)" },
          { transform: "translateY(-16px)" },
          { transform: "translateY(0)" },
          { transform: "translateY(-8px)" },
          { transform: "translateY(0)" },
        ],
        { duration: 620, easing: "ease-out" },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const glow =
    state === "error"
      ? "bg-destructive/30"
      : state === "happy"
        ? "bg-success/35"
        : state === "cover" || state === "peek"
          ? "bg-primary/10"
          : "bg-primary/25";

  const mouth = (() => {
    switch (state) {
      case "cover":
        return (
          <path d="M92 128 Q100 133 108 128" fill="none" strokeWidth="3.5" strokeLinecap="round" style={ink} />
        );
      case "peek":
        return (
          <path d="M90 128 Q104 138 117 123" fill="none" strokeWidth="3.5" strokeLinecap="round" style={ink} />
        );
      case "error":
        return (
          <path d="M88 138 Q100 125 112 138" fill="none" strokeWidth="3.5" strokeLinecap="round" style={ink} />
        );
      case "busy":
        return <ellipse cx="100" cy="131" rx="4.5" ry="5" fill="#0f172a" />;
      case "happy":
        return (
          <g>
            <path d="M82 124 Q100 152 118 124 Z" fill="#0f172a" />
            <ellipse cx="100" cy="139" rx="9" ry="5" fill="#fb7185" />
          </g>
        );
      default:
        return (
          <path d="M86 127 Q100 139 114 127" fill="none" strokeWidth="3.5" strokeLinecap="round" style={ink} />
        );
    }
  })();

  return (
    <div ref={wrapRef} className="relative mx-auto h-36 w-36 sm:h-40 sm:w-40" aria-hidden="true">
      <div className={`absolute inset-4 rounded-full blur-2xl transition-colors duration-500 ${glow}`} />

      <svg
        ref={svgRef}
        viewBox="0 0 200 200"
        className="mascot relative h-full w-full overflow-visible"
        data-state={state}
        data-bulb={bulb}
      >
        <defs>
          <radialGradient
            id="mascot-shade"
            ref={gradRef}
            gradientUnits="userSpaceOnUse"
            cx="100"
            cy="78"
            fx="100"
            fy="78"
            r="130"
          >
            <stop offset="0" stopColor="#fff" stopOpacity=".4" />
            <stop offset=".5" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity=".3" />
          </radialGradient>
          <linearGradient id="mascot-rim" gradientUnits="userSpaceOnUse" x1="100" y1="24" x2="100" y2="190">
            <stop offset="0" stopColor="#fff" stopOpacity=".65" />
            <stop offset=".45" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#fff" stopOpacity=".12" />
          </linearGradient>
          <linearGradient id="mascot-glove" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#e2e8f0" />
          </linearGradient>
          <clipPath id="mascot-clip-l">
            <circle cx="76" cy="96" r="16" />
          </clipPath>
          <clipPath id="mascot-clip-r">
            <circle cx="124" cy="96" r="16" />
          </clipPath>
          <filter id="mascot-blur" x="-30%" y="-150%" width="160%" height="400%">
            <feGaussianBlur stdDeviation="3.5" />
          </filter>
          <filter id="mascot-bulb" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>

        {/* Floor shadow */}
        <ellipse
          ref={shadowRef}
          cx="100"
          cy="193"
          rx="52"
          ry="7"
          fill="#000"
          opacity=".3"
          filter="url(#mascot-blur)"
        />

        <g className="mascot-breathe">
          <g ref={bumpRef} className="mascot-bump">
            <g ref={tiltRef}>
              {/* Body */}
              <path d={EGG} style={{ fill: "hsl(var(--primary))" }} />

              {/* Cheeks */}
              <circle className="cheek" cx="54" cy="118" r="8" fill="#ff8fa3" />
              <circle className="cheek" cx="146" cy="118" r="8" fill="#ff8fa3" />

              {/* Eyes */}
              {(["l", "r"] as const).map((side) => {
                const cx = side === "l" ? 76 : 124;

                return (
                  <g key={side}>
                    <g className="eye">
                      <circle cx={cx} cy="96" r="16" fill="#fff" />
                      <g clipPath={`url(#mascot-clip-${side})`}>
                        <g ref={side === "l" ? pupilLRef : pupilRRef}>
                          <circle cx={cx} cy="96" r="7" fill="#0f172a" />
                          <circle cx={cx + 2.4} cy="93" r="2.2" fill="#fff" />
                        </g>
                        <rect
                          className={`lid lid-${side}`}
                          x={cx - 18}
                          y="72"
                          width="36"
                          height="48"
                          style={{ fill: "hsl(var(--primary))" }}
                        />
                      </g>
                      <path
                        className={`lash lash-${side}`}
                        d={`M${cx - 12} 98 Q${cx} 106 ${cx + 12} 98`}
                        fill="none"
                        strokeWidth="3"
                        strokeLinecap="round"
                        style={ink}
                      />
                    </g>
                    <path
                      className="happy-eye"
                      d={`M${cx - 12} 100 Q${cx} 84 ${cx + 12} 100`}
                      fill="none"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      style={ink}
                    />
                  </g>
                );
              })}

              {/* Brows */}
              <path className="brow brow-l" d="M60 74 Q76 66 92 74" fill="none" strokeWidth="3.5" strokeLinecap="round" style={ink} />
              <path className="brow brow-r" d="M108 74 Q124 66 140 74" fill="none" strokeWidth="3.5" strokeLinecap="round" style={ink} />

              {mouth}

              {/* Outfits (keyed so they pop in when they change) */}
              {outfit === "glasses" && (
                <g key="glasses">
                  <g className="outfit">
                    <circle cx="76" cy="96" r="21" fill="#fff" fillOpacity=".1" stroke="#0f172a" strokeWidth="3.5" />
                    <circle cx="124" cy="96" r="21" fill="#fff" fillOpacity=".1" stroke="#0f172a" strokeWidth="3.5" />
                    <path d="M97 94 Q100 90 103 94" fill="none" stroke="#0f172a" strokeWidth="3.5" strokeLinecap="round" />
                    <path d="M55 92 L41 88 M145 92 L159 88" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
                    <path d="M63 85 Q71 78 82 80" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M111 85 Q119 78 130 80" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="2.5" strokeLinecap="round" />
                  </g>
                  <g className="outfit">
                    <path d="M100 172 L82 161 L82 183 Z M100 172 L118 161 L118 183 Z" fill="#f43f5e" />
                    <circle cx="100" cy="172" r="4.5" fill="#e11d48" />
                  </g>
                </g>
              )}

              {outfit === "cap" && (
                <g key="cap" className="outfit">
                  <path d="M74 36 L74 52 Q100 62 126 52 L126 36 Z" fill="#0f172a" />
                  <path d="M60 32 L100 20 L140 32 L100 44 Z" fill="#1e293b" stroke="#0f172a" strokeWidth="2" strokeLinejoin="round" />
                  <path d="M70 32 L100 23 L112 27" fill="none" stroke="#fff" strokeOpacity=".25" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="100" cy="32" r="3" fill="#fbbf24" />
                  <g className="tassel">
                    <path d="M100 32 L136 34 L138 56" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
                    <ellipse cx="138" cy="60" rx="3.5" ry="6" fill="#fbbf24" />
                  </g>
                </g>
              )}

              {/* Antenna with a light that changes with mood */}
              <path d="M100 28 Q97 12 106 8" fill="none" strokeWidth="3" strokeLinecap="round" style={{ stroke: "hsl(var(--primary))" }} />
              <circle className="bulb-glow" cx="106" cy="8" r="9" filter="url(#mascot-bulb)" />
              <circle className="bulb" cx="106" cy="8" r="5.5" />

              {/* Light and shade over the whole body */}
              <path d={EGG} fill="url(#mascot-shade)" pointerEvents="none" />
              <g ref={shineRef} pointerEvents="none">
                <ellipse cx="72" cy="52" rx="22" ry="11" transform="rotate(-28 72 52)" fill="#fff" opacity=".3" />
              </g>
              <path d={EGG} fill="none" stroke="url(#mascot-rim)" strokeWidth="2" pointerEvents="none" />
            </g>
          </g>
        </g>

        {/* Hands sit in front of everything */}
        <Glove side="l" />
        <Glove side="r" />
      </svg>
    </div>
  );
});

/* A burst of confetti at a point on screen. `host` must be position: relative. */
export function confettiBurst(
  host: HTMLElement | null,
  clientX: number,
  clientY: number,
  count = 18,
) {
  if (!host || typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const rect = host.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const colors = ["hsl(var(--primary))", "#fbbf24", "#34d399", "#f472b6", "#60a5fa"];

  for (let i = 0; i < count; i++) {
    const el = document.createElement("span");
    const size = 6 + Math.random() * 6;

    el.style.cssText = [
      "position:absolute",
      `left:${x}px`,
      `top:${y}px`,
      `width:${size}px`,
      `height:${size * (Math.random() > 0.5 ? 1 : 0.5)}px`,
      `border-radius:${Math.random() > 0.5 ? "9999px" : "2px"}`,
      `background:${colors[i % colors.length]}`,
      "pointer-events:none",
      "z-index:50",
    ].join(";");

    host.appendChild(el);

    const angle = Math.random() * Math.PI * 2;
    const dist = 60 + Math.random() * 90;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - 40;

    const anim = el.animate(
      [
        { transform: "translate(-50%, -50%) translate(0, 0) rotate(0deg)", opacity: 1 },
        {
          transform: `translate(-50%, -50%) translate(${dx}px, ${dy + 90}px) rotate(${Math.random() * 540}deg)`,
          opacity: 0,
        },
      ],
      { duration: 900 + Math.random() * 500, easing: "cubic-bezier(.2, .7, .3, 1)" },
    );

    anim.onfinish = () => el.remove();
  }
}

export const MASCOT_STYLES = `
  .mascot .lid, .mascot .brow, .mascot .hand, .mascot .cheek,
  .mascot .lash, .mascot .happy-eye, .mascot .eye {
    transition: transform .3s cubic-bezier(.3, .7, .2, 1), opacity .2s ease;
  }
  .mascot .brow { transform-box: fill-box; transform-origin: center; transform: translateY(0) rotate(0deg); }
  .mascot .lid { transform: translateY(-40px); }
  .mascot .lash, .mascot .happy-eye { opacity: 0; }
  .mascot .cheek { opacity: .32; }

  .mascot .hand { filter: drop-shadow(0 3px 3px rgb(0 0 0 / .25)); }
  .mascot .hand-l { transform: translate(32px, 150px) rotate(10deg) scale(1); }
  .mascot .hand-r { transform: translate(168px, 150px) rotate(-10deg) scale(1); }

  .mascot-breathe { transform-box: fill-box; transform-origin: 50% 100%; animation: mascot-breathe 3.2s ease-in-out infinite; }
  .mascot-bump { transform-box: fill-box; transform-origin: 50% 100%; }
  @keyframes mascot-breathe { 50% { transform: scale(1.012, .988); } }

  /* Antenna light colour comes from --bulb */
  .mascot { --bulb: #fde68a; }
  .mascot[data-state="cover"] { --bulb: #a1a1aa; }
  .mascot[data-bulb="weak"] { --bulb: #f87171; }
  .mascot[data-bulb="ok"] { --bulb: #fbbf24; }
  .mascot[data-bulb="strong"] { --bulb: #4ade80; }
  .mascot[data-state="error"] { --bulb: #f87171; }
  .mascot[data-state="happy"] { --bulb: #4ade80; }
  .mascot .bulb, .mascot .bulb-glow { fill: var(--bulb); transition: fill .3s; }
  .mascot .bulb-glow {
    opacity: .55;
    transform-box: fill-box;
    transform-origin: center;
    animation: mascot-glow 2.6s ease-in-out infinite;
  }
  @keyframes mascot-glow { 50% { opacity: .95; transform: scale(1.25); } }

  /* Outfits */
  .mascot .outfit {
    transform-box: fill-box;
    transform-origin: 50% 60%;
    animation: mascot-outfit .5s cubic-bezier(.2, 1.5, .4, 1) both;
  }
  @keyframes mascot-outfit {
    from { transform: translateY(-18px) scale(.6); opacity: 0; }
    to { transform: none; opacity: 1; }
  }
  .mascot .tassel { transform-origin: 136px 34px; animation: mascot-tassel 2.4s ease-in-out infinite; }
  @keyframes mascot-tassel { 0%, 100% { transform: rotate(7deg); } 50% { transform: rotate(-9deg); } }

  /* Blinking */
  .mascot.is-blink .lid { transform: translateY(0); }
  .mascot.is-blink .lash { opacity: 1; }

  /* Watching what you type */
  .mascot[data-state="watch"] .brow { transform: translateY(-2px) rotate(0deg); }

  /* Password hidden: eyes shut, both hands over them */
  .mascot[data-state="cover"] .lid,
  .mascot[data-state="peek"] .lid-l { transform: translateY(0); }
  .mascot[data-state="cover"] .lash,
  .mascot[data-state="peek"] .lash-l { opacity: 1; }
  .mascot[data-state="cover"] .hand-l,
  .mascot[data-state="peek"] .hand-l { transform: translate(76px, 98px) rotate(0deg) scale(1.25); }
  .mascot[data-state="cover"] .hand-r,
  .mascot[data-state="peek"] .hand-r { transform: translate(124px, 98px) rotate(0deg) scale(1.25); }
  .mascot[data-state="cover"] .brow { transform: translateY(-5px) rotate(0deg); }

  /* Password shown: the right hand slips aside and that eye peeks out */
  .mascot[data-state="peek"] .lid-r { transform: translateY(-30px); }
  .mascot[data-state="peek"] .brow-r { transform: translateY(-6px) rotate(-8deg); }
  .mascot[data-state="peek"] .brow-l { transform: translateY(-3px) rotate(0deg); }
  .mascot[data-state="peek"] .cheek { opacity: .6; }
  .mascot[data-state="peek"] .hand-r .hand-peek { animation: mascot-peek 3.4s ease-in-out .4s infinite; }
  @keyframes mascot-peek {
    0%, 14% { transform: translate(0, 0) rotate(0deg); }
    32%, 72% { transform: translate(24px, -16px) rotate(28deg); }
    90%, 100% { transform: translate(0, 0) rotate(0deg); }
  }

  /* Failed */
  .mascot[data-state="error"] .brow-l { transform: translateY(1px) rotate(-14deg); }
  .mascot[data-state="error"] .brow-r { transform: translateY(1px) rotate(14deg); }

  /* Success */
  .mascot[data-state="happy"] .eye { opacity: 0; }
  .mascot[data-state="happy"] .happy-eye { opacity: 1; }
  .mascot[data-state="happy"] .brow { transform: translateY(-5px) rotate(0deg); }
  .mascot[data-state="happy"] .cheek { opacity: .6; }
  .mascot[data-state="happy"] .hand-l { transform: translate(20px, 84px) rotate(-24deg) scale(1); }
  .mascot[data-state="happy"] .hand-r { transform: translate(180px, 84px) rotate(24deg) scale(1); }

  @media (prefers-reduced-motion: reduce) {
    .mascot-breathe, .mascot .bulb-glow, .mascot .tassel, .mascot .outfit { animation: none; }
    .mascot .lid, .mascot .brow, .mascot .hand, .mascot .cheek,
    .mascot .lash, .mascot .happy-eye, .mascot .eye { transition-duration: .01s; }
    .mascot[data-state="peek"] .hand-r .hand-peek { animation: none; transform: translate(24px, -16px) rotate(28deg); }
  }
`;
"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const SCAN_LABELS = ["Querying ChatGPT…", "Querying Gemini…", "Querying Perplexity…"];

type Phase = "scanning" | "revealed";

function useFinePointer() {
  const [fine, setFine] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine) and (min-width: 1080px)");
    const sync = () => setFine(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return fine;
}

export default function LandingHero() {
  const [phase, setPhase] = useState<Phase>("scanning");
  const [stepIndex, setStepIndex] = useState(0);
  const [beforeVal, setBeforeVal] = useState(0);
  const [afterVal, setAfterVal] = useState(0);
  const [businessName, setBusinessName] = useState("");
  const [inputDraft, setInputDraft] = useState("");
  const [tilt, setTilt] = useState({ mx: 0, my: 0 });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const allowTilt = useFinePointer();

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const runCycle = useCallback(() => {
    clearTimers();
    setPhase("scanning");
    setStepIndex(0);
    setBeforeVal(0);
    setAfterVal(0);

    let step = 0;
    const advance = () => {
      step += 1;
      if (step < SCAN_LABELS.length) {
        setStepIndex(step);
        timeoutRef.current = setTimeout(advance, 650);
      } else {
        setPhase("revealed");
        let n = 0;
        intervalRef.current = setInterval(() => {
          n += 1;
          setBeforeVal(Math.min(24, Math.round((n / 14) * 24)));
          setAfterVal(Math.min(89, Math.round((n / 14) * 89)));
          if (n >= 14) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            timeoutRef.current = setTimeout(() => runCycle(), 6500);
          }
        }, 45);
      }
    };
    timeoutRef.current = setTimeout(advance, 650);
  }, [clearTimers]);

  useEffect(() => {
    runCycle();
    return clearTimers;
  }, [runCycle, clearTimers]);

  useEffect(() => {
    if (!allowTilt) setTilt({ mx: 0, my: 0 });
  }, [allowTilt]);

  const onHeroMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!allowTilt) return;
    const r = e.currentTarget.getBoundingClientRect();
    const mx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const my = ((e.clientY - r.top) / r.height) * 2 - 1;
    setTilt({ mx, my });
  };

  const onScanClick = () => {
    const name = inputDraft.trim();
    if (name) setBusinessName(name);
    runCycle();
  };

  const displayName = businessName || "Meridian Retail Co.";
  const cardTransform = allowTilt
    ? `rotateY(${tilt.mx * 8}deg) rotateX(${-tilt.my * 8}deg) translateZ(20px)`
    : undefined;
  const consoleTransform = allowTilt
    ? `rotateY(${tilt.mx * 4}deg) rotateX(${-tilt.my * 4}deg)`
    : undefined;
  const textTransform = allowTilt ? `rotateY(${tilt.mx * -2}deg)` : undefined;

  return (
    <section
      className="ma-landing-hero"
      onMouseMove={onHeroMove}
      onMouseLeave={() => setTilt({ mx: 0, my: 0 })}
    >
      <div className="ma-landing-hero-radial" aria-hidden />
      <div className="ma-landing-hero-grid" aria-hidden>
        <div className="ma-landing-hero-grid-plane" />
      </div>
      <span className="ma-landing-particle ma-landing-particle-1" aria-hidden />
      <span className="ma-landing-particle ma-landing-particle-2" aria-hidden />
      <span className="ma-landing-particle ma-landing-particle-3" aria-hidden />
      <span className="ma-landing-particle ma-landing-particle-4" aria-hidden />
      <span className="ma-landing-particle ma-landing-particle-5" aria-hidden />

      <div className="ma-landing-hero-inner">
        <div className="ma-landing-hero-copy" style={{ transform: textTransform }}>
          <p className="ma-landing-pill ma-fade-up">Answer Engine Optimization</p>
          <h1 className="ma-landing-headline ma-fade-up ma-fade-up-1">
            Is your business
            <br />
            <span>visible to AI?</span>
          </h1>
          <p className="ma-landing-lede ma-fade-up ma-fade-up-2">
            When buyers ask ChatGPT, Gemini, or Perplexity for the best in your category. Do they
            find you? MasterAEO checks, then fixes the gap.
          </p>
          <div className="ma-cta-row ma-fade-up ma-fade-up-3">
            <Link href="/signup" className="ma-btn ma-btn-primary">
              Check your score
            </Link>
            <Link href="/#how-it-works" className="ma-btn ma-btn-ghost">
              See how it works
            </Link>
          </div>
          <ul className="ma-landing-chips ma-fade-up ma-fade-up-4">
            <li>7 intent clusters</li>
            <li>3 AI models checked</li>
            <li>Fix-It ready-made content</li>
          </ul>
        </div>

        <div className="ma-landing-hero-stage">
          <div className="ma-landing-console" style={{ transform: consoleTransform }}>
            <span className="ma-landing-console-prompt" aria-hidden>
              &gt;
            </span>
            <input
              className="ma-landing-console-input"
              value={inputDraft}
              onChange={(e) => setInputDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onScanClick();
              }}
              placeholder="Type your business name…"
              aria-label="Business name"
            />
            <button type="button" className="ma-landing-console-btn" onClick={onScanClick}>
              Scan live
            </button>
          </div>

          <div className="ma-landing-card-wrap">
            <div className="ma-landing-card-glow" aria-hidden />
            <div className="ma-landing-orbit" aria-hidden>
              <div className="ma-landing-orbit-spin">
                <div className="ma-landing-orbit-ring ma-landing-orbit-ring-a">
                  <div className="ma-landing-orbit-dot-track">
                    <span className="ma-landing-orbit-dot ma-landing-orbit-dot-teal" />
                  </div>
                </div>
                <div className="ma-landing-orbit-ring ma-landing-orbit-ring-b">
                  <div className="ma-landing-orbit-dot-track ma-landing-orbit-dot-track-rev">
                    <span className="ma-landing-orbit-dot ma-landing-orbit-dot-steel" />
                  </div>
                </div>
              </div>
            </div>

            <div className="ma-landing-card" style={{ transform: cardTransform }}>
              <div className="ma-landing-card-top">
                <span className="ma-landing-card-label">AI Visibility Report</span>
                <span className="ma-landing-live">LIVE</span>
              </div>
              <div>
                <div className="ma-landing-card-name">{displayName}</div>
                <div className="ma-landing-card-meta">Retail &amp; E-Commerce</div>
              </div>
              <div className="ma-landing-card-rule" />

              {phase === "scanning" ? (
                <div className="ma-landing-scanning">
                  <div className="ma-landing-scan-orb">
                    <div className="ma-landing-orbit-ring ma-landing-orbit-ring-a">
                      <div className="ma-landing-orbit-dot-track">
                        <span className="ma-landing-orbit-dot ma-landing-orbit-dot-teal" />
                      </div>
                    </div>
                    <div className="ma-landing-orbit-ring ma-landing-orbit-ring-b">
                      <div className="ma-landing-orbit-dot-track ma-landing-orbit-dot-track-rev">
                        <span className="ma-landing-orbit-dot ma-landing-orbit-dot-steel" />
                      </div>
                    </div>
                    <div className="ma-landing-orbit-ring ma-landing-orbit-ring-c">
                      <div className="ma-landing-orbit-dot-track">
                        <span className="ma-landing-orbit-dot ma-landing-orbit-dot-muted" />
                      </div>
                    </div>
                    <div className="ma-landing-scan-core" />
                  </div>
                  <div className="ma-landing-scan-label">{SCAN_LABELS[stepIndex]}</div>
                </div>
              ) : (
                <div className="ma-landing-reveal ma-fade-up">
                  <div className="ma-landing-score-col">
                    <div className="ma-landing-score-label">Before</div>
                    <div className="ma-landing-score-before">{beforeVal}%</div>
                    <div className="ma-landing-score-sub">2 of 9 prompts</div>
                  </div>
                  <div className="ma-landing-score-arrow" aria-hidden>
                    →
                  </div>
                  <div className="ma-landing-score-col ma-landing-score-after-box">
                    <div className="ma-landing-score-label">After fixes</div>
                    <div className="ma-landing-score-after">{afterVal}%</div>
                    <div className="ma-landing-score-sub">8 of 9 prompts</div>
                  </div>
                </div>
              )}

              <div className="ma-landing-card-cta">12 ready-made content fixes generated →</div>
            </div>

            <div className="ma-landing-uplift ma-float-b">+65 pts uplift</div>
          </div>
        </div>
      </div>
    </section>
  );
}

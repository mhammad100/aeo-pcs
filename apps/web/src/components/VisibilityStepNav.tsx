"use client";

type Step = {
  title: string;
  description: string;
};

type Props = {
  steps: Step[];
  current: number;
  maxReachable: number;
  onStepClick?: (index: number) => void;
};

export default function VisibilityStepNav({
  steps,
  current,
  maxReachable,
  onStepClick,
}: Props) {
  return (
    <nav className="vis-step-nav" aria-label="Visibility check progress">
      <ol className="vis-step-list">
        {steps.map((step, index) => {
          const active = index === current;
          const reachable = index <= maxReachable;
          const done =
            !active &&
            reachable &&
            (index < maxReachable || (index === maxReachable && maxReachable > current));
          const state = active ? "active" : done ? "done" : "upcoming";

          return (
            <li key={step.title} className={`vis-step-item is-${state}`}>
              <button
                type="button"
                className="vis-step-button"
                disabled={!reachable || active}
                onClick={() => reachable && !active && onStepClick?.(index)}
                aria-current={active ? "step" : undefined}
              >
                <span className="vis-step-marker" aria-hidden>
                  {done ? "✓" : index + 1}
                </span>
                <span className="vis-step-text">
                  <span className="vis-step-title">{step.title}</span>
                  <span className="vis-step-desc">{step.description}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

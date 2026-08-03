"use client";

type PromptItem = {
  prompt: string;
  mentions: number;
  total: number;
};

type Props = {
  items: PromptItem[];
  variant?: "weak" | "strong";
};

export default function PromptScoreList({ items, variant = "weak" }: Props) {
  return (
    <ul className={`prompt-score-list${variant === "strong" ? " is-positive" : ""}`}>
      {items.map((p) => {
        const pct = p.total ? Math.round((p.mentions / p.total) * 100) : 0;
        return (
          <li key={p.prompt}>
            <p className="prompt-score-list__text">{p.prompt}</p>
            <div className="prompt-score-list__aside">
              <span
                className={`prompt-score-list__badge${p.mentions === 0 ? " is-zero" : ""}`}
                title={`${p.mentions} of ${p.total} models`}
              >
                {p.mentions}/{p.total}
              </span>
              <span className="prompt-score-list__hint">{pct}% mentioned</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

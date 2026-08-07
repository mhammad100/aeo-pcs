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
      {items.map((p, index) => {
        const pct = p.total ? Math.round((p.mentions / p.total) * 100) : 0;
        return (
          <li key={`${index}-${p.prompt}`}>
            <p className="prompt-score-list__text">{p.prompt}</p>
            <div className="prompt-score-list__aside">
              <span
                className={`prompt-score-list__badge${p.mentions === 0 ? " is-zero" : ""}`}
                title={
                  p.total
                    ? `${p.mentions} of ${p.total} models`
                    : "No model responses for this prompt"
                }
              >
                {p.total ? `${p.mentions}/${p.total}` : "-"}
              </span>
              <span className="prompt-score-list__hint">
                {p.total ? `${pct}% mentioned` : "no responses"}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

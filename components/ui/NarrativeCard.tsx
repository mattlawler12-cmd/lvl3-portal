"use client";

import { useState } from "react";

interface NarrativeCardProps {
  title: string;
  body: string;
  maxChars?: number;
  footer?: React.ReactNode;
}

export default function NarrativeCard({
  title,
  body,
  maxChars = 280,
  footer,
}: NarrativeCardProps) {
  const [expanded, setExpanded] = useState(false);
  const shouldTruncate = body.length > maxChars;
  const displayBody =
    shouldTruncate && !expanded
      ? body.slice(0, maxChars).trimEnd() + "…"
      : body;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <p className="text-sm font-semibold text-white mb-2">{title}</p>
      <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
        {displayBody}
      </p>
      {shouldTruncate && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 rounded"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
      {footer && <div className="mt-3">{footer}</div>}
    </div>
  );
}

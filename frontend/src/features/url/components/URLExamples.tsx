"use client";

import React from "react";
import rawGoldenInputs from "@threatory/contracts/golden-inputs.json";

export interface UrlExampleItem {
  id: string;
  label: string;
  url: string;
  description: string;
}

const findGoldenUrl = (id: string, fallback: string): string => {
  const item = (rawGoldenInputs as Array<{ id: string; input?: { url?: string } }>).find(
    (g) => g.id === id
  );
  return item?.input?.url ?? fallback;
};

export const URL_EXAMPLES: UrlExampleItem[] = [
  {
    id: "U1",
    label: "Example 1 — U1",
    url: findGoldenUrl("U1", "http://198.51.100.23/login"),
    description: "Demonstrates an IP-host URL using HTTP and suspicious keywords.",
  },
  {
    id: "U2",
    label: "Example 2 — U2",
    url: findGoldenUrl("U2", "https://example.com/"),
    description: "Demonstrates a normal URL with no suspicious signals.",
  },
  {
    id: "U3",
    label: "Example 3 — U3",
    url: findGoldenUrl("U3", "https://paypal.com@example.net/login"),
    description: "Demonstrates embedded user information in a URL.",
  },
];

export interface URLExamplesProps {
  onSelect: (url: string) => void;
  disabled?: boolean;
}

export function URLExamples({ onSelect, disabled = false }: URLExamplesProps) {
  return (
    <div className="space-y-1.5">
      <div className="text-[11px] font-bold tracking-wider text-slate-400">
        <span className="uppercase">SAMPLE INPUTS</span>
        <span className="font-normal normal-case"> · click to fill, not opened</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {URL_EXAMPLES.map((example) => (
          <button
            key={example.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(example.url)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs transition-colors hover:bg-slate-50 hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50"
            aria-label={`${example.label}: ${example.url}`}
            title={example.description}
          >
            <span className="font-bold text-slate-800">{example.id}</span>
            <span className="font-mono text-slate-600 text-[11px]">{example.url}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

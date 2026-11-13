import React from "react";
import rawGoldenInputs from "@threatory/contracts/golden-inputs.json";
import { Button } from "@/components/ui/button";

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
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Sample demonstration URLs (click to populate):
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {URL_EXAMPLES.map((example) => (
          <Button
            key={example.id}
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => onSelect(example.url)}
            className="flex h-auto flex-col items-start justify-start p-3 text-left transition-colors hover:border-primary/50 hover:bg-accent/40"
            aria-label={`Fill ${example.label}: ${example.url}`}
          >
            <span className="text-xs font-semibold text-foreground">{example.label}</span>
            <span className="my-1 line-clamp-1 w-full break-all font-mono text-xs text-primary">
              {example.url}
            </span>
            <span className="text-[11px] leading-tight text-muted-foreground">
              {example.description}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}

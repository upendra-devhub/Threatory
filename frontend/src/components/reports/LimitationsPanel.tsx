import { Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface LimitationsPanelProps {
  limitations: string[];
  className?: string;
}

export function LimitationsPanel({ limitations, className }: LimitationsPanelProps) {
  return (
    <Card className={cn("border-slate-300 bg-slate-50/70", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 shrink-0 text-slate-700" aria-hidden="true" />
          <CardTitle as="h2" className="text-base font-semibold text-foreground">
            What was not checked (Limitations)
          </CardTitle>
        </div>
        <CardDescription>
          These items describe checks that the analyzer did not perform or could not complete.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {limitations.length > 0 ? (
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-foreground">
            {limitations.map((item, index) => (
              <li key={`${index}-${item}`} className="break-words">
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No additional scan limitations were recorded for this report.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

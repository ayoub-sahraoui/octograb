import { observer } from "mobx-react-lite";
import { Download, Pause, Play, Square, Table2 } from "lucide-react";
import { Button } from "./ui/button";
import type { RuntimeStore } from "../stores/runtime-store";
import type { Blueprint } from "../lib/blueprint";
import { findBlock } from "../lib/blueprint";
export const RunControls = observer(function RunControls({
  runtime,
  blueprint,
  onResults,
}: {
  runtime: RuntimeStore;
  blueprint?: Blueprint;
  onResults: () => void;
}) {
  const active = runtime.active;
  return (
    <div className="border-t bg-card px-4 py-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        {!active ? (
          <Button
            size="sm"
            className="flex-1"
            disabled={
              runtime.busy || runtime.picking || !blueprint?.blocks.length
            }
            onClick={() => {
              if (blueprint) void runtime.start(blueprint);
              onResults();
            }}
          >
            <Play className="size-3.5" />
            {runtime.busy ? "Starting…" : "Run blueprint"}
          </Button>
        ) : (
          <>
            {active.status === "running" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void runtime.control("pause", active.id)}
              >
                <Pause className="size-3.5" />
                Pause
              </Button>
            )}
            {active.status === "paused" && (
              <Button
                size="sm"
                onClick={() => void runtime.control("resume", active.id)}
              >
                <Play className="size-3.5" />
                Resume
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => void runtime.control("stop", active.id)}
            >
              <Square className="size-3.5" />
              Stop
            </Button>
          </>
        )}
        {runtime.picking && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void runtime.cancelPick()}
          >
            Cancel selection
          </Button>
        )}
      </div>
      {!active && (
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          Runs in a new tab · up to 1,000 rows, 250 pages, 5 active minutes.
        </p>
      )}
      {!runtime.available && (
        <p className="text-[11px] text-muted-foreground">
          Picking and running require the installed Chrome extension.
        </p>
      )}
      {active && (
        <p className="text-[11px] text-muted-foreground" aria-live="polite">
          {active.blueprint.name} · {active.status} · {active.rows.length} rows
        </p>
      )}
      {runtime.error && (
        <p role="alert" className="text-xs leading-relaxed text-destructive">
          {runtime.error}
        </p>
      )}
    </div>
  );
});
export const RunResults = observer(function RunResults({
  runtime,
}: {
  runtime: RuntimeStore;
}) {
  const run = runtime.selected;
  const names = [
    ...new Set((run?.rows ?? []).flatMap((row) => Object.keys(row.values))),
  ];
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Table2 className="size-4 text-primary" />
        <h2 className="text-sm font-medium">Saved results</h2>
      </div>
      {runtime.runs.length > 0 && (
        <label className="block space-y-1 text-xs">
          Run history
          <select
            aria-label="Run history"
            className="h-9 w-full rounded-md border bg-background px-2"
            value={run?.id ?? ""}
            onChange={(e) => runtime.select(e.target.value)}
          >
            {runtime.runs.map((item) => (
              <option key={item.id} value={item.id}>
                {item.blueprint.name} ·{" "}
                {new Date(item.createdAt).toLocaleTimeString()} · {item.status}{" "}
                · {item.rows.length} rows
              </option>
            ))}
          </select>
        </label>
      )}
      {!run ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Run a blueprint to collect rows here. Results stay on this device when
          you close the sidebar.
        </p>
      ) : (
        <>
          <div className="rounded-lg border p-3 text-xs space-y-2">
            <p className="text-muted-foreground">{run.blueprint.name}</p>
            <p className="font-medium">
              {run.status} · {run.rows.length} rows
            </p>
            <p className="text-muted-foreground">
              {findBlock(run.blueprint.blocks, run.currentBlockId)?.block
                .label ?? "Preparing website"}
            </p>
            {run.note && <p>{run.note}</p>}
            {run.error && (
              <p role="alert" className="text-destructive leading-relaxed">
                {run.error}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Blueprint revision {run.blueprint.revision} · {run.navigations}{" "}
              pages opened
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!run.rows.length}
              onClick={() => runtime.export("csv")}
            >
              <Download className="size-3.5" />
              CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!run.rows.length}
              onClick={() => runtime.export("json")}
            >
              <Download className="size-3.5" />
              JSON
            </Button>
          </div>
          {run.rows.length > 0 && (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-left text-[11px]">
                <caption className="sr-only">Extracted rows</caption>
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2">Dataset</th>
                    {names.map((name) => (
                      <th className="p-2 whitespace-nowrap" key={name}>
                        {name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {run.rows.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="p-2">{row.dataset}</td>
                      {names.map((name) => (
                        <td
                          key={name}
                          className="p-2 max-w-52 truncate"
                          title={String(row.values[name] ?? "")}
                        >
                          {row.values[name] === null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            String(row.values[name] ?? "")
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
});

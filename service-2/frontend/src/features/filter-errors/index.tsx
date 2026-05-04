import { useEffect, useState } from "react";
import {
  Button,
  DatePicker,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@heroui/react";
import {
  CalendarDateTime,
  getLocalTimeZone,
  today,
} from "@internationalized/date";

// Placeholder makes calendar-only picks commit time = 00:00.
// Without it, granularity="minute" leaves HH:MM as empty placeholders and
// the value never commits when the user picks just a date in the popover.
const midnightPlaceholder = (() => {
  const t = today(getLocalTimeZone());
  return new CalendarDateTime(t.year, t.month, t.day, 0, 0, 0);
})();

export const RANGES = [
  { minutes: 5, label: "Last 5 minutes" },
  { minutes: 15, label: "Last 15 minutes" },
  { minutes: 30, label: "Last 30 minutes" },
  { minutes: 60, label: "Last 1 hour" },
  { minutes: 180, label: "Last 3 hours" },
  { minutes: 360, label: "Last 6 hours" },
  { minutes: 1440, label: "Last 24 hours" },
] as const;

export type RangeMinutes = (typeof RANGES)[number]["minutes"];

// Opaque DateValue from @internationalized/date (HeroUI's transitive dep).
// We never construct one — we only round-trip what HeroUI hands us via
// onChange and call .toDate(tz) at query time.
export interface DateValueLike {
  toDate(tz: string): Date;
}
export interface ManualRange {
  start: DateValueLike;
  end: DateValueLike;
}

export interface ErrorsFilter {
  region: string;
  endpoint: string;
  rangeMinutes: RangeMinutes;
  manual: ManualRange | null;
}

export const emptyFilter: ErrorsFilter = {
  region: "",
  endpoint: "",
  rangeMinutes: 60,
  manual: null,
};

interface Props {
  value: ErrorsFilter;
  onChange: (v: ErrorsFilter) => void;
}

export function FilterErrors({ value, onChange }: Props) {
  const set = <K extends keyof ErrorsFilter>(k: K, v: ErrorsFilter[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <Input
        size="sm"
        label="Region"
        value={value.region}
        onValueChange={(v) => set("region", v)}
      />
      <Input
        size="sm"
        label="Endpoint"
        value={value.endpoint}
        onValueChange={(v) => set("endpoint", v)}
      />
      <TimeRangeControl value={value} onChange={onChange} />
    </div>
  );
}

// ---------------------------------------------------------------------------

type Mode = "preset" | "manual";

interface Draft {
  mode: Mode;
  rangeMinutes: RangeMinutes;
  manualFrom: DateValueLike | null;
  manualTo: DateValueLike | null;
}

function draftFromValue(v: ErrorsFilter): Draft {
  return {
    mode: v.manual ? "manual" : "preset",
    rangeMinutes: v.rangeMinutes,
    manualFrom: v.manual?.start ?? null,
    manualTo: v.manual?.end ?? null,
  };
}

function describe(f: ErrorsFilter): string {
  if (f.manual) {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const fmt = (d: Date) =>
      d.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    return `${fmt(f.manual.start.toDate(tz))} → ${fmt(f.manual.end.toDate(tz))}`;
  }
  return (
    RANGES.find((r) => r.minutes === f.rangeMinutes)?.label ??
    `Last ${f.rangeMinutes} min`
  );
}

function TimeRangeControl({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => draftFromValue(value));

  // Re-sync the draft from the applied value every time the popover opens —
  // so Cancel always discards mid-edit changes cleanly.
  useEffect(() => {
    if (open) setDraft(draftFromValue(value));
  }, [open, value]);

  const isPresetActive = (m: RangeMinutes) =>
    draft.mode === "preset" && draft.rangeMinutes === m;

  const canApply =
    draft.mode === "preset" || (!!draft.manualFrom && !!draft.manualTo);

  const apply = () => {
    if (draft.mode === "manual" && draft.manualFrom && draft.manualTo) {
      onChange({
        ...value,
        rangeMinutes: draft.rangeMinutes,
        manual: { start: draft.manualFrom, end: draft.manualTo },
      });
    } else {
      onChange({
        ...value,
        rangeMinutes: draft.rangeMinutes,
        manual: null,
      });
    }
    setOpen(false);
  };

  const cancel = () => setOpen(false);

  return (
    <Popover isOpen={open} onOpenChange={setOpen} placement="bottom-end">
      <PopoverTrigger>
        <Button
          variant="bordered"
          size="sm"
          fullWidth
          className="h-12 px-3 justify-start font-normal"
        >
          <div className="flex flex-col items-start leading-tight">
            <span className="text-tiny text-default-600">Time range</span>
            <span className="text-small">{describe(value)}</span>
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent>
        <div className="p-4 w-[480px]">
          <div className="grid grid-cols-2 gap-4">
            {/* left: manual */}
            <div className="space-y-3">
              <DatePicker
                size="sm"
                label="From"
                granularity="minute"
                hideTimeZone
                placeholderValue={midnightPlaceholder}
                value={draft.manualFrom as any}
                onChange={(v) =>
                  setDraft((d) => ({
                    ...d,
                    mode: "manual",
                    manualFrom: (v as DateValueLike | null) ?? null,
                  }))
                }
              />
              <DatePicker
                size="sm"
                label="To"
                granularity="minute"
                hideTimeZone
                placeholderValue={midnightPlaceholder}
                value={draft.manualTo as any}
                onChange={(v) =>
                  setDraft((d) => ({
                    ...d,
                    mode: "manual",
                    manualTo: (v as DateValueLike | null) ?? null,
                  }))
                }
              />
            </div>

            {/* right: presets */}
            <div className="flex flex-col gap-1">
              {RANGES.map((r) => (
                <Button
                  key={r.minutes}
                  size="sm"
                  variant={isPresetActive(r.minutes) ? "solid" : "light"}
                  color={isPresetActive(r.minutes) ? "primary" : "default"}
                  className="justify-start"
                  onPress={() =>
                    setDraft((d) => ({
                      ...d,
                      mode: "preset",
                      rangeMinutes: r.minutes,
                    }))
                  }
                >
                  {r.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-default-200 flex justify-end gap-2">
            <Button size="sm" variant="light" onPress={cancel}>
              Cancel
            </Button>
            <Button
              size="sm"
              color="primary"
              isDisabled={!canApply}
              onPress={apply}
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

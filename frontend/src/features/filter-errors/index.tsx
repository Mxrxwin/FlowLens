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
import { useT } from "../../shared/i18n";
import type { TranslationKey } from "../../shared/i18n";

const midnightPlaceholder = (() => {
  const t = today(getLocalTimeZone());
  return new CalendarDateTime(t.year, t.month, t.day, 0, 0, 0);
})();

export const RANGES = [
  { minutes: 5,    key: 'range.5'    as TranslationKey },
  { minutes: 15,   key: 'range.15'   as TranslationKey },
  { minutes: 30,   key: 'range.30'   as TranslationKey },
  { minutes: 60,   key: 'range.60'   as TranslationKey },
  { minutes: 180,  key: 'range.180'  as TranslationKey },
  { minutes: 360,  key: 'range.360'  as TranslationKey },
  { minutes: 1440, key: 'range.1440' as TranslationKey },
] as const;

export type RangeMinutes = (typeof RANGES)[number]["minutes"];

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
  const t = useT();
  const set = <K extends keyof ErrorsFilter>(k: K, v: ErrorsFilter[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <Input
        size="sm"
        label={t('filter.region')}
        value={value.region}
        onValueChange={(v) => set("region", v)}
      />
      <Input
        size="sm"
        label={t('filter.endpoint')}
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

function TimeRangeControl({ value, onChange }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => draftFromValue(value));

  useEffect(() => {
    if (open) setDraft(draftFromValue(value));
  }, [open, value]);

  const describe = (f: ErrorsFilter): string => {
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
    const found = RANGES.find((r) => r.minutes === f.rangeMinutes);
    return found ? t(found.key) : `${f.rangeMinutes} min`;
  };

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
            <span className="text-tiny text-default-600">{t('filter.timeRange')}</span>
            <span className="text-small">{describe(value)}</span>
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent>
        <div className="p-4 w-[480px]">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <DatePicker
                size="sm"
                label={t('filter.from')}
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
                label={t('filter.to')}
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
                  {t(r.key)}
                </Button>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-default-200 flex justify-end gap-2">
            <Button size="sm" variant="light" onPress={cancel}>
              {t('filter.cancel')}
            </Button>
            <Button
              size="sm"
              color="primary"
              isDisabled={!canApply}
              onPress={apply}
            >
              {t('filter.apply')}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

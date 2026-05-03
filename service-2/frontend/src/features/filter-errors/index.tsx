import { Input } from "@heroui/react";

export interface ErrorsFilter {
  region: string;
  endpoint: string;
  from: string; // datetime-local: YYYY-MM-DDTHH:mm
  to: string;
}

export const emptyFilter: ErrorsFilter = {
  region: "",
  endpoint: "",
  from: "",
  to: "",
};

interface Props {
  value: ErrorsFilter;
  onChange: (v: ErrorsFilter) => void;
}

export function FilterErrors({ value, onChange }: Props) {
  const set = <K extends keyof ErrorsFilter>(k: K, v: string) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
      <Input
        size="md"
        type="datetime-local"
        label="From"
        value={value.from}
        onValueChange={(v) => set("from", v)}
      />
      <Input
        size="sm"
        type="datetime-local"
        label="To"
        value={value.to}
        onValueChange={(v) => set("to", v)}
      />
    </div>
  );
}

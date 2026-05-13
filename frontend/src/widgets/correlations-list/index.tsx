import { Card, CardBody } from "@heroui/react";
import { useT } from "../../shared/i18n";
import type { CorrelationRow } from "../../entities/correlation/types";

function frequencyPerMin(c: CorrelationRow): number {
  const minutes =
    (new Date(c.last_seen_at).getTime() - new Date(c.first_seen_at).getTime()) /
    60000;
  return c.count / Math.max(minutes, 1 / 60);
}

export function CorrelationsList({ items }: { items: CorrelationRow[] }) {
  const t = useT();

  if (items.length === 0) {
    return <div className="text-default-500">{t("correlations.empty")}</div>;
  }
  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {items.map((c, i) => (
        <Card key={i} className="w-full max-w-2xl">
          <CardBody className="space-y-2">
            <div className="text-sm">
              {t("correlations.usersFrom")} <b>{c.region}</b>{" "}
              {t("correlations.on")} <b>{c.device_type}</b>{" "}
              {t("correlations.hit")}{" "}
              <code className="text-xs">{c.endpoint}</code>
            </div>
            <div className="font-mono text-sm text-danger">
              {c.error_message}
            </div>
            <div className="flex justify-between text-xs text-default-500">
              <span>
                {c.count} {t("correlations.cases")} ·{" "}
                {frequencyPerMin(c).toFixed(2)}/min
              </span>
              <span>
                {new Date(c.first_seen_at).toLocaleString()} →{" "}
                {new Date(c.last_seen_at).toLocaleString()}
              </span>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

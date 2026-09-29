import type { DailyBreakdown } from "@/lib/data/types";

export interface ProfileStackedDay {
  date: string;
  total: number;
  byModel: Record<string, number>;
}

export interface ProfileChartData {
  modelKeys: string[];
  stackedDaily: ProfileStackedDay[];
}

function prettyModelName(raw: string): string {
  let model = raw.replace(/^\[[^\]]+\]\s*/, "");
  model = model.split("/").pop() ?? model;
  return model.replace(/-\d{8}$/, "");
}

/** Keep every available model split as its own chart series. */
export function buildProfileChartData(daily: DailyBreakdown[]): ProfileChartData {
  const modelTotals = new Map<string, number>();
  for (const day of daily) {
    for (const breakdown of day.modelBreakdowns ?? []) {
      if (
        typeof breakdown.modelName !== "string" ||
        breakdown.modelName.length === 0 ||
        !Number.isFinite(breakdown.cost) ||
        breakdown.cost < 0
      ) {
        continue;
      }
      const name = prettyModelName(breakdown.modelName);
      modelTotals.set(name, (modelTotals.get(name) ?? 0) + breakdown.cost);
    }
  }

  const modelKeys = Array.from(modelTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);

  const stackedDaily = daily.map((day) => {
    const actualByModel: Record<string, number> = {};
    for (const breakdown of day.modelBreakdowns ?? []) {
      if (
        typeof breakdown.modelName !== "string" ||
        breakdown.modelName.length === 0 ||
        !Number.isFinite(breakdown.cost) ||
        breakdown.cost < 0
      ) {
        continue;
      }
      const name = prettyModelName(breakdown.modelName);
      actualByModel[name] = (actualByModel[name] ?? 0) + breakdown.cost;
    }

    const attributed = Object.values(actualByModel).reduce((sum, cost) => sum + cost, 0);
    if (attributed > day.totalCost + 1e-9 && attributed > 0) {
      const scale = day.totalCost / attributed;
      for (const name of Object.keys(actualByModel)) actualByModel[name] *= scale;
    }

    const byModel = { ...actualByModel };
    const assigned = Object.values(byModel).reduce((sum, cost) => sum + cost, 0);
    const unassigned = day.totalCost - assigned;
    if (unassigned > 1e-9) byModel.Other = (byModel.Other ?? 0) + unassigned;

    return { date: day.date, total: day.totalCost, byModel };
  });

  return { modelKeys, stackedDaily };
}

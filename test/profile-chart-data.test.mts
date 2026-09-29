import assert from "node:assert/strict";
import { buildProfileChartData } from "../src/lib/profile-chart-data.ts";

const day = {
  date: "2026-09-28",
  inputTokens: 1,
  outputTokens: 1,
  cacheCreationTokens: 0,
  cacheReadTokens: 0,
  totalTokens: 2,
  totalCost: 133.02,
  modelsUsed: ["gpt-6-astra", "gpt-6-sol", "gpt-6-luna", "gpt-5.6-luna"],
  modelBreakdowns: [
    { modelName: "gpt-6-astra", inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, cost: 41.75 },
    { modelName: "gpt-6-sol", inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, cost: 88.78 },
    { modelName: "gpt-6-luna", inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, cost: 1.36 },
    { modelName: "gpt-5.6-luna", inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, cost: 1.13 },
  ],
};

const result = buildProfileChartData([
  day,
  {
    ...day,
    date: "2026-09-27",
    totalCost: 7,
    modelBreakdowns: undefined,
  },
  {
    ...day,
    date: "2026-09-26",
    totalCost: 10,
    modelBreakdowns: [
      { modelName: "model-a", inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, cost: 6 },
    ],
  },
  {
    ...day,
    date: "2026-09-25",
    totalCost: 5,
    modelBreakdowns: [
      { modelName: "older-b", inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, cost: 5 },
    ],
  },
  {
    ...day,
    date: "2026-09-24",
    totalCost: 3,
    modelBreakdowns: [
      { modelName: "older-c", inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, cost: 3 },
    ],
  },
  {
    ...day,
    date: "2026-09-23",
    totalCost: 2.5,
    modelsUsed: ["gpt-6.1-sol"],
    modelBreakdowns: [
      { modelName: "gpt-6.1-sol", inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, cost: 2.5 },
    ],
  },
]);

assert.equal(result.modelKeys.length, 8, "models beyond the old top-five limit remain named");
assert.ok(result.modelKeys.includes("gpt-6-sol"));
assert.ok(result.modelKeys.includes("gpt-6-luna"));
assert.ok(result.modelKeys.includes("gpt-5.6-luna"));
assert.ok(result.modelKeys.includes("gpt-6.1-sol"));
assert.ok(!result.modelKeys.slice(0, 5).includes("gpt-6-luna"), "low-cost models stay named below the top five");
assert.ok(!result.modelKeys.slice(0, 5).includes("gpt-6.1-sol"), "new models stay named below the top five");

const byDate = new Map(result.stackedDaily.map((point) => [point.date, point]));
const reportedDay = byDate.get("2026-09-28")!;
assert.equal(reportedDay.byModel["gpt-6-astra"], 41.75);
assert.equal(reportedDay.byModel["gpt-6-sol"], 88.78);
assert.equal(reportedDay.byModel["gpt-6-luna"], 1.36);
assert.equal(reportedDay.byModel["gpt-5.6-luna"], 1.13);
assert.equal(reportedDay.byModel.Other, undefined, "known models are not combined into Other");
assert.ok(
  Math.abs(Object.values(reportedDay.byModel).reduce((sum, cost) => sum + cost, 0) - reportedDay.total) < 1e-9,
  "model series add up to the recorded daily cost"
);

assert.equal(byDate.get("2026-09-27")?.byModel.Other, 7, "legacy cost without splits remains Other");
assert.equal(byDate.get("2026-09-26")?.byModel.Other, 4, "partially attributed cost goes to Other");

const capped = buildProfileChartData([
  {
    ...day,
    totalCost: 10,
    modelBreakdowns: [
      { modelName: "model-a", inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, cost: 8 },
      { modelName: "model-b", inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, cost: 7 },
    ],
  },
]).stackedDaily[0];
assert.ok(
  Math.abs(Object.values(capped.byModel).reduce((sum, cost) => sum + cost, 0) - capped.total) < 1e-9,
  "over-attributed model splits are scaled to the recorded daily cost"
);

console.log("✅ profile chart data checks passed");

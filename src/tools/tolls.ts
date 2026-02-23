import type { TollEstimate } from "../types.js";

interface TollCorridor {
  name: string;
  avgCost: number;
  range: string;
  keywords: string[];
}

const WA_TOLL_CORRIDORS: TollCorridor[] = [
  {
    name: "SR-520 Bridge",
    avgCost: 2.78,
    range: "$1.25–$4.30",
    keywords: ["520", "sr-520", "sr 520", "montlake", "medina", "bellevue", "redmond"],
  },
  {
    name: "I-405 Express Toll Lanes",
    avgCost: 3.0,
    range: "$0.75–$10.00",
    keywords: ["405", "i-405", "i 405", "kirkland", "renton", "lynnwood", "bothell"],
  },
  {
    name: "SR-167 HOT Lanes",
    avgCost: 2.5,
    range: "$0.50–$9.00",
    keywords: ["167", "sr-167", "sr 167", "auburn", "kent", "renton", "puyallup"],
  },
  {
    name: "Tacoma Narrows Bridge",
    avgCost: 6.5,
    range: "$6.50 (fixed)",
    keywords: ["tacoma narrows", "gig harbor", "tacoma", "narrows"],
  },
];

export function getTollEstimate(start: string, end: string): TollEstimate {
  const combined = `${start} ${end}`.toLowerCase();

  for (const corridor of WA_TOLL_CORRIDORS) {
    const matched = corridor.keywords.some((kw) => combined.includes(kw));
    if (matched) {
      console.error(`Toll corridor detected: ${corridor.name}`);
      return {
        corridor: corridor.name,
        estimatedCost: corridor.avgCost,
        range: corridor.range,
        detected: true,
      };
    }
  }

  // No specific corridor detected — check if route might cross 520 (Seattle→Eastside common path)
  const seattleKeywords = ["seattle", "capitol hill", "downtown", "belltown", "fremont", "queen anne", "wallingford", "university district", "u district"];
  const eastsideKeywords = ["redmond", "bellevue", "kirkland", "microsoft", "amazon", "google", "meta", "eastside", "mercer island"];

  const fromSeattle = seattleKeywords.some((kw) => combined.includes(kw));
  const toEastside = eastsideKeywords.some((kw) => combined.includes(kw));

  if (fromSeattle && toEastside) {
    const sr520 = WA_TOLL_CORRIDORS[0];
    console.error(`SR-520 corridor inferred for Seattle→Eastside route`);
    return {
      corridor: sr520.name,
      estimatedCost: sr520.avgCost,
      range: sr520.range,
      detected: true,
    };
  }

  console.error("No WA toll corridor detected for this route");
  return {
    corridor: "None detected",
    estimatedCost: 0,
    range: "$0",
    detected: false,
  };
}

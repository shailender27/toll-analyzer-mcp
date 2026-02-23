import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import dotenv from "dotenv";

import { getWAGasPrice } from "./tools/gasPrice.js";
import { getRoute } from "./tools/routing.js";
import { getTollEstimate } from "./tools/tolls.js";
import { calculateFuelCost } from "./tools/fuelCost.js";
import type { CommuteComparison } from "./types.js";

dotenv.config();

const server = new McpServer({
  name: "wa-toll-analyzer",
  version: "1.0.0",
});

// ─── Tool 1: get_wa_gas_price ────────────────────────────────────────────────
server.tool(
  "get_wa_gas_price",
  "Fetches the current Washington State regular gasoline price from the EIA API",
  {},
  async () => {
    const price = await getWAGasPrice();
    return {
      content: [
        {
          type: "text",
          text: `Current WA regular gas price: $${price.toFixed(2)} per gallon`,
        },
      ],
    };
  }
);

// ─── Tool 2: get_route ───────────────────────────────────────────────────────
server.tool(
  "get_route",
  "Gets driving distance (miles) and estimated travel time (minutes) between two addresses using OpenRouteService",
  {
    start: z.string().describe("Starting address or location (e.g. 'Capitol Hill, Seattle, WA')"),
    end: z.string().describe("Destination address or location (e.g. 'Microsoft Campus, Redmond, WA')"),
    avoid_tolls: z
      .boolean()
      .default(false)
      .describe("If true, routes around toll roads and bridges"),
  },
  async ({ start, end, avoid_tolls }) => {
    const route = await getRoute(start, end, avoid_tolls);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(route, null, 2),
        },
      ],
    };
  }
);

// ─── Tool 3: get_toll_estimate ───────────────────────────────────────────────
server.tool(
  "get_toll_estimate",
  "Estimates Washington State toll costs for a route based on known WA toll corridors (SR-520, I-405, SR-167, Tacoma Narrows). Uses Good To Go average rates.",
  {
    start: z.string().describe("Starting address"),
    end: z.string().describe("Destination address"),
  },
  async ({ start, end }) => {
    const estimate = getTollEstimate(start, end);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(estimate, null, 2),
        },
      ],
    };
  }
);

// ─── Tool 4: calculate_fuel_cost ─────────────────────────────────────────────
server.tool(
  "calculate_fuel_cost",
  "Calculates fuel cost for a trip: (miles / mpg) × gas_price",
  {
    miles: z.number().positive().describe("Trip distance in miles"),
    mpg: z.number().positive().describe("Vehicle fuel efficiency in miles per gallon"),
    gas_price: z.number().positive().describe("Gas price in dollars per gallon"),
  },
  async ({ miles, mpg, gas_price }) => {
    const result = calculateFuelCost(miles, mpg, gas_price);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// ─── Tool 5: analyze_commute ─────────────────────────────────────────────────
server.tool(
  "analyze_commute",
  "Full toll vs. no-toll route comparison for a WA commute. Returns cost breakdown (fuel + tolls) and travel time for both options.",
  {
    start: z.string().describe("Starting address (e.g. 'Capitol Hill, Seattle, WA')"),
    end: z.string().describe("Destination address (e.g. 'Microsoft Campus, Redmond, WA')"),
    mpg: z
      .number()
      .positive()
      .default(23)
      .describe("Vehicle MPG — defaults to 23 (US average)"),
  },
  async ({ start, end, mpg }) => {
    console.error(`analyze_commute: "${start}" → "${end}" @ ${mpg} MPG`);

    // Fetch all data in parallel
    const [tollRoute, noTollRoute, gasPrice] = await Promise.all([
      getRoute(start, end, false),
      getRoute(start, end, true),
      getWAGasPrice(),
    ]);

    const tollEstimate = getTollEstimate(start, end);

    const tollFuel = calculateFuelCost(tollRoute.distanceMiles, mpg, gasPrice);
    const noTollFuel = calculateFuelCost(noTollRoute.distanceMiles, mpg, gasPrice);

    const tollTotal = tollFuel.fuelCost + tollEstimate.estimatedCost;
    const noTollTotal = noTollFuel.fuelCost;

    const comparison: CommuteComparison = {
      tollRoute: {
        distanceMiles: Math.round(tollRoute.distanceMiles * 10) / 10,
        durationMinutes: tollRoute.durationMinutes,
        fuelCost: tollFuel.fuelCost,
        tollCost: tollEstimate.estimatedCost,
        totalCost: Math.round(tollTotal * 100) / 100,
        tollCorridor: tollEstimate.corridor,
      },
      noTollRoute: {
        distanceMiles: Math.round(noTollRoute.distanceMiles * 10) / 10,
        durationMinutes: noTollRoute.durationMinutes,
        fuelCost: noTollFuel.fuelCost,
        tollCost: 0,
        totalCost: Math.round(noTollTotal * 100) / 100,
      },
      savings: {
        costSavingsAvoidingToll: Math.round((tollTotal - noTollTotal) * 100) / 100,
        timeCostMinutes: noTollRoute.durationMinutes - tollRoute.durationMinutes,
      },
      gasPriceUsed: gasPrice,
    };

    const text = formatComparison(start, end, comparison);

    return {
      content: [
        {
          type: "text",
          text,
        },
      ],
    };
  }
);

function formatComparison(
  start: string,
  end: string,
  c: CommuteComparison
): string {
  const tollLabel = c.tollRoute.tollCorridor !== "None detected"
    ? `Toll Route (${c.tollRoute.tollCorridor})`
    : "Toll Route";

  const savingsSign = c.savings.costSavingsAvoidingToll >= 0 ? "+" : "-";
  const absSavings = Math.abs(c.savings.costSavingsAvoidingToll).toFixed(2);
  const timeLabel =
    c.savings.timeCostMinutes > 0
      ? `${c.savings.timeCostMinutes} min longer`
      : c.savings.timeCostMinutes < 0
      ? `${Math.abs(c.savings.timeCostMinutes)} min faster`
      : "same time";

  return `## WA Commute Comparison: ${start} → ${end}

| | ${tollLabel} | No-Toll Route |
|---|---|---|
| Distance | ${c.tollRoute.distanceMiles} mi | ${c.noTollRoute.distanceMiles} mi |
| Travel Time | ${c.tollRoute.durationMinutes} min | ${c.noTollRoute.durationMinutes} min |
| Fuel Cost | $${c.tollRoute.fuelCost.toFixed(2)} | $${c.noTollRoute.fuelCost.toFixed(2)} |
| Toll Cost | ~$${c.tollRoute.tollCost.toFixed(2)} (avg Good To Go) | $0.00 |
| **Total Cost** | **~$${c.tollRoute.totalCost.toFixed(2)}** | **$${c.noTollRoute.totalCost.toFixed(2)}** |

**Gas price used:** $${c.gasPriceUsed.toFixed(2)}/gal (WA average, EIA)

${
  c.savings.costSavingsAvoidingToll > 0
    ? `Avoiding the toll saves ~$${absSavings}/trip but the no-toll route is ${timeLabel}.`
    : c.savings.costSavingsAvoidingToll < 0
    ? `Taking the toll route costs $${absSavings} more but saves ${Math.abs(c.savings.timeCostMinutes)} min.`
    : `Both routes cost roughly the same.`
}

_Toll rates are Good To Go averages. Actual tolls vary by time of day._`;
}

// ─── Start server ─────────────────────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("WA Toll Analyzer MCP Server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

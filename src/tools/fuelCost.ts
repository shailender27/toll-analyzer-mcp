import type { FuelCostResult } from "../types.js";

export function calculateFuelCost(
  miles: number,
  mpg: number,
  gasPricePerGallon: number
): FuelCostResult {
  if (mpg <= 0) throw new Error("MPG must be greater than 0");
  if (miles < 0) throw new Error("Miles cannot be negative");
  if (gasPricePerGallon <= 0) throw new Error("Gas price must be greater than 0");

  const gallonsUsed = miles / mpg;
  const fuelCost = gallonsUsed * gasPricePerGallon;

  console.error(
    `Fuel calc: ${miles.toFixed(1)} mi / ${mpg} mpg × $${gasPricePerGallon.toFixed(2)} = $${fuelCost.toFixed(2)}`
  );

  return {
    miles,
    mpg,
    gasPricePerGallon,
    fuelCost: Math.round(fuelCost * 100) / 100,
  };
}

export interface RouteResult {
  distanceMiles: number;
  durationMinutes: number;
  summary: string;
}

export interface TollEstimate {
  corridor: string;
  estimatedCost: number;
  range: string;
  detected: boolean;
}

export interface FuelCostResult {
  miles: number;
  mpg: number;
  gasPricePerGallon: number;
  fuelCost: number;
}

export interface CommuteComparison {
  tollRoute: {
    distanceMiles: number;
    durationMinutes: number;
    fuelCost: number;
    tollCost: number;
    totalCost: number;
    tollCorridor: string;
  };
  noTollRoute: {
    distanceMiles: number;
    durationMinutes: number;
    fuelCost: number;
    tollCost: number;
    totalCost: number;
  };
  savings: {
    costSavingsAvoidingToll: number;
    timeCostMinutes: number;
  };
  gasPriceUsed: number;
}

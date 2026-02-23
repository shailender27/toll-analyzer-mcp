import axios from "axios";
import type { RouteResult } from "../types.js";

const ORS_BASE = "https://api.openrouteservice.org";
const METERS_TO_MILES = 0.000621371;
const SECONDS_TO_MINUTES = 1 / 60;

async function geocode(address: string, apiKey: string): Promise<[number, number]> {
  const response = await axios.get(`${ORS_BASE}/geocode/search`, {
    params: {
      api_key: apiKey,
      text: address,
      "boundary.country": "US",
      size: 1,
    },
  });

  const features = response.data?.features;
  if (!features || features.length === 0) {
    throw new Error(`Could not geocode address: "${address}"`);
  }

  const [lon, lat] = features[0].geometry.coordinates;
  console.error(`Geocoded "${address}" → [${lon}, ${lat}]`);
  return [lon, lat];
}

export async function getRoute(
  start: string,
  end: string,
  avoidTolls: boolean
): Promise<RouteResult> {
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey || apiKey === "your_openrouteservice_api_key_here") {
    throw new Error("ORS_API_KEY is not configured. Please set it in your environment.");
  }

  const [startCoords, endCoords] = await Promise.all([
    geocode(start, apiKey),
    geocode(end, apiKey),
  ]);

  const body: Record<string, unknown> = {
    coordinates: [startCoords, endCoords],
    units: "mi",
    instructions: false,
  };

  if (avoidTolls) {
    body.options = { avoid_features: ["tollways"] };
  }

  const response = await axios.post(
    `${ORS_BASE}/v2/directions/driving-car`,
    body,
    {
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
    }
  );

  const summary = response.data?.routes?.[0]?.summary;
  if (!summary) {
    throw new Error("No route found between the provided addresses.");
  }

  const distanceMiles = summary.distance; // already in miles due to units:"mi"
  const durationMinutes = Math.round(summary.duration * SECONDS_TO_MINUTES);

  const routeType = avoidTolls ? "toll-free" : "standard";
  console.error(
    `Route (${routeType}): ${distanceMiles.toFixed(1)} mi, ${durationMinutes} min`
  );

  return {
    distanceMiles,
    durationMinutes,
    summary: `${distanceMiles.toFixed(1)} miles, ${durationMinutes} minutes`,
  };
}

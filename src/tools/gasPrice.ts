import axios from "axios";

const EIA_SERIES_ID = "EMM_EPMR_PTE_SWA_DPG";

export async function getWAGasPrice(): Promise<number> {
  const apiKey = process.env.EIA_API_KEY;
  if (!apiKey || apiKey === "your_eia_api_key_here") {
    console.error("EIA_API_KEY not set, using fallback price");
    return 3.85; // fallback WA average
  }

  try {
    const url = `https://api.eia.gov/v2/petroleum/pri/gnd/data/`;
    const response = await axios.get(url, {
      params: {
        api_key: apiKey,
        frequency: "weekly",
        "data[0]": "value",
        "facets[series][]": EIA_SERIES_ID,
        sort: '[{"column":"period","direction":"desc"}]',
        offset: 0,
        length: 1,
      },
    });

    const data = response.data?.response?.data;
    if (data && data.length > 0 && data[0].value !== null) {
      const price = parseFloat(data[0].value);
      console.error(`EIA WA gas price fetched: $${price}/gal`);
      return price;
    }

    console.error("EIA returned no data, using fallback");
    return 3.85;
  } catch (err) {
    console.error("EIA API error:", err);
    return 3.85;
  }
}

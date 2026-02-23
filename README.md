# WA Toll Analyzer MCP Server

A local MCP server for Claude Desktop that helps you decide whether to take toll/express lanes or regular lanes in Washington State. Claude orchestrates the tools to compare total trip cost (fuel + tolls) and travel time for both route options.

## Example Output

> **Compare driving from Capitol Hill Seattle to Microsoft Redmond at 30 MPG**
>
> | | Toll Route (SR-520) | No-Toll Route |
> |---|---|---|
> | Distance | 13.2 mi | 16.8 mi |
> | Travel Time | 22 min | 35 min |
> | Fuel Cost | $1.51 | $1.92 |
> | Toll Cost | ~$2.78 | $0.00 |
> | **Total Cost** | **~$4.29** | **$1.92** |
>
> Avoiding the toll saves ~$2.37/trip but the no-toll route is 13 min longer.

## Tools

| Tool | What it does |
|---|---|
| `get_wa_gas_price` | Fetches current WA gas price from the EIA API |
| `get_route` | Gets distance + duration between two addresses |
| `get_toll_estimate` | Estimates WA toll costs for the corridor |
| `calculate_fuel_cost` | Calculates (miles / mpg) × gas price |
| `analyze_commute` | Full toll vs. no-toll comparison |

## Supported WA Toll Corridors

| Road | Avg Cost (Good To Go) | Range |
|---|---|---|
| SR-520 Bridge | $2.78 | $1.25–$4.30 |
| I-405 Express Toll Lanes | $3.00 | $0.75–$10.00 |
| SR-167 HOT Lanes | $2.50 | $0.50–$9.00 |
| Tacoma Narrows Bridge | $6.50 | fixed |

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Claude Desktop](https://claude.ai/download)
- [OpenRouteService API key](https://openrouteservice.org/dev/#/home) (free, 2,000 req/day)
- [EIA API key](https://www.eia.gov/opendata/register.php) (free, emailed instantly)

## Setup

### 1. Clone and install

```bash
git clone https://github.com/shailender27/toll-analyzer-mcp.git
cd toll-analyzer-mcp
npm install
```

### 2. Add API keys

Create a `.env` file in the project root:

```
ORS_API_KEY=your_openrouteservice_key
EIA_API_KEY=your_eia_key
```

### 3. Build

```bash
npm run build
```

### 4. Configure Claude Desktop

Add to `%APPDATA%\Claude\claude_desktop_config.json` (Windows) or `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac):

```json
{
  "mcpServers": {
    "wa-toll-analyzer": {
      "command": "node",
      "args": ["C:\\Users\\YOU\\path\\to\\toll-analyzer-mcp\\build\\index.js"],
      "env": {
        "ORS_API_KEY": "your_openrouteservice_key",
        "EIA_API_KEY": "your_eia_key"
      }
    }
  }
}
```

### 5. Restart Claude Desktop

Fully quit from the system tray and relaunch. The `wa-toll-analyzer` server with 5 tools should appear in the tools menu.

## Example Prompts

- *"Compare cost of driving from Capitol Hill Seattle to Microsoft Redmond, I get 30 MPG"*
- *"Is it worth paying the SR-520 toll to get to Bellevue from Fremont at 28 MPG?"*
- *"Compare driving from Tacoma to Gig Harbor vs going around, I get 25 MPG"*
- *"What's the current WA gas price?"*

## Tech Stack

- **Node.js + TypeScript**
- [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk) — MCP server framework
- [`axios`](https://axios-http.com/) — HTTP requests
- [`zod`](https://zod.dev/) — input validation
- [`dotenv`](https://github.com/motdotla/dotenv) — environment variables

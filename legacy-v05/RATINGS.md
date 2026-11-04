# PokeFC — v0.5 Pokémon-to-Soccer Rating Design

## Input data

All 151 original Pokédex IDs use the default modern base stats from the [PokéAPI source](https://github.com/PokeAPI/pokeapi/blob/master/data/v2/csv/pokemon_stats.csv), in the standard order:

`HP`, `Attack`, `Defense`, `Special Attack`, `Special Defense`, `Speed`.

This is canonical Pokémon **input data**. The soccer ratings below are our own fantasy conversion, **not official Pokémon ratings**. Values don't change at random between drafts or browsers.

## Six fantasy soccer attributes (0–99)

First, compute a blended input for each attribute:

| Fantasy rating | Weighted Pokémon base stats |
|---|---|
| PAC — Pace | 80% Speed + 13% Attack + 7% HP |
| SHO — Shooting | 45% Attack + 40% Sp. Attack + 15% Speed |
| PAS — Passing | 43% Sp. Attack + 31% Sp. Defense + 17% Speed + 9% Defense |
| DRI — Dribbling | 40% Speed + 35% Sp. Attack + 15% Sp. Defense + 10% Attack |
| DEF — Defending | 54% Defense + 27% Sp. Defense + 10% Attack + 9% HP |
| PHY — Physicality | 30% HP + 35% Attack + 25% Defense + 10% Sp. Defense |

Then calculate:

`attribute = clamp(round(30 + 0.48 * min(160, blended) + primaryTypeBonus + 0.5 * secondaryTypeBonus), 30, 98)`

Type bonuses are small (usually between −4 and +4) and intentionally secondary to base stats. Dual types receive half the bonus of the secondary type. These parameters are **tuning knobs**, not canonical stats.

## Position-specific overall rating

We never assign a single universal overall rating to a Pokémon. For a given position:

`positionFit = round(PAC * weightPAC + SHO * weightSHO + PAS * weightPAS + DRI * weightDRI + DEF * weightDEF + PHY * weightPHY)`

The weights for all 14 positions are in `app.js` as `ROLE_WEIGHTS`. For GK, the agreed weights are:

| Attribute | GK weight |
|---|---:|
| PAC | 10% |
| SHO | 5% |
| PAS | 10% |
| DRI | 10% |
| DEF | 40% |
| PHY | 25% |

Franchise's situational GK saves can give different emphasis to the same six attributes, depending on whether the goalkeeper faces a one-on-one, long shot, corner, etc. There are no separate GK-only stats.

## Example v0.5 values

| Pokémon | PAC | SHO | PAS | DRI | DEF | PHY | Best fit(s) |
|---|---:|---:|---:|---:|---:|---:|---|
| Alakazam | 81 | 76 | 88 | 88 | 59 | 54 | CAM / LW / RW: 81 |
| Electrode | 97 | 67 | 76 | 83 | 63 | 57 | LW / RW: 81 |
| Snorlax | 54 | 68 | 65 | 60 | 73 | 85 | GK / CB: 72 |
| Mewtwo | 90 | 94 | 94 | 96 | 75 | 77 | CAM / LW / RW: 92 |

## Balancing plan

v0.5 is the **first meaningful, reproducible rating pass**, not a competitive esports balancing release. We should tune the CPU drafting decisions, team strength spread, scoring distribution, positional ratings, and chemistry after observing many seasons. Keep the base-stat inputs fixed, and adjust the conversion weights independently.

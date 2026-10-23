import type { LevelItem } from './types.ts';

/**
 * Procedurally structured 1000m lunar track for MOONRUN.
 * Finite length: ~83 seconds at base speed (12m/s), ~60s with selective boost.
 *
 * All coordinates and dimensions are strictly in logical meters:
 * - distanceMeters: track distance
 * - altitudeMeters: height above solid ground surface (altitude = 0m)
 * - widthMeters: horizontal span (rocks and chasms)
 * - heightMeters: vertical height above ground (rocks)
 *
 * Deterministic opening segment (~20-25s):
 * - Rock 1 (55m): First obstacle encounter to introduce jumping.
 * - O2 Canister 1 (90m): Replenishes air, teaching oxygen resource mechanics.
 * - Rock 2 (140m): Second timing check before the fissure.
 * - Chasm 1 (175m - 184.5m, width 9.5m): Deep crevasse. A standard jump (12m range) clears it safely.
 * - Part 1 (195m): First of five spacecraft repair parts right after the chasm landing.
 */

export function generateLevel(): LevelItem[] {
  return [
    // 0 - 80m: Gentle learning runway
    { id: 'rock_1', type: 'rock', distanceMeters: 55, widthMeters: 2.0, heightMeters: 1.3 },
    { id: 'o2_1', type: 'oxygen', distanceMeters: 90, altitudeMeters: 1.1 },

    // 100 - 250m: Early pace, Chasm 1 & Part 1
    { id: 'rock_2', type: 'rock', distanceMeters: 140, widthMeters: 2.0, heightMeters: 1.3 },
    { id: 'chasm_1', type: 'chasm', distanceMeters: 175, widthMeters: 9.5 },
    // Part 1: Positioned right after chasm 1 landing
    { id: 'part_1', type: 'part', distanceMeters: 195, altitudeMeters: 1.2 },
    { id: 'o2_2', type: 'oxygen', distanceMeters: 235, altitudeMeters: 1.1 },

    // 250 - 450m: Ramping tension, Chasm 2 & Part 2
    { id: 'rock_3', type: 'rock', distanceMeters: 290, widthMeters: 2.2, heightMeters: 1.35 },
    { id: 'chasm_2', type: 'chasm', distanceMeters: 330, widthMeters: 10.5 },
    { id: 'o2_3', type: 'oxygen', distanceMeters: 335.25, altitudeMeters: 1.4 }, // floating inside jump arc
    { id: 'rock_4', type: 'rock', distanceMeters: 380, widthMeters: 2.0, heightMeters: 1.3 },
    // Part 2: High floating item requiring deliberate jump
    { id: 'part_2', type: 'part', distanceMeters: 415, altitudeMeters: 1.5 },
    { id: 'o2_4', type: 'oxygen', distanceMeters: 460, altitudeMeters: 1.1 },

    // 450 - 650m: Mid-run challenge, Chasm 3 & Part 3
    { id: 'rock_5', type: 'rock', distanceMeters: 510, widthMeters: 2.4, heightMeters: 1.4 },
    { id: 'chasm_3', type: 'chasm', distanceMeters: 550, widthMeters: 11.0 },
    { id: 'rock_6', type: 'rock', distanceMeters: 590, widthMeters: 2.0, heightMeters: 1.3 },
    // Part 3: Hovering above a rocky crevice
    { id: 'part_3', type: 'part', distanceMeters: 625, altitudeMeters: 1.3 },
    { id: 'o2_5', type: 'oxygen', distanceMeters: 665, altitudeMeters: 1.1 },

    // 650 - 850m: Intensifying pursuer pressure, Chasm 4 & Part 4
    { id: 'chasm_4', type: 'chasm', distanceMeters: 710, widthMeters: 11.5 },
    { id: 'rock_7', type: 'rock', distanceMeters: 755, widthMeters: 2.4, heightMeters: 1.4 },
    // Part 4: High risk/reward leap
    { id: 'part_4', type: 'part', distanceMeters: 785, altitudeMeters: 1.5 },
    { id: 'o2_6', type: 'oxygen', distanceMeters: 820, altitudeMeters: 1.1 },
    { id: 'rock_8', type: 'rock', distanceMeters: 860, widthMeters: 2.2, heightMeters: 1.35 },

    // 850 - 1000m: Final gauntlet, Chasm 5 & Part 5
    { id: 'chasm_5', type: 'chasm', distanceMeters: 895, widthMeters: 12.0 },
    // Part 5: Final essential component
    { id: 'part_5', type: 'part', distanceMeters: 935, altitudeMeters: 1.3 },
    { id: 'o2_7', type: 'oxygen', distanceMeters: 955, altitudeMeters: 1.1 },
    { id: 'rock_9', type: 'rock', distanceMeters: 975, widthMeters: 2.0, heightMeters: 1.3 },
    // 1000m: Spacecraft Launchpad & Escape Shuttle!
  ];
}

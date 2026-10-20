import { LevelItem } from './types.ts';

/**
 * Procedurally structured 1000m lunar track for MOONRUN.
 * Finite length: ~90 seconds at normal speed (~12m/s), faster when boosting.
 * Exactly 5 spacecraft repair parts.
 * Strategically placed oxygen canisters to reward exploration and pacing.
 * Rocks (slowdown hazard) and chasms (fatal pit hazard).
 */

export function generateLevel(): LevelItem[] {
  return [
    // 0 - 80m: Gentle learning runway
    { id: 'rock_1', type: 'rock', distanceMeters: 55, widthMeters: 2.2, heightMeters: 1.6 },
    { id: 'o2_1', type: 'oxygen', distanceMeters: 90, yOffset: -35 },

    // 100 - 250m: Early pace, Part 1
    { id: 'rock_2', type: 'rock', distanceMeters: 140, widthMeters: 2.5, heightMeters: 1.8 },
    { id: 'chasm_1', type: 'chasm', distanceMeters: 175, widthMeters: 10 },
    // Part 1: Positioned right after chasm 1 landing
    { id: 'part_1', type: 'part', distanceMeters: 200, yOffset: -30 },
    { id: 'o2_2', type: 'oxygen', distanceMeters: 235, yOffset: -40 },

    // 250 - 450m: Ramping tension, Part 2
    { id: 'rock_3', type: 'rock', distanceMeters: 290, widthMeters: 2.8, heightMeters: 2.0 },
    { id: 'chasm_2', type: 'chasm', distanceMeters: 330, widthMeters: 12 },
    { id: 'o2_3', type: 'oxygen', distanceMeters: 336, yOffset: -55 }, // inside jump arc of chasm
    { id: 'rock_4', type: 'rock', distanceMeters: 380, widthMeters: 2.5, heightMeters: 1.8 },
    // Part 2: High floating item requiring deliberate jump
    { id: 'part_2', type: 'part', distanceMeters: 415, yOffset: -65 },
    { id: 'o2_4', type: 'oxygen', distanceMeters: 460, yOffset: -30 },

    // 450 - 650m: Mid-run challenge, Part 3 (around 640m remaining marker)
    { id: 'rock_5', type: 'rock', distanceMeters: 510, widthMeters: 3.0, heightMeters: 2.2 },
    { id: 'chasm_3', type: 'chasm', distanceMeters: 550, widthMeters: 13 },
    { id: 'rock_6', type: 'rock', distanceMeters: 590, widthMeters: 2.4, heightMeters: 1.8 },
    // Part 3: Hovering above a rocky crevice
    { id: 'part_3', type: 'part', distanceMeters: 625, yOffset: -45 },
    { id: 'o2_5', type: 'oxygen', distanceMeters: 665, yOffset: -40 },

    // 650 - 850m: Intensifying pursuer pressure, Parts 4 & 5
    { id: 'chasm_4', type: 'chasm', distanceMeters: 710, widthMeters: 14 },
    { id: 'rock_7', type: 'rock', distanceMeters: 755, widthMeters: 3.2, heightMeters: 2.2 },
    // Part 4: Risk/reward leap
    { id: 'part_4', type: 'part', distanceMeters: 785, yOffset: -60 },
    { id: 'o2_6', type: 'oxygen', distanceMeters: 820, yOffset: -35 },
    { id: 'rock_8', type: 'rock', distanceMeters: 860, widthMeters: 2.6, heightMeters: 1.9 },

    // 850 - 1000m: Final gauntlet to the shuttle
    { id: 'chasm_5', type: 'chasm', distanceMeters: 895, widthMeters: 15 },
    // Part 5: Final essential component
    { id: 'part_5', type: 'part', distanceMeters: 935, yOffset: -45 },
    { id: 'o2_7', type: 'oxygen', distanceMeters: 955, yOffset: -30 },
    { id: 'rock_9', type: 'rock', distanceMeters: 975, widthMeters: 2.2, heightMeters: 1.6 },
    // 1000m is the Spacecraft Touchdown Site!
  ];
}

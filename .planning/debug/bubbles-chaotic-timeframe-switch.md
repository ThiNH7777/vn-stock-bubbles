---
status: awaiting_human_verify
trigger: "Bubbles go chaotic when switching timeframe tabs"
created: 2026-03-07T00:00:00Z
updated: 2026-03-07T00:00:00Z
---

## Current Focus

hypothesis: Multiple root causes - fill factor 3.6x causes total bubble area 3.6x screen, AND computeRadii produces wildly different distributions per timeframe
test: Analyze the math of computeRadii with different change magnitudes
expecting: Confirm fill factor and/or normalization cause extreme radii
next_action: Trace the math for day vs year timeframes

## Symptoms

expected: Switching tabs smoothly transitions bubble sizes; bubbles stay non-overlapping
actual: Bubbles explode, grow huge, overlap massively when switching timeframes
errors: No console errors - visual chaos only
reproduction: Click between Ngay/Tuan/Thang/Nam tabs
started: After adding targetRadius animation system

## Eliminated

## Evidence

- timestamp: 2026-03-07T00:01:00Z
  checked: computeRadii math with fill=3.6, screen 1400x800
  found: rAvg for N=400 is ~56px, rAvg for N=100 is ~113px. 2x difference.
  implication: Initial radii (N=400) are reasonable, but timeframe switch radii (N=100) are 2x larger

- timestamp: 2026-03-07T00:02:00Z
  checked: initBuffersFromStocks uses stocks.length (~400) vs BubbleCanvas count=100
  found: N mismatch -- init computes for 400 bubbles but only 100 exist in buffers
  implication: Initial display looks OK by accident (400-bubble sizing), switch breaks it (100-bubble sizing)

- timestamp: 2026-03-07T00:03:00Z
  checked: fill factor = 0.90 * 4 = 3.6
  found: 3.6x screen area in bubbles. With N=100, avg radius ~113px. Massive overlap inevitable.
  implication: Even with correct N, fill=3.6 means bubbles cannot physically fit

## Resolution

root_cause: |
  Two bugs combine to cause chaos on timeframe switch:
  1. N MISMATCH: initBuffersFromStocks uses stocks.length (~400) for computeRadii, but BubbleCanvas
     only creates 100 buffer slots. updateRadiiTargets correctly uses count=100. This means initial
     radii are computed for N=400 (small), but on first tab switch they jump to N=100 (2x larger).
  2. FILL FACTOR TOO HIGH: fill=0.90*4=3.6 means total bubble area = 3.6x screen area.
     With N=100, average radius is ~113px on a 1400x800 screen. 100 such bubbles physically
     cannot fit without massive overlap.
  The combination: app starts looking OK by accident (N=400 sizing), then explodes on tab switch
  (N=100 sizing produces 4x the area).
fix: |
  1. state.ts: Changed fill factor from 0.90*4 (3.6) to 0.55 -- bubbles now fill ~55% of screen
  2. state.ts: Fixed initBuffersFromStocks to use buffers.radius.length (=count=100) instead of
     stocks.length (~400). This eliminates the N mismatch between init and timeframe switch.
  3. physics.ts: Increased COLLISION_ITERATIONS from 2 to 3 for better separation during transitions
  4. physics.ts: Increased PUSH_STRENGTH from 0.5 to 0.6 for stronger overlap resolution
verification: tsc --noEmit passes, npm run build passes. Visual verification needed.
files_changed:
  - vn-stock-bubbles/src/simulation/state.ts
  - vn-stock-bubbles/src/simulation/physics.ts

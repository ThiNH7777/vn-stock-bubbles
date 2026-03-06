# Bubble Design Decisions

**Gathered:** 2026-03-06 (post-Phase 1 discussion)
**Applies to:** Phase 3 (Rendering Pipeline) and beyond
**Status:** Ready for use in Phase 3 planning

## Visual Style: Neon Glow Edge

Reference: cryptobubbles.net bubble style (see test_v9.png or similar reference images)

### Bubble Structure (outside → inside)
- **Outer glow**: Neon color bleeds outward from border (CSS shadow-like effect)
- **Border**: Bright neon color, 2-3px, the brightest part of the bubble
- **Gradient fill**: From bright edge color → darker → very dark center (near black)
- **Center**: Very dark (near #1a1a1a), NOT transparent — opaque dark fill
- **3D effect**: Strong radial gradient — highlight rgba(255,255,255,0.14) top-left, shadow rgba(0,0,0,0.22) bottom-right

### Animation
- Breathing glow effect (glow intensity pulses) for bubbles with high |% change|
- Physics engine handles movement (no separate idle animation needed)

### Text
- White bold text with dark drop shadow (always readable on dark center)
- Ticker symbol (large, centered)
- % change below ticker
- Always show text even on smallest bubbles (font scales down)

## Color System

### VN Convention (default)
Only 3 colors — no ceiling/floor distinction:
- **Tăng (up)**: Xanh dương #2196F3
- **Tham chiếu (reference/~0%)**: Vàng #FFC107 at ~30% opacity (very muted, near gray)
- **Giảm (down)**: Đỏ #F44336

### International Mode (toggle in v1)
- **Up**: Green #4CAF50
- **Reference**: Gray/muted
- **Down**: Red #F44336

### Intensity
- Color saturation/brightness scales with |% change|
- +0.5% = very faint blue, +5% = vivid blue, +7% = max intensity
- Same for red (negative)
- Near 0% = very muted yellow, almost gray

### Removed from original plan
- NO purple for ceiling price
- NO cyan for floor price
- NO CE/FL badges
- NO 5-color VN system — simplified to 3 colors

## Size & Scale

### Size metric: % change (NOT market cap)
- Bubble size represents |% change| — high movers are biggest
- This is a change from RNDR-02 requirement which said market cap
- Update REQUIREMENTS.md when planning Phase 3

### Scale function
- Sqrt scale: radius = sqrt(|% change|) mapped to range
- Area proportional to % change (perceptually correct)

### Size ratio
- Max:min ratio = 8:1 (area)
- Smallest bubbles still display text (font scales down)

---
*Decisions gathered: 2026-03-06*
*For use in: /gsd:discuss-phase 3 and /gsd:plan-phase 3*

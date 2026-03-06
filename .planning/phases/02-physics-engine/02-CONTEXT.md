# Phase 2: Physics Engine - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Custom circle-only physics engine with spatial hash grid for O(1) collision detection. 400+ bubbles floating with ambient motion, colliding realistically, and staying within canvas bounds at 60fps. Fixed-timestep simulation loop decoupled from render rate. No center gravity (PHYS-05 overridden by user decision). Phase 1 provides typed arrays (x, y, vx, vy, radius, mass) initialized to zero velocity — this phase activates them.

</domain>

<decisions>
## Implementation Decisions

### Ambient motion
- Lava lamp style — slow, smooth, organic floating
- Speed: chậm vừa — thấy rõ đang trôi nhưng không gây phân tâm (như bọt bồng xà phòng)
- Bubble nhỏ trôi nhanh hơn bubble lớn (tỉ lệ nghịch với mass)
- Dùng Perlin/Simplex noise để tạo lực ambient — chuyển động mượt mà, không bị giật

### Collision response
- Soft body — bubble hơi chồng lên nhau rồi đẩy ra từ từ (không nảy sắc cạnh)
- Giữ đà nhẹ sau va chạm — bubble dịch chuyển 1 chút rồi chậm lại
- Theo khối lượng: bubble nhỏ bị đẩy nhiều hơn, bubble lớn gần như đứng yên (mass-weighted resolution)
- Jitter nhỏ chấp nhận được — không cần zero jitter, miễn không lộ rõ

### Center gravity
- KHÔNG có center gravity (PHYS-05 bị bỏ theo quyết định user)
- Bubble trải đều khắp canvas
- Bubble lớn ưu tiên gần tâm hơn — thực hiện qua initial placement, không phải lực hút
- Spawn ngẫu nhiên khắp toàn bộ screen khi khởi động

### Boundary containment
- Nảy mềm khi chạm rìa canvas — giảm tốc, không giật
- Bubble hoàn toàn trong canvas — không được lòi ra ngoài (đáp ứng PHYS-06)
- Padding nhỏ (~10-20px) từ rìa canvas
- Khi resize browser: giữ vị trí hiện tại, boundary containment đẩy bubble vào nếu bị thoát ra ngoài

### Claude's Discretion
- Perlin noise parameters (frequency, amplitude, seed strategy)
- Damping coefficient tuning
- Collision iteration count (3-5 passes per PHYS-03)
- Spatial hash cell size relative to max bubble radius
- Exact soft-body overlap threshold before push-back
- Fixed timestep value (e.g., 1/60 vs 1/120)

</decisions>

<specifics>
## Specific Ideas

- Cryptobubbles.net là nguồn cảm hứng chính — bubble trôi nổi tự nhiên trên nền tối
- Cảm giác tổng thể: bình yên, organic, như nhìn bọt trong nước — không mechanical
- Reference code (script.js) dùng D3 force simulation — Phase 2 thay thế hoàn toàn bằng custom engine
- User muốn drag interaction trong Phase 4 với đặc tính: bubble lớn khó kéo hơn, nhỏ dễ kéo hơn (lực drag tỉ lệ nghịch khối lượng) — ghi nhận cho Phase 4

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- Phase 1 typed arrays (x, y, vx, vy, radius, mass): Physics engine đọc/ghi trực tiếp vào đây
- Phase 1 canvas + HiDPI setup: Render loop sẽ dùng canvas context từ Phase 1
- `script.js` layout() (lines 102-167): Reference cho boundary clamping pattern (`Math.max(r, Math.min(W-r, x))`)

### Established Patterns
- Two-tier state: Zustand cho UI, typed arrays cho simulation — physics engine chỉ động typed arrays
- Canvas 2D với devicePixelRatio scaling
- Dark background (#1a1a1a)

### Integration Points
- Physics engine nhận typed arrays từ Phase 1 simulation state
- Game loop cần hook vào React lifecycle (requestAnimationFrame)
- Canvas resize event cần update boundary dimensions

</code_context>

<deferred>
## Deferred Ideas

- Drag interaction với lực tỉ lệ nghịch khối lượng (bubble lớn khó kéo, nhỏ dễ kéo) — Phase 4 (INTR-01)

</deferred>

---

*Phase: 02-physics-engine*
*Context gathered: 2026-03-06*

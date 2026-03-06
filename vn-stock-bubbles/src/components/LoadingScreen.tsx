export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#111]">
      {/* Animated bubbles */}
      <div className="relative mb-8 h-32 w-32">
        <span className="absolute left-6 top-8 h-14 w-14 animate-[float_2.4s_ease-in-out_infinite] rounded-full bg-green-500/60 blur-[2px]" />
        <span className="absolute right-4 top-4 h-10 w-10 animate-[float_2s_ease-in-out_0.4s_infinite] rounded-full bg-red-500/60 blur-[2px]" />
        <span className="absolute bottom-4 left-10 h-8 w-8 animate-[float_2.8s_ease-in-out_0.8s_infinite] rounded-full bg-yellow-400/60 blur-[2px]" />
        <span className="absolute right-8 bottom-8 h-6 w-6 animate-[float_2.2s_ease-in-out_1.2s_infinite] rounded-full bg-cyan-400/60 blur-[2px]" />
      </div>

      <h1 className="mb-3 text-xl font-bold text-white sm:text-2xl">VN Stock Bubbles</h1>
      <p className="mb-6 text-sm text-white/50">Đang tải dữ liệu thị trường...</p>

      {/* Pulsing bar */}
      <div className="h-1 w-48 overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-1/2 animate-[shimmer_1.5s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      </div>
    </div>
  );
}

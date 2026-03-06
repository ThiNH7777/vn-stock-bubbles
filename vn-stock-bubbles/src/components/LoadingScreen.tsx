export function LoadingScreen() {
  return (
    <div className="flex h-[calc(100vh-4.5rem)] sm:h-[calc(100vh-5.5rem)] items-center justify-center bg-[#222222]">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-white/70" />
    </div>
  );
}

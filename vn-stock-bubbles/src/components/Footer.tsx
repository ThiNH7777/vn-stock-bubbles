import { useState } from 'react';

export function Footer() {
  const [showQR, setShowQR] = useState(false);

  return (
    <footer className="border-t border-white/10 bg-[#222] px-6 py-6 sm:px-16 lg:px-24">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        {/* Author */}
        <div className="flex items-center gap-2 text-sm text-white/50">
          <span>Built by</span>
          <a
            href="https://www.linkedin.com/in/nguyen-thi-1577951a7/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-white hover:text-[#0a66c2] transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            Nguyen Hoai Thi
          </a>
        </div>

        {/* Donation */}
        <div className="relative flex items-center gap-3">
          <button
            onClick={() => setShowQR(!showQR)}
            className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white sm:text-sm"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            Ủng Hộ Tôi
          </button>

          {/* QR Popup */}
          {showQR && (
            <div className="absolute bottom-full right-0 mb-3 flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-[#2a2a2a] p-4 shadow-2xl">
              <p className="text-sm font-medium text-white/70">Chuyen khoan ngan hang (TPBank)</p>
              <div className="overflow-hidden rounded-lg bg-white p-2">
                <img
                  src="/qr-bank.png"
                  alt="QR Ngan hang"
                  className="h-64 w-64 object-contain"
                />
              </div>
              <div className="text-center text-xs text-white/50">
                <p className="font-medium text-white/70">NGUYEN HOAI THI</p>
                <p>0247 9862 301 - TPBank</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}

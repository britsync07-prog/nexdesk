"use client";

import { Share, PlusSquare, X, Check } from "lucide-react";

interface IOSInstallGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IOSInstallGuide({ isOpen, onClose }: IOSInstallGuideProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-3xl bg-[#18181b] border border-zinc-700/80 p-5 space-y-4 shadow-2xl text-left">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-extrabold text-sm">
              SL
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Install ShiftLog App</h3>
              <p className="text-[11px] text-zinc-400">Mobile Home Screen PWA</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3.5 text-xs text-zinc-300">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 font-mono font-bold text-xs">
              1
            </div>
            <div>
              <p className="font-semibold text-white">Open in Safari</p>
              <p className="text-zinc-400 text-[11px]">Ensure you are viewing this page in Safari on your iPhone or Chrome on Android.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <Share className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="font-semibold text-white">Tap the Share Icon</p>
              <p className="text-zinc-400 text-[11px]">Located at the bottom of Safari navigation bar (or three dots menu on Chrome).</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <PlusSquare className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="font-semibold text-white">Select &ldquo;Add to Home Screen&rdquo;</p>
              <p className="text-zinc-400 text-[11px]">Scroll down the share sheet and tap &ldquo;Add to Home Screen&rdquo;.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Check className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="font-semibold text-white">Launch ShiftLog</p>
              <p className="text-zinc-400 text-[11px]">Open ShiftLog directly from your Home Screen with a full-screen, standalone app experience.</p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors"
        >
          Got It
        </button>
      </div>
    </div>
  );
}

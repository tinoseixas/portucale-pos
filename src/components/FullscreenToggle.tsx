"use client";

import React, { useState, useEffect } from "react";
import { Maximize, Minimize } from "lucide-react";

export function FullscreenToggle() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <button
      onClick={toggleFullscreen}
      className="p-2 bg-slate-800/10 hover:bg-slate-800/20 rounded-full transition-colors flex items-center justify-center gap-2 group"
      title={isFullscreen ? "Sair de Ecrã Inteiro" : "Ecrã Inteiro"}
    >
      {isFullscreen ? (
        <Minimize className="w-5 h-5 text-slate-600 group-hover:text-slate-900" />
      ) : (
        <Maximize className="w-5 h-5 text-slate-600 group-hover:text-slate-900" />
      )}
    </button>
  );
}

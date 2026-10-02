"use client";
import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
export default function MusicController() {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [missing, setMissing] = useState(false);
  const manuallyPaused = useRef(false);
  useEffect(() => {
    const element = audio.current;
    if (!element) return;
    element.volume = 0.25;
    void element.play().catch(() => {});
    const start = () => {
      if (!manuallyPaused.current && element.paused)
        void element.play().catch(() => {});
    };
    window.addEventListener("pointerdown", start, { once: true });
    return () => {
      window.removeEventListener("pointerdown", start);
      element.pause();
    };
  }, []);
  function toggle() {
    const element = audio.current;
    if (!element) return;
    if (!element.paused) {
      manuallyPaused.current = true;
      element.pause();
    } else {
      manuallyPaused.current = false;
      void element.play().catch(() => {});
    }
  }
  return (
    <>
      <audio
        ref={audio}
        src="/audio/romantic.mp3"
        loop
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => setMissing(true)}
      />
      <button
        className="music-button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={toggle}
        aria-label={playing ? "Couper la musique" : "Activer la musique"}
        aria-pressed={playing}
        title={
          missing
            ? "La musique sera bientôt là"
            : playing
              ? "Couper la musique"
              : "Un peu de musique ?"
        }
      >
        {playing ? <Volume2 size={17} /> : <VolumeX size={17} />}
        <span>{playing ? "En musique" : "Un peu de musique"}</span>
      </button>
    </>
  );
}

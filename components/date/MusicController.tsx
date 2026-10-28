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
    const startAtIntro = () => {
      // The little instrumental introduction starts at 0:04, not at the
      // silent beginning of the file. Metadata can already be available on
      // a warm browser cache, hence the readyState check as well as the event.
      if (element.readyState >= HTMLMediaElement.HAVE_METADATA)
        element.currentTime = Math.min(2, Math.max(0, element.duration - 0.1));
    };
    const play = () => {
      startAtIntro();
      void element.play().catch(() => {
        // Browsers may only allow audible autoplay after a user gesture.
        // The first tap/click below retries without showing an error.
      });
    };
    element.addEventListener("loadedmetadata", startAtIntro, { once: true });
    play();
    const start = () => {
      if (!manuallyPaused.current && element.paused) play();
    };
    window.addEventListener("pointerdown", start, { once: true });
    window.addEventListener("keydown", start, { once: true });
    return () => {
      element.removeEventListener("loadedmetadata", startAtIntro);
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
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
        autoPlay
        preload="auto"
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

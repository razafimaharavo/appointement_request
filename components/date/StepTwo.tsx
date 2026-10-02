"use client";
import Image from "next/image";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
export default function StepTwo({
  next,
  busy,
}: {
  next: () => void;
  busy: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="step">
      <span className="eyebrow">MON CŒUR VIENT DE RATER UN BATTEMENT</span>
      <div className="reaction">
        {failed ? (
          <span role="img" aria-label="Surpris et heureux">
            😳💗
          </span>
        ) : (
          <Image
            width={200}
            height={115}
            unoptimized
            src="/images/surprised.webp"
            alt="Ma réaction quand tu as dit oui"
            onError={() => setFailed(true)}
          />
        )}
      </div>
      <h1>
        Attends… tu as
        <br />
        vraiment dit <em>OUI ?</em> 😳💕
      </h1>
      <p>
        Bon, je vais essayer de rester calme.
        <br />
        Mais là, tu viens de faire ma journée.
      </p>
      <button className="primary" onClick={next} disabled={busy}>
        D’accord, d’accord <ArrowRight size={17} />
      </button>
      <span className="little-note">
        Promis, je redescends sur terre… bientôt.
      </span>
    </div>
  );
}

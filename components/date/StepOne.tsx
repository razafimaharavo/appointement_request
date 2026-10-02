import { ArrowRight } from "lucide-react";
export default function StepOne({
  onYes,
  onNo,
  busy,
}: {
  onYes: () => void;
  onNo: () => void;
  busy: boolean;
}) {
  return (
    <div className="step step-one">
      <span className="eyebrow">UNE PETITE QUESTION, JUSTE POUR TOI</span>
      <div className="love-letter" aria-hidden="true">
        <div className="letter-note">
          toi + moi<span>une jolie histoire ?</span>
        </div>
        <div className="envelope">
          <div className="envelope-flap" />
          <div className="wax-seal">♥</div>
        </div>
        <span className="letter-spark s1">✧</span>
        <span className="letter-spark s2">✧</span>
        <span className="letter-heart">♡</span>
      </div>
      <h1>
        Tu veux sortir
        <br />
        avec <em>moi ?</em> <span className="title-heart">💕</span>
      </h1>
      <p>
        Un moment à deux, des sourires,
        <br />
        et le début d’un joli souvenir.
      </p>
      <div className="answer-buttons">
        <button className="primary heartbeat" onClick={onYes} disabled={busy}>
          Oui 💗 <ArrowRight size={17} />
        </button>
        <button className="secondary" onClick={onNo} disabled={busy}>
          Non
        </button>
      </div>
      <span className="little-note">
        Une petite question qui fait battre le cœur.
      </span>
    </div>
  );
}

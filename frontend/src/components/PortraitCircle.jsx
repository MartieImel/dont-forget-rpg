import { useState, useEffect } from "react";

export default function PortraitCircle({ url }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  const showImg = url && !failed;

  return (
    <div className="portrait-circle">
      {showImg ? (
        <img src={url} alt="Retrato do personagem" onError={() => setFailed(true)} />
      ) : (
        <span className="portrait-star" aria-hidden="true">
          ✦
        </span>
      )}
    </div>
  );
}

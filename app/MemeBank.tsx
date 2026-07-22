"use client";

import { useState } from "react";

const memes = [
  { src: "/brand/memes/himothy-01.jpg", title: "Miami table" },
  { src: "/brand/memes/himothy-02.jpg", title: "Champion run" },
  { src: "/brand/memes/himothy-03.jpg", title: "Golden grin" },
  { src: "/brand/memes/himothy-04.jpg", title: "Locker room" },
  { src: "/brand/memes/himothy-05.jpg", title: "Four rings" },
  { src: "/brand/memes/himothy-06.jpg", title: "Royal call" },
  { src: "/brand/memes/himothy-07.jpg", title: "Stacks" },
  { src: "/brand/memes/himothy-08.jpg", title: "Conviction push" },
  { src: "/brand/memes/himothy-09.jpg", title: "Public Himothy" }
];

export function MemeBank() {
  const [selected, setSelected] = useState<(typeof memes)[number] | null>(null);

  return (
    <div className={`meme-bank-widget ${selected ? "is-paused" : ""}`}>
      <div className="meme-bank-controls">
        <span>{selected ? "Belt paused" : "Click any meme to pause"}</span>
        {selected ? (
          <div>
            <a download href={selected.src}>Download selected</a>
            <button onClick={() => setSelected(null)} type="button">Resume belt</button>
          </div>
        ) : null}
      </div>

      <div className="meme-belt" aria-label="Himothy meme bank">
        {[...memes, ...memes].map((meme, index) => (
          <button
            aria-pressed={selected?.src === meme.src}
            className="meme-card"
            key={`${meme.src}-${index}`}
            onClick={() => setSelected(meme)}
            onPointerDown={() => setSelected(meme)}
            type="button"
          >
            <img alt={meme.title} src={meme.src} />
            <span>{meme.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

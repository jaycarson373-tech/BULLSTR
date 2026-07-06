"use client";

import { ChangeEvent, CSSProperties, DragEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Copy, Download, ImagePlus, RefreshCcw, Share2, Sparkles, UploadCloud } from "lucide-react";

type DashboardMetric = {
  id: string;
  label: string;
  value: string;
  icon: string;
};

type GeneratedImage = {
  originalUrl: string;
  ansemifiedUrl: string;
  fileName: string;
};

const DASHBOARD_ZEROES: DashboardMetric[] = [
  { id: "pfps", label: "PFPs Ansemified", value: "0", icon: "🖼️" },
  { id: "bonus", label: "Bonus Wallet", value: "0 ANSEM", icon: "💰" },
  { id: "airdropped", label: "Total ANSEM Airdropped", value: "0", icon: "🎁" }
];

const LOADING_STEPS = ["Analyzing...", "Applying Ansem...", "Generating...", "Finalizing..."];

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

async function fileToImage(file: File) {
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";
  image.src = objectUrl;
  await image.decode();
  return { image, objectUrl };
}

async function ansemifyImage(file: File): Promise<GeneratedImage> {
  const { image, objectUrl } = await fileToImage(file);
  const size = 1200;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create image canvas");

  const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
  const sourceX = (image.naturalWidth - sourceSize) / 2;
  const sourceY = (image.naturalHeight - sourceSize) / 2;

  const background = ctx.createRadialGradient(size * 0.5, size * 0.42, size * 0.08, size * 0.5, size * 0.5, size * 0.72);
  background.addColorStop(0, "#203712");
  background.addColorStop(0.42, "#15110a");
  background.addColorStop(1, "#050403");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, size, size);

  ctx.save();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.36, 0, Math.PI * 2);
  ctx.clip();
  ctx.filter = "contrast(1.08) saturate(0.82) sepia(0.46) brightness(0.95)";
  ctx.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, size * 0.14, size * 0.14, size * 0.72, size * 0.72);
  ctx.restore();

  ctx.globalCompositeOperation = "soft-light";
  const goldWash = ctx.createLinearGradient(0, 0, size, size);
  goldWash.addColorStop(0, "rgba(255, 184, 77, 0.78)");
  goldWash.addColorStop(0.52, "rgba(124, 255, 107, 0.18)");
  goldWash.addColorStop(1, "rgba(0, 0, 0, 0.42)");
  ctx.fillStyle = goldWash;
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = "source-over";

  ctx.save();
  ctx.lineWidth = 22;
  ctx.strokeStyle = "rgba(255, 161, 52, 0.94)";
  ctx.shadowColor = "rgba(124, 255, 107, 0.38)";
  ctx.shadowBlur = 34;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.375, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.78;
  ctx.strokeStyle = "rgba(124, 255, 107, 0.7)";
  ctx.lineWidth = 4;
  drawRoundedRect(ctx, size * 0.105, size * 0.105, size * 0.79, size * 0.79, 68);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = "rgba(255, 244, 231, 0.92)";
  ctx.font = "900 62px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("ANSEMIFIED", size / 2, size * 0.89);

  const ansemifiedUrl = canvas.toDataURL("image/png");
  URL.revokeObjectURL(objectUrl);
  return {
    originalUrl: URL.createObjectURL(file),
    ansemifiedUrl,
    fileName: file.name.replace(/\.[^.]+$/, "") || "pfp"
  };
}

export function AnsemificationApp() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [countdown, setCountdown] = useState(300);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [loadingStep, setLoadingStep] = useState(LOADING_STEPS[0]);
  const [generated, setGenerated] = useState<GeneratedImage | null>(null);
  const [slider, setSlider] = useState(50);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [cursor, setCursor] = useState({ x: 50, y: 18 });

  const dashboardMetrics = useMemo(
    () => [...DASHBOARD_ZEROES, { id: "epoch", label: "Next Reward Epoch", value: formatCountdown(countdown), icon: "⏱" }],
    [countdown]
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown((value) => (value <= 1 ? 300 : value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!processing) return;
    let index = 0;
    setLoadingStep(LOADING_STEPS[index]);
    const timer = window.setInterval(() => {
      index = Math.min(index + 1, LOADING_STEPS.length - 1);
      setLoadingStep(LOADING_STEPS[index]);
    }, 640);
    return () => window.clearInterval(timer);
  }, [processing]);

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setCursor({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100
    });
  };

  const processFile = async (file?: File) => {
    setError("");
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Upload PNG, JPG, or WEBP.");
      return;
    }

    setProcessing(true);
    setGenerated(null);
    try {
      const minimumDelay = new Promise((resolve) => window.setTimeout(resolve, 2600));
      const nextImage = await ansemifyImage(file);
      await minimumDelay;
      setGenerated(nextImage);
      setSlider(50);
    } catch {
      setError("That image could not be processed. Try another one.");
    } finally {
      setProcessing(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    void processFile(event.dataTransfer.files[0]);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    void processFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const downloadImage = () => {
    if (!generated) return;
    const link = document.createElement("a");
    link.href = generated.ansemifiedUrl;
    link.download = `${generated.fileName}-ansemified.png`;
    link.click();
  };

  const copyImage = async () => {
    if (!generated) return;
    try {
      const response = await fetch(generated.ansemifiedUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      await navigator.clipboard.writeText(generated.ansemifiedUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    }
  };

  const shareOnX = () => {
    const text = encodeURIComponent("I just got Ansemified.");
    window.open(`https://x.com/intent/tweet?text=${text}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className="ansem-app"
      style={{ "--cursor-x": `${cursor.x}%`, "--cursor-y": `${cursor.y}%` } as CSSProperties}
      onPointerMove={handlePointerMove}
    >
      <header className="ansem-nav">
        <a className="ansem-brand" href="#top" aria-label="Ansemification home">
          <span className="ansem-logo">A</span>
          <span>Ansemification</span>
        </a>
        <nav className="ansem-nav-links" aria-label="Primary navigation">
          <a href="#upload">Upload</a>
          <a href="#gallery">Gallery</a>
          <a href="#rewards">Rewards</a>
          <a href="#dashboard">Dashboard</a>
        </nav>
      </header>

      <main>
        <section className="ansem-hero" id="top">
          <div className="ansem-hero-copy">
            <span className="ansem-pill"><Sparkles size={16} /> PFP engine online</span>
            <h1>Become Ansem.</h1>
            <p>Upload any profile picture and instantly Ansemify it.</p>
            <div className="ansem-hero-actions">
              <a className="ansem-button primary" href="#upload">Ansemify Your PFP <ArrowRight size={18} /></a>
              <a className="ansem-button secondary" href="#gallery">View Gallery</a>
            </div>
          </div>
        </section>

        <section className="ansem-section ansem-dashboard" id="dashboard" aria-label="Live Ansemification dashboard">
          <div className="ansem-grid-four">
            {dashboardMetrics.map((metric) => (
              <article className="ansem-metric-card" key={metric.id}>
                <span className="metric-icon" aria-hidden="true">{metric.icon}</span>
                <small>{metric.label}</small>
                <strong>{metric.value}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className="ansem-section upload-section" id="upload">
          <div className="section-label">Upload</div>
          <div className="upload-layout">
            <label
              className={`upload-dropzone${dragging ? " is-dragging" : ""}${processing ? " is-processing" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFileChange} />
              {processing ? (
                <div className="upload-processing" role="status" aria-live="polite">
                  <span className="processing-orb" />
                  <strong>{loadingStep}</strong>
                </div>
              ) : (
                <>
                  <UploadCloud size={42} />
                  <strong>Drag image here</strong>
                  <span>or</span>
                  <button className="ansem-button primary" type="button" onClick={() => inputRef.current?.click()}>
                    Choose Image
                  </button>
                  <small>Supported formats: PNG JPG WEBP</small>
                </>
              )}
            </label>
            <div className="upload-copy glass-card">
              <ImagePlus size={28} />
              <h2>Instant PFP ritual.</h2>
              <p>Drop in a profile picture. The app returns a warm, circular, Ansem-coded version ready for the timeline.</p>
              {error ? <span className="upload-error">{error}</span> : null}
            </div>
          </div>
        </section>

        {generated ? (
          <section className="ansem-section result-section" aria-label="Ansemified result">
            <div className="section-label">Result</div>
            <h2>Your PFP is Ansemified.</h2>
            <div className="comparison-card">
              <div className="comparison-slider" style={{ "--split": `${slider}%` } as CSSProperties}>
                <img src={generated.ansemifiedUrl} alt="Ansemified result" />
                <div className="comparison-before">
                  <img src={generated.originalUrl} alt="Original upload" />
                </div>
                <span className="comparison-label left">Original</span>
                <span className="comparison-label right">Ansemified</span>
                <input
                  aria-label="Before and after comparison"
                  type="range"
                  min="0"
                  max="100"
                  value={slider}
                  onChange={(event) => setSlider(Number(event.target.value))}
                />
              </div>
              <div className="result-actions">
                <button className="ansem-button primary" type="button" onClick={downloadImage}><Download size={18} /> Download</button>
                <button className="ansem-button secondary" type="button" onClick={() => void copyImage()}>{copied ? <Check size={18} /> : <Copy size={18} />} Copy</button>
                <button className="ansem-button secondary" type="button" onClick={shareOnX}><Share2 size={18} /> Share on X</button>
                <button className="ansem-button ghost" type="button" onClick={() => setGenerated(null)}><RefreshCcw size={18} /> Generate Another</button>
              </div>
            </div>
          </section>
        ) : null}

        <section className="ansem-section" id="gallery">
          <div className="section-headline">
            <div>
              <div className="section-label">Gallery</div>
              <h2>Recently Ansemified</h2>
            </div>
          </div>
          <div className="empty-panel">No Ansemified PFPs yet.</div>
        </section>

        <section className="ansem-section how-section" id="how">
          <div className="section-label">How it works</div>
          <div className="premium-steps">
            {["Upload any profile picture.", "Our engine Ansemifies your PFP.", "Receive your new profile picture instantly."].map((text, index) => (
              <article className="premium-step" key={text}>
                <span>{index + 1}</span>
                <strong>{text}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className="ansem-section reward-system" id="rewards">
          <div className="section-label">Reward system</div>
          <div className="premium-steps reward-steps">
            {["Hold ANSEM", "Remain Eligible", "Automatic Rewards"].map((text, index) => (
              <article className="premium-step" key={text}>
                <span>{index + 1}</span>
                <strong>{text}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className="ansem-section" id="feed">
          <div className="section-headline">
            <div>
              <div className="section-label">Live reward feed</div>
              <h2>Recent Rewards</h2>
            </div>
          </div>
          <div className="empty-panel">No rewards distributed yet.</div>
        </section>

        <section className="ansem-section about-section" id="about">
          <div className="glass-card about-card">
            <div className="section-label">About</div>
            <p>Ansemification transforms any profile picture into the instantly recognizable Ansem style while building a community around creativity and participation.</p>
          </div>
        </section>
      </main>
    </div>
  );
}

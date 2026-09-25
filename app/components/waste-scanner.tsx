"use client";

import { useEffect, useRef, useState } from "react";
import { Bi, bi, type Message } from "./bi";

type Props = { onClose: () => void };
type ScanResult = { object: string; category: string; categorySi: string; confidence: number; caution?: boolean };
type Prediction = { class: string; score: number };
type CocoModel = { detect: (image: HTMLVideoElement, maxNumBoxes?: number, minScore?: number) => Promise<Prediction[]> };

declare global {
  interface Window {
    tf?: { ready: () => Promise<void> };
    cocoSsd?: { load: (options?: { base?: string }) => Promise<CocoModel> };
  }
}

function loadScript(id: string, source: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing?.dataset.loaded === "true") return resolve();
    const script = existing ?? document.createElement("script");
    script.id = id;
    script.src = source;
    script.async = true;
    script.onload = () => { script.dataset.loaded = "true"; resolve(); };
    script.onerror = () => reject(new Error(`Could not load ${id}`));
    if (!existing) document.head.appendChild(script);
  });
}

let modelPromise: Promise<CocoModel> | null = null;

export function preloadWasteModel() {
  if (modelPromise) return modelPromise;
  modelPromise = (async () => {
    await loadScript("tensorflow-js", "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js");
    await loadScript("coco-ssd", "https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js");
    if (!window.tf || !window.cocoSsd) throw new Error("AI model is unavailable.");
    await window.tf.ready();
    return window.cocoSsd.load({ base: "lite_mobilenet_v2" });
  })().catch((error) => {
    modelPromise = null;
    throw error;
  });
  return modelPromise;
}

const categoryByObject: Record<string, Omit<ScanResult, "object" | "confidence">> = {
  banana: { category: "Organic", categorySi: "කාබනික කසළ" }, apple: { category: "Organic", categorySi: "කාබනික කසළ" }, orange: { category: "Organic", categorySi: "කාබනික කසළ" }, broccoli: { category: "Organic", categorySi: "කාබනික කසළ" }, carrot: { category: "Organic", categorySi: "කාබනික කසළ" }, sandwich: { category: "Organic", categorySi: "කාබනික කසළ" }, pizza: { category: "Organic", categorySi: "කාබනික කසළ" }, donut: { category: "Organic", categorySi: "කාබනික කසළ" }, cake: { category: "Organic", categorySi: "කාබනික කසළ" },
  "cell phone": { category: "E-Waste", categorySi: "ඉලෙක්ට්‍රොනික කසළ" }, laptop: { category: "E-Waste", categorySi: "ඉලෙක්ට්‍රොනික කසළ" }, keyboard: { category: "E-Waste", categorySi: "ඉලෙක්ට්‍රොනික කසළ" }, mouse: { category: "E-Waste", categorySi: "ඉලෙක්ට්‍රොනික කසළ" }, remote: { category: "E-Waste", categorySi: "ඉලෙක්ට්‍රොනික කසළ" }, tv: { category: "E-Waste", categorySi: "ඉලෙක්ට්‍රොනික කසළ" }, toaster: { category: "E-Waste", categorySi: "ඉලෙක්ට්‍රොනික කසළ" }, microwave: { category: "E-Waste", categorySi: "ඉලෙක්ට්‍රොනික කසළ" }, oven: { category: "E-Waste", categorySi: "ඉලෙක්ට්‍රොනික කසළ" }, refrigerator: { category: "E-Waste", categorySi: "ඉලෙක්ට්‍රොනික කසළ" },
  book: { category: "Paper & Cardboard", categorySi: "කඩදාසි සහ කාඩ්බෝඩ්" },
  scissors: { category: "Metal", categorySi: "ලෝහ" }, fork: { category: "Metal", categorySi: "ලෝහ" }, knife: { category: "Metal", categorySi: "ලෝහ" }, spoon: { category: "Metal", categorySi: "ලෝහ" },
  bottle: { category: "Plastic or Glass", categorySi: "ප්ලාස්ටික් හෝ වීදුරු", caution: true }, cup: { category: "Plastic or Glass", categorySi: "ප්ලාස්ටික් හෝ වීදුරු", caution: true },
};

export default function WasteScanner({ onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const busyRef = useRef(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "scanning" | "error">("idle");
  const [message, setMessage] = useState<Message | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);

  function stopScanner() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  useEffect(() => {
    void preloadWasteModel().catch(() => undefined);
    closeRef.current?.focus();
    return stopScanner;
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      stopScanner();
      onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function startScanner() {
    setStatus("loading");
    setMessage({ si: "Camera එක විවෘත කරමින් AI model එක load කරමින්...", en: "Opening the camera and loading the AI model..." });
    setResult(null);
    try {
      const pendingModel = preloadWasteModel();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamRef.current = stream;
      if (!videoRef.current) throw new Error("Camera preview is unavailable.");
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      const model = await pendingModel;
      setStatus("scanning");
      setMessage({ si: "එක භාණ්ඩයක් කොටුව ඇතුළේ අල්ලන්න. ස්වයංක්‍රීයව scan වෙමින්...", en: "Hold one item inside the frame. Scanning automatically..." });
      timerRef.current = setInterval(async () => {
        if (busyRef.current || !videoRef.current || videoRef.current.readyState < 2) return;
        busyRef.current = true;
        try {
          const predictions = await model.detect(videoRef.current, 6, 0.35);
          const match = predictions.filter((prediction) => categoryByObject[prediction.class]).sort((a, b) => b.score - a.score)[0];
          if (match) setResult({ object: match.class, confidence: Math.round(match.score * 100), ...categoryByObject[match.class] });
        } finally {
          busyRef.current = false;
        }
      }, 450);
    } catch (error) {
      stopScanner();
      setStatus("error");
      const denied = error instanceof DOMException && error.name === "NotAllowedError";
      setMessage(
        denied
          ? { si: "Camera එකට අවසර ලැබුණේ නැහැ. අවසර දී නැවත උත්සාහ කරන්න.", en: "Camera permission was not allowed. Allow the camera and try again." }
          : { si: "මෙම උපාංගයේ camera scanner එක ආරම්භ කළ නොහැක.", en: "The camera scanner could not start on this device." },
      );
    }
  }

  function close() {
    stopScanner();
    onClose();
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={(event) => event.target === event.currentTarget && close()}>
      <div className="modal scanner" role="dialog" aria-modal="true" aria-labelledby="scanner-title">
        <button ref={closeRef} type="button" className="modal__close" aria-label={bi("වසන්න", "Close")} onClick={close}>
          ✕
        </button>
        <h2 id="scanner-title" className="modal__title">
          <Bi stack si="ඔබේ කසළ Scan කරන්න" en="Scan your waste" />
        </h2>
        <div className="scanner__camera">
          <video ref={videoRef} muted playsInline aria-label={bi("සජීවී camera දසුන", "Live camera preview")} />
          <span className="scanner__frame" aria-hidden="true"></span>
          {status === "idle" && (
            <div className="scanner__placeholder">
              <span aria-hidden="true">📷</span>
              <Bi si="Camera එක off" en="Camera is off" />
            </div>
          )}
        </div>
        {status === "idle" ? (
          <button type="button" className="btn btn--primary btn--block" onClick={startScanner}>
            <Bi si="Camera එක අරඹන්න" en="Start camera" />
          </button>
        ) : (
          message && (
            <p className={`scanner__status scanner__status--${status}`} role="status">
              <Bi stack si={message.si} en={message.en} />
            </p>
          )
        )}
        {result && (
          <div className="scanner__result" role="status">
            <small>
              {result.object} · {result.confidence}%
            </small>
            <Bi as="strong" stack si={result.categorySi} en={result.category} />
            {result.caution && (
              <Bi
                as="p"
                stack
                si="ද්‍රව්‍යය බලන්න: model එකට බෝතලය හඳුනාගත හැකි නමුත් ප්ලාස්ටික් ද වීදුරු ද කියා නිවැරදිව වෙන් කළ නොහැක."
                en="Check the material: the model can see a bottle or cup, but cannot reliably tell plastic from glass."
              />
            )}
          </div>
        )}
        {status === "error" && (
          <button type="button" className="btn btn--secondary btn--block" onClick={startScanner}>
            <Bi si="නැවත උත්සාහ කරන්න" en="Try again" />
          </button>
        )}
        <Bi as="p" stack className="scanner__privacy" si="🔒 Camera දසුන ඔබේ browser එක තුළම පරීක්ෂා කරයි. පින්තූර upload කරන්නේ නැහැ." en="The camera is analysed in your browser. Images are never uploaded." />
      </div>
    </div>
  );
}

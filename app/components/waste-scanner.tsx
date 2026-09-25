"use client";

import { useEffect, useRef, useState } from "react";

type Props = { language: "en" | "si"; onClose: () => void };
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

const categoryByObject: Record<string, Omit<ScanResult, "object" | "confidence">> = {
  banana: { category: "Organic Waste", categorySi: "කාබනික කසළ" }, apple: { category: "Organic Waste", categorySi: "කාබනික කසළ" }, orange: { category: "Organic Waste", categorySi: "කාබනික කසළ" }, broccoli: { category: "Organic Waste", categorySi: "කාබනික කසළ" }, carrot: { category: "Organic Waste", categorySi: "කාබනික කසළ" }, sandwich: { category: "Organic Waste", categorySi: "කාබනික කසළ" }, pizza: { category: "Organic Waste", categorySi: "කාබනික කසළ" }, donut: { category: "Organic Waste", categorySi: "කාබනික කසළ" }, cake: { category: "Organic Waste", categorySi: "කාබනික කසළ" },
  "cell phone": { category: "E-Waste", categorySi: "ඉලෙක්ට්‍රොනික කසළ" }, laptop: { category: "E-Waste", categorySi: "ඉලෙක්ට්‍රොනික කසළ" }, keyboard: { category: "E-Waste", categorySi: "ඉලෙක්ට්‍රොනික කසළ" }, mouse: { category: "E-Waste", categorySi: "ඉලෙක්ට්‍රොනික කසළ" }, remote: { category: "E-Waste", categorySi: "ඉලෙක්ට්‍රොනික කසළ" }, tv: { category: "E-Waste", categorySi: "ඉලෙක්ට්‍රොනික කසළ" }, toaster: { category: "E-Waste", categorySi: "ඉලෙක්ට්‍රොනික කසළ" }, microwave: { category: "E-Waste", categorySi: "ඉලෙක්ට්‍රොනික කසළ" }, oven: { category: "E-Waste", categorySi: "ඉලෙක්ට්‍රොනික කසළ" }, refrigerator: { category: "E-Waste", categorySi: "ඉලෙක්ට්‍රොනික කසළ" },
  book: { category: "Paper & Cardboard", categorySi: "කඩදාසි සහ කාඩ්බෝඩ්" },
  scissors: { category: "Metal", categorySi: "ලෝහ" }, fork: { category: "Metal", categorySi: "ලෝහ" }, knife: { category: "Metal", categorySi: "ලෝහ" }, spoon: { category: "Metal", categorySi: "ලෝහ" },
  bottle: { category: "Plastic / Glass", categorySi: "ප්ලාස්ටික් / වීදුරු", caution: true }, cup: { category: "Plastic / Glass", categorySi: "ප්ලාස්ටික් / වීදුරු", caution: true },
};

export default function WasteScanner({ language, onClose }: Props) {
  const isSi = language === "si";
  const t = (english: string, sinhala: string) => isSi ? sinhala : english;
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const busyRef = useRef(false);
  const [status, setStatus] = useState<"idle" | "loading" | "scanning" | "error">("idle");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);

  function stopScanner() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  useEffect(() => stopScanner, []);

  async function startScanner() {
    setStatus("loading");
    setMessage(t("Opening camera and loading the free AI model...", "Camera එක අරිමින් free AI model එක load කරමින්..."));
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamRef.current = stream;
      if (!videoRef.current) throw new Error("Camera preview is unavailable.");
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      await loadScript("tensorflow-js", "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js");
      await loadScript("coco-ssd", "https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js");
      if (!window.tf || !window.cocoSsd) throw new Error("AI model is unavailable.");
      await window.tf.ready();
      const model = await window.cocoSsd.load({ base: "lite_mobilenet_v2" });
      setStatus("scanning");
      setMessage(t("Hold one item inside the box. Scanning automatically...", "එක භාණ්ඩයක් කොටුව ඇතුළේ අල්ලන්න. Automatically scan වෙමින්..."));
      timerRef.current = setInterval(async () => {
        if (busyRef.current || !videoRef.current || videoRef.current.readyState < 2) return;
        busyRef.current = true;
        try {
          const predictions = await model.detect(videoRef.current, 8, 0.42);
          const match = predictions.filter((prediction) => categoryByObject[prediction.class]).sort((a, b) => b.score - a.score)[0];
          if (match) setResult({ object: match.class, confidence: Math.round(match.score * 100), ...categoryByObject[match.class] });
        } finally { busyRef.current = false; }
      }, 900);
    } catch (error) {
      stopScanner();
      setStatus("error");
      const denied = error instanceof DOMException && error.name === "NotAllowedError";
      setMessage(denied ? t("Camera permission was not allowed. Please allow the camera and try again.", "Camera permission ලබාදී නැහැ. Camera එකට අවසර දී නැවත උත්සාහ කරන්න.") : t("The camera scanner could not start on this device.", "මෙම device එකේ camera scanner එක ආරම්භ කළ නොහැක."));
    }
  }

  function close() { stopScanner(); onClose(); }

  return <div className="waste-guide-backdrop" role="presentation"><div className="waste-guide scanner-dialog" role="dialog" aria-modal="true" aria-labelledby="scanner-title"><button type="button" className="waste-guide-close" aria-label={t("Close scanner", "Scanner එක වසන්න")} onClick={close}>×</button><h3 id="scanner-title">📷 {t("Scan Your Waste", "ඔබේ කසළ Scan කරන්න")}</h3><p>{t("Point the camera at one item. No photo upload is needed.", "එක භාණ්ඩයකට camera එක අල්ලන්න. Photo upload කරන්න අවශ්‍ය නැහැ.")}</p><div className="scanner-camera"><video ref={videoRef} muted playsInline aria-label={t("Live camera preview", "සජීවී camera දසුන")}/><span className="scanner-frame"></span>{status === "idle" && <div className="scanner-placeholder">♻️<small>{t("Camera is off", "Camera එක off")}</small></div>}</div>{status === "idle" ? <button type="button" className="scanner-start" onClick={startScanner}>📷 {t("Start Camera Scan", "Camera Scan එක අරඹන්න")}</button> : <div className={`scanner-status ${status}`} role="status"><i></i>{message}</div>}{result && <div className="scanner-result" role="status"><span>✓</span><div><small>{t(`Detected: ${result.object} · ${result.confidence}% confidence`, `හඳුනාගත්තේ: ${result.object} · විශ්වාසය ${result.confidence}%`)}</small><b>{isSi ? result.categorySi : result.category}</b>{result.caution && <p>{t("Check the material: the free model can see a bottle or cup, but cannot reliably separate plastic from glass.", "ද්‍රව්‍යය බලන්න: free model එකට බෝතලය හඳුනාගත හැකි නමුත් plastic සහ glass නිවැරදිව වෙන් කරන්න බැහැ.")}</p>}</div></div>}{status === "error" && <button type="button" className="scanner-retry" onClick={startScanner}>{t("Try Again", "නැවත උත්සාහ කරන්න")}</button>}<small className="scanner-privacy">🔒 {t("The camera is analysed in your browser. Images are not uploaded.", "Camera දසුන browser එක තුළම පරීක්ෂා කරයි. Images upload කරන්නේ නැහැ.")}</small></div></div>;
}

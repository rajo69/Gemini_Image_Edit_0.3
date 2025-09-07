'use client';

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform, useScroll } from "framer-motion";

/*
  Gemini 2.5 Flash Image – Single‑Page React App (Safety‑aware + Professional UX)
  ------------------------------------------------------------------------------
  • Large canvas (>= 70vh) + reactive background + parallax
  • Upload / drag‑drop; auto‑show Download once image exists
  • Prompt box + “Magic” button (Enter submits)
  • Backend: Vercel route /api/gemini/edit (POST + OPTIONS + GET)
      – sends generationConfig: { response_mime_type: "image/png" }
      – surfaces SAFETY blocks as { errorCode: 'SAFETY', errorMessage }
  • Client: robust error handling, pre‑moderation to avoid unsafe calls,
    professional banner with suggestions, and direct Gemini fallback for preview
  • Extra tests for safety parsing + moderation
*/

// ---------------------------------
// UI Primitives
// ---------------------------------
function Button({ className = "", variant = "primary", ...props }: any) {
  const base =
    "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium shadow-sm transition active:scale-[.99] focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variants: any = {
    primary: "bg-black/80 text-white backdrop-blur hover:bg-black hover:shadow-md focus:ring-black/30",
    primaryLight: "bg-white text-black hover:bg-white shadow-md border border-black/10",
    subtle: "bg-white/30 text-slate-900 hover:bg-white/50 backdrop-blur border border-white/50",
    subtleDark: "bg-zinc-900/60 text-white hover:bg-zinc-900/80 border border-white/10 backdrop-blur",
    ghost: "bg-white/50 text-slate-900 hover:bg-white/70 backdrop-blur border border-white/60",
    ghostDark: "bg-zinc-900/40 text-white hover:bg-zinc-900/60 border border-white/20 backdrop-blur",
  };
  return <button className={`${base} ${variants[variant] || ""} ${className}`} {...props} />;
}

function IconButton(props: any) {
  return (
    <Button aria-label={props["aria-label"]} variant="primary" className="p-2 rounded-2xl h-10 w-10 items-center justify-center !px-2" {...props} />
  );
}

function AutoGrowTextarea({ className = "", value, onChange, onKeyDown, onHeightChange, minLines = 1, maxLines = 2, style = {}, ...props }: any) {
  const ref = React.useRef<HTMLTextAreaElement | null>(null);
  const [height, setHeight] = React.useState(46);
  React.useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    el.style.height = 'auto';
    const styles = window.getComputedStyle(el);
    const line = parseFloat(styles.lineHeight) || 20;
    const pad = (parseFloat(styles.paddingTop) || 0) + (parseFloat(styles.paddingBottom) || 0);
    const minH = Math.ceil(line * Math.max(1, minLines) + pad);
    const maxH = Math.ceil(line * Math.max(minLines, maxLines) + pad);
    const next = Math.max(minH, Math.min(el.scrollHeight, maxH));
    setHeight(next);
    onHeightChange && onHeightChange(next);
  }, [value, minLines, maxLines, onHeightChange]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      style={{ ...style, height }}
      className={
        "w-full rounded-2xl border bg-white/60 border-white/40 backdrop-blur p-3 leading-6 text-slate-900 placeholder-slate-600 shadow-inner focus:outline-none focus:ring-2 focus:ring-black/20 resize-none no-scrollbar overflow-y-auto " +
        className
      }
      {...props}
    />
  );
}

// ---------------------------------
// Icons
// ---------------------------------
const Svg = ({ className = "h-5 w-5", children, ...props }: any) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
);

function ImageIcon(props: any) {
  return (
    <Svg {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10.5" r="1.5" />
      <path d="M21 17l-6-6-4 4-5-5" />
    </Svg>
  );
}

function DownloadIcon(props: any) {
  return (
    <Svg {...props}>
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M4 21h16" />
    </Svg>
  );
}

function MagicWandIcon(props: any) {
  return (
    <Svg {...props}>
      <path d="M3 21l9-9" />
      <path d="M12.5 7.5l4-4" />
      <path d="M14 10l6-6" />
      <path d="M8 2l0 3" />
      <path d="M2 8l3 0" />
      <path d="M20 10l0 3" />
      <path d="M10 20l3 0" />
      <path d="M5 19l2 2" />
    </Svg>
  );
}

function SunIcon(props: any) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Svg>
  );
}
function MoonIcon(props: any) {
  return (
    <Svg {...props}>
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </Svg>
  );
}

function RadiateIcon({ className = "h-5 w-5" }: any) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect x="0" y="0" width="24" height="24" fill="#ffffff" />
      <circle cx="12" cy="12" r="3" fill="#000000" />
      <g stroke="#000000" strokeWidth="2" strokeLinecap="round">
        <line x1="12" y1="1" x2="12" y2="6" />
        <line x1="12" y1="18" x2="12" y2="23" />
        <line x1="1" y1="12" x2="6" y2="12" />
        <line x1="18" y1="12" x2="23" y2="12" />
        <line x1="4.2" y1="4.2" x2="7.8" y2="7.8" />
        <line x1="16.2" y1="16.2" x2="19.8" y2="19.8" />
        <line x1="4.2" y1="19.8" x2="7.8" y2="16.2" />
        <line x1="16.2" y1="7.8" x2="19.8" y2="4.2" />
      </g>
    </svg>
  );
}

// ---------------------------------
// Utils & Gemini helpers
// ---------------------------------
const GLOW_RGB = "132,0,255"; // Magic Bento purple

// Dev fallback key (client-only). For production, prefer server route.
const DEV_GEMINI_FALLBACK_KEY = (typeof window !== 'undefined' ? (localStorage.getItem('GEMINI_API_KEY') || '') : '');

class AppError extends Error { code?: string; constructor(message: string, code?: string) { super(message); this.code = code; } }
const isSafetyError = (err: any) => Boolean(err && (err.code === 'SAFETY' || /SAFETY|block/i.test(String(err.message))));

const SENSITIVE_WORDS = [
  'nude','naked','nsfw','porn','xxx','erotic','fetish','sexual','intercourse','blowjob','handjob','cum',
  'boob','boobs','breast','breasts','areola','nipple','tits','ass','butt','penis','vagina','anal'
];
function sanitizeForPreview(text: string) {
  if (!text) return '';
  let out = text;
  for (const w of SENSITIVE_WORDS) {
    try { out = out.replace(new RegExp(`\\\\b${w}\\\\b`, 'gi'), '•••'); } catch (e) {}
  }
  return out;
}
function preModerate(prompt: string) {
  if (!prompt) return { allowed: true };
  const lower = prompt.toLowerCase();
  for (const w of SENSITIVE_WORDS) {
    if (lower.includes(w)) {
      return { blocked: true, reason: 'sexual' };
    }
  }
  return { allowed: true };
}

function useWindowSize() {
  const [size, setSize] = useState({ width: typeof window !== 'undefined' ? window.innerWidth : 0, height: typeof window !== 'undefined' ? window.innerHeight : 0 });
  useEffect(() => {
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return size;
}

function usePointerParallax() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 100, damping: 20, mass: 0.5 });
  const springY = useSpring(y, { stiffness: 100, damping: 20, mass: 0.5 });
  const rotateX = useTransform(springY, [-40, 40], [6, -6]);
  const rotateY = useTransform(springX, [-40, 40], [-6, 6]);
  const onMove = (e: any) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX ?? (e.touches?.[0]?.clientX || rect.width / 2)) - rect.left;
    const py = (e.clientY ?? (e.touches?.[0]?.clientY || rect.height / 2)) - rect.top;
    x.set((px - rect.width / 2) / 6);
    y.set((py - rect.height / 2) / 6);
  };
  const onLeave = () => { x.set(0); y.set(0); };
  return { rotateX, rotateY, onMove, onLeave, springX, springY };
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.matchMedia('(max-width: 640px)').matches : false));
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(max-width: 640px)');
    const handler = (e: any) => setIsMobile(e.matches);
    try { mql.addEventListener('change', handler); } catch { mql.addListener(handler); }
    return () => { try { mql.removeEventListener('change', handler); } catch { mql.removeListener(handler); } };
  }, []);
  return isMobile;
}

// Canvas draw helper
function drawContain(ctx: CanvasRenderingContext2D, img: HTMLImageElement, canvas: HTMLCanvasElement) {
  const cw = canvas.width; const ch = canvas.height;
  const iw = img.naturalWidth || (img as any).width; const ih = img.naturalHeight || (img as any).height;
  const scale = Math.min(cw / iw, ch / ih);
  const dw = iw * scale; const dh = ih * scale;
  const dx = (cw - dw) / 2; const dy = (ch - dh) / 2;
  (ctx as any).clearRect(0, 0, cw, ch);
  (ctx as any).imageSmoothingEnabled = true; (ctx as any).imageSmoothingQuality = "high";
  (ctx as any).drawImage(img, dx, dy, dw, dh);
}

// Local filter fallback (safe-guarded)
async function applyLocalFilterToDataUrl(dataUrl: string, prompt: string) {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error('Failed to load image for local filter'));
    i.src = dataUrl;
  });
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const kw = (prompt || "").toLowerCase();
  try {
    if (kw.includes("grayscale") || kw.includes("black and white") || kw.includes("b&w")) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i], g = imageData.data[i + 1], b = imageData.data[i + 2];
        const v = 0.299 * r + 0.587 * g + 0.114 * b;
        imageData.data[i] = imageData.data[i + 1] = imageData.data[i + 2] = v;
      }
      ctx.putImageData(imageData, 0, 0);
    } else if (kw.includes("invert") || kw.includes("negative")) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i] = 255 - imageData.data[i];
        imageData.data[i + 1] = 255 - imageData.data[i + 1];
        imageData.data[i + 2] = 255 - imageData.data[i + 2];
      }
      ctx.putImageData(imageData, 0, 0);
    } else if (kw.includes("blur") || kw.includes("bokeh")) {
      const tmp = document.createElement("canvas");
      tmp.width = Math.max(1, Math.round(canvas.width / 4));
      tmp.height = Math.max(1, Math.round(canvas.height / 4));
      const tctx = tmp.getContext("2d")!;
      tctx.imageSmoothingEnabled = true;
      tctx.drawImage(canvas, 0, 0, tmp.width, tmp.height);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(tmp, 0, 0, tmp.width, tmp.height, 0, 0, canvas.width, canvas.height);
    } else {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i] = Math.min(255, imageData.data[i] * 1.06);
        imageData.data[i + 1] = Math.min(255, imageData.data[i + 1] * 1.03);
        imageData.data[i + 2] = Math.min(255, imageData.data[i + 2] * 1.03);
      }
      ctx.putImageData(imageData, 0, 0);
    }
  } catch (e) {
    console.warn('[Local filter] processing failed, returning original', e);
  }
  return canvas.toDataURL("image/png");
}

// --- Networking helpers ---
async function fetchWithTimeout(url: string, options: any = {}, ms = 30000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const resp = await fetch(url, { ...options, signal: controller.signal });
    return resp;
  } finally { clearTimeout(id); }
}
async function safeJson(resp: Response) { try { return await resp.json(); } catch { return null; } }

function parseGeminiImageFromCandidates(data: any) {
  const partsOut = data?.candidates?.[0]?.content?.parts || [];
  const imagePart = partsOut.find((p: any) => p.inlineData || p.inline_data);
  return imagePart?.inlineData?.data || imagePart?.inline_data?.data || null;
}
function extractSafetyFromGemini(data: any) {
  const fb = data?.promptFeedback;
  if (fb?.blockReason) return { code: 'SAFETY', message: `Prompt blocked: ${fb.blockReason}` };
  const cand0 = data?.candidates?.[0];
  if (cand0?.finishReason === 'SAFETY') return { code: 'SAFETY', message: 'Prompt blocked by safety system' };
  return null;
}
async function dataUrlToBlob(dataUrl: string) {
  const res = await fetch(dataUrl); return await res.blob();
}

// Direct Gemini call (preview fallback). Ensures response_mime_type=image/png
async function callGeminiDirect({ prompt, model, imageDataUrl, apiKey }: any) {
  if (!apiKey) throw new AppError('Missing API key for direct Gemini call', 'CONFIG');
  const parts: any[] = [{ text: prompt || '' }];
  if (imageDataUrl) {
    const blob = await dataUrlToBlob(imageDataUrl);
    const buf = await blob.arrayBuffer();
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    parts.push({ inline_data: { mime_type: blob.type || 'image/png', data: b64 } });
  }
  const payload = { contents: [{ parts }], generationConfig: { response_mime_type: 'image/png' } };
  const resp = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST', headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' }, body: JSON.stringify(payload), cache: 'no-store'
  }, 45000);

  const data = await resp.json().catch(() => ({}));
  const safety = extractSafetyFromGemini(data);
  if (safety) throw new AppError(safety.message, safety.code);
  if (!resp.ok) throw new AppError(String(data?.error || await resp.text()), 'NETWORK');

  const imageBase64 = parseGeminiImageFromCandidates(data);
  if (!imageBase64) throw new AppError('Model returned no image', 'NO_IMAGE');
  return imageBase64;
}

// Try multiple API route candidates; return JSON or throw
async function callBackendWithFallbacks({ body, backendUrl }: any) {
  const list = buildBackendCandidates(backendUrl);
  let lastErr: any;
  for (const url of list) {
    try {
      const resp = await fetchWithTimeout(url, { method: "POST", body, cache: 'no-store' }, 45000);
      const json = await safeJson(resp);
      if (json?.errorCode === 'SAFETY') throw new AppError(json?.errorMessage || 'Prompt blocked', 'SAFETY');
      if (resp.ok && (json as any)?.imageBase64) return json;
      lastErr = new AppError(`${resp.status} at ${url}`, 'NETWORK');
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new AppError('Backend unreachable', 'NETWORK');
}
function buildBackendCandidates(primary: string) {
  const base = (primary || "").trim() || "/api/gemini/edit";
  const trimmed = base.endsWith("/") ? base.slice(0, -1) : base;
  const candidates = [ trimmed, `${trimmed}/route`, "/api/gemini/edit", "/api/gemini-edit", "/api/gemini", "/api/edit" ];
  return [...new Set(candidates)];
}

// ---------------------------------
// Main App
// ---------------------------------
export default function App() {
  const { height } = useWindowSize();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [prompt, setPrompt] = useState("");
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null);
  const [currentImageDataUrl, setCurrentImageDataUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [backendUrl] = useState("/api/gemini/edit");
  const [apiKey] = useState("");
  const [model] = useState("gemini-2.5-flash-image-preview");
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [inputH, setInputH] = useState(46);

  useEffect(() => { try { localStorage.setItem('theme', isDark ? 'dark' : 'light'); } catch (e) {} }, [isDark]);

  const isMobile = useIsMobile();
  const { rotateX, rotateY, onMove, onLeave, springX, springY } = usePointerParallax();
  const { scrollY } = useScroll();
  const bgScrollX = useTransform(scrollY, [0, 1000], [0, 50]);
  const bgScrollY = useTransform(scrollY, [0, 1000], [0, -80]);
  const blob1X = useTransform([springX, bgScrollX] as any, ([a, b]: any) => a + b);
  const blob1Y = useTransform([springY, bgScrollY] as any, ([a, b]: any) => a + b);
  const blob2X = useTransform([springX, bgScrollX] as any, ([a, b]: any) => -a + b * 0.6);
  const blob2Y = useTransform([springY, bgScrollY] as any, ([a, b]: any) => -b * 0.8);
  const glareX = useTransform(springX, [-40, 40], [-80, 80]);
  const glareY = useTransform(springY, [-40, 40], [-80, 80]);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext("2d")!;
    function draw(dataUrl: string) { const img = new Image(); img.onload = () => drawContain(ctx, img, canvas); (img as any).src = dataUrl; }
    const resize = () => {
      const dpr = window.devicePixelRatio || 1; const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr); canvas.height = Math.floor(rect.height * dpr);
      (ctx as any).setTransform(dpr, 0, 0, dpr, 0, 0);
      if (currentImageDataUrl) draw(currentImageDataUrl); else {
        (ctx as any).clearRect(0, 0, canvas.width, canvas.height);
        const g = (ctx as any).createLinearGradient(0, 0, canvas.width, canvas.height);
        if (isDark) { g.addColorStop(0, "#0b0b13"); g.addColorStop(1, "#141428"); }
        else { g.addColorStop(0, "#ffffff"); g.addColorStop(1, "#f2f2f2"); }
        (ctx as any).fillStyle = g; (ctx as any).fillRect(0,0,canvas.width,canvas.height);
        (ctx as any).strokeStyle = isDark ? "#ffffff10" : "#00000010"; (ctx as any).lineWidth = 1;
        for (let x = 40; x < canvas.width; x += 40) { (ctx as any).beginPath(); (ctx as any).moveTo(x,0); (ctx as any).lineTo(x,canvas.height); (ctx as any).stroke(); }
        for (let y = 40; y < canvas.height; y += 40) { (ctx as any).beginPath(); (ctx as any).moveTo(0,y); (ctx as any).lineTo(canvas.width,y); (ctx as any).stroke(); }
      }
    };
    resize(); const ro = new (window as any).ResizeObserver(resize); ro.observe(canvas); return () => ro.disconnect();
  }, [currentImageDataUrl, isDark]);

  // Upload
  const onFile = async (file: File | undefined | null) => {
    if (!file) return; if (!file.type.startsWith("image/")) { alert("Please pick an image file."); return; }
    if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
    const url = URL.createObjectURL(file); setImageObjectUrl(url);
    const dataUrl: any = await new Promise((resolve) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.readAsDataURL(file); });
    setCurrentImageDataUrl(dataUrl);
  };

  // Core
  const runEdit = async () => {
    if (!prompt.trim() && !currentImageDataUrl) return;
    setNotice("");
    setIsLoading(true);
    try {
      const body = new FormData();
      const effectivePrompt = (prompt && prompt.trim()) || (currentImageDataUrl ? "Enhance the image naturally: denoise, slightly sharpen, balance exposure and color." : "");

      // Pre‑moderate to avoid unsafe calls
      const mod = preModerate(effectivePrompt);
      if (mod.blocked) {
        setIsLoading(false);
        setNotice('This request contains explicit sexual content, which this demo cannot generate. Try a non‑explicit description or a different subject. Example: "A photorealistic ice‑cream sundae" or "a small bird called a tit perched on a branch".');
        return;
      }

      body.append("prompt", effectivePrompt); body.append("model", model); if (apiKey) body.append("apiKey", apiKey);
      if (currentImageDataUrl) { const blob = await (await fetch(currentImageDataUrl)).blob(); body.append("image", blob, "input.png"); }

      let imageBase64: string | null = null;
      // 1) backend route
      try {
        const json: any = await callBackendWithFallbacks({ body, backendUrl });
        imageBase64 = json?.imageBase64 || null;
      } catch (e: any) {
        if (isSafetyError(e)) { throw e; } // bubble up safety
        console.warn('[Backend failed] falling back to direct Gemini', e);
      }

      // 2) direct gemini (preview fallback)
      if (!imageBase64 && DEV_GEMINI_FALLBACK_KEY) {
        try {
          imageBase64 = await callGeminiDirect({ prompt: effectivePrompt, model, imageDataUrl: currentImageDataUrl || null, apiKey: DEV_GEMINI_FALLBACK_KEY });
        } catch (e2: any) {
          if (isSafetyError(e2)) throw e2; // bubble safety up
          console.warn('[Direct Gemini failed]', e2);
        }
      }

      if (!imageBase64) throw new AppError('No image from backend or direct Gemini', 'NO_IMAGE');
      setCurrentImageDataUrl(`data:image/png;base64,${imageBase64}`);
    } catch (err: any) {
      console.error('[Edit error]', err);
      if (isSafetyError(err)) {
        setNotice(String(err.message || 'Prompt blocked by safety system'));
      } else {
        try {
          if (currentImageDataUrl) {
            const fallback = await applyLocalFilterToDataUrl(currentImageDataUrl, prompt);
            setCurrentImageDataUrl(fallback);
          } else {
            const ph = await generatePlaceholderFromPrompt(sanitizeForPreview(prompt) || 'New image');
            setCurrentImageDataUrl(ph);
          }
        } catch (e3) { console.warn('[Fallback failed]', e3); }
        setNotice("We couldn't reach Gemini right now. A local placeholder/filter was applied. Once your /api route or API key is configured, Magic will use Gemini.");
      }
    } finally { setIsLoading(false); }
  };

  const onDrop = (e: any) => { e.preventDefault(); const file = e.dataTransfer.files?.[0]; onFile(file); };
  const onChooseFile = () => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.onchange = () => onFile((input as any).files?.[0]); input.click(); };
  const onDownload = () => { if (!currentImageDataUrl) return; const a = document.createElement('a'); a.href = currentImageDataUrl; a.download = `canvas-image-${Date.now()}.png`; a.click(); };
  const onKeyDown = (e: any) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runEdit(); } };

  const canvasHeight = useMemo(() => Math.max(height * 0.72, 420), [height]);

  // Self-tests
  useEffect(() => {
    (async () => {
      try {
        // Test 1: placeholder
        const p = await generatePlaceholderFromPrompt('hello world');
        if (!(typeof p === 'string' && p.startsWith('data:image/png'))) throw new Error('Placeholder test failed');
        // Test 2: wrapText
        const c = document.createElement('canvas'); const ctx = c.getContext('2d')!; (ctx as any).font = '16px sans-serif';
        wrapText(ctx as any, 'This is a long line that should wrap without errors.', 0, 16, 100, 16);
        // Test 3: backend candidates unique
        const cand = buildBackendCandidates('/api/gemini/edit');
        if (!Array.isArray(cand) || cand.length < 3 || new Set(cand).size !== cand.length) throw new Error('Backend candidates test failed');
        // Test 4: image parser mock
        const mock = { candidates: [{ content: { parts: [{ inline_data: { data: 'abc' } }] } }] };
        if (parseGeminiImageFromCandidates(mock as any) !== 'abc') throw new Error('Parser test failed');
        // Test 5: safety extraction
        const s = extractSafetyFromGemini({ promptFeedback: { blockReason: 'SAFETY' } } as any);
        if (!s || (s as any).code !== 'SAFETY') throw new Error('Safety parse failed');
        // Test 6: pre‑moderation catches adult term
        if (!(preModerate('draw boobs') as any).blocked) throw new Error('Premoderation failed');
        console.log('[QA] In-app tests passed ✓');
      } catch (e) { console.warn('[QA] In-app tests failed:', e); }
    })();
  }, []);

  const bgStyle = isDark
    ? { background: "radial-gradient(900px 600px at 20% 10%, rgba(20,20,35,.6), transparent), radial-gradient(1000px 700px at 80% 30%, rgba(18,18,28,.6), transparent), linear-gradient(120deg, #0b0b13, #101022 60%, #0c1b2a)" }
    : { background: "radial-gradient(800px 500px at 10% 10%, rgba(255,255,255,.8), transparent), radial-gradient(900px 600px at 90% 30%, rgba(255,255,255,.6), transparent), linear-gradient(120deg, #f9fafb, #eef2ff 60%, #e0f2fe)" };

  return (
    <div className={`relative min-h-screen overflow-hidden ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
      {/* Global styles to hide textarea scrollbar */}
      <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{scrollbar-width:none;-ms-overflow-style:none}`}</style>
      <motion.div aria-hidden className="pointer-events-none fixed inset-0 -z-10" style={bgStyle} />

      {/* background blobs */}
      <motion.div className={`fixed -top-24 -left-24 h-[40vmax] w-[40vmax] rounded-full blur-3xl -z-10 ${isDark ? 'bg-purple-500/20' : 'bg-indigo-200/40'}`} />
      <motion.div className={`fixed -bottom-24 -right-24 h-[40vmax] w-[40vmax] rounded-full blur-3xl -z-10 ${isDark ? 'bg-cyan-500/20' : 'bg-cyan-200/40'}`} />

      {/* Top bar */}
      <div className="mx-auto max-w-6xl px-4 pt-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`h-9 w-9 rounded-2xl grid place-items-center shadow-md border ${isDark ? 'bg-white text-black border-white/10' : 'bg-white text-black border-black/10'}`}>
            <RadiateIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold leading-5">Gemini Image Chat</div>
            <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Powered by Gemini 2.5 Flash Image (preview)</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={isDark ? 'subtleDark' : 'subtle'} aria-label="Toggle dark mode" onClick={() => setIsDark(v => !v)}>
            {isDark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
            <span className="hidden sm:inline">{isDark ? 'Light' : 'Dark'}</span>
          </Button>
        </div>
      </div>

      {/* Safety / info banner */}
      {notice && (
        <div className="mx-auto max-w-6xl px-4 mt-4">
          <div className={`rounded-xl border px-4 py-3 text-sm ${isDark ? 'bg-rose-900/30 border-rose-500/30 text-rose-200' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
            {notice}
          </div>
        </div>
      )}

      {/* Canvas card */}
      <motion.div className="mx-auto max-w-6xl px-4 mt-6" onPointerMove={onMove} onPointerLeave={onLeave}>
        <motion.div style={{ rotateX, rotateY }} className={`relative rounded-3xl border shadow-xl overflow-hidden ${isDark ? 'bg-zinc-900/70 border-white/10 backdrop-blur' : 'bg-white/70 border-black/10 backdrop-blur'}`}>
          {/* border glow */}
          <div aria-hidden className="pointer-events-none absolute inset-0 rounded-3xl" style={{ padding: 6, background: `radial-gradient(200px 200px at 50% 50%, rgba(${GLOW_RGB}, .35), rgba(${GLOW_RGB}, .15) 30%, transparent 55%)`, WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }} />
          {/* glare */}
          <motion.div aria-hidden className="pointer-events-none absolute h-[300px] w-[300px] rounded-full" style={{ left: 'calc(50% - 150px)', top: 'calc(50% - 150px)', background: `radial-gradient(circle, rgba(${GLOW_RGB}, .22) 0%, rgba(${GLOW_RGB}, .12) 40%, transparent 70%)`, mixBlendMode: isDark ? 'screen' : 'multiply', filter: 'blur(20px)' }} />

          <div onDrop={(e:any)=>{e.preventDefault(); const f=e.dataTransfer.files?.[0]; onFile(f);} } onDragOver={(e:any)=>e.preventDefault()} className="relative" style={{ height: Math.max(height*0.72, 420) }}>
            <canvas ref={canvasRef} className="h-full w-full" />

            {!currentImageDataUrl && (
              <div className="absolute inset-0 grid place-items-center select-none" role="button" tabIndex={0} aria-label="Upload image" onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.onchange = () => onFile((input as any).files?.[0]); input.click(); }} onKeyDown={(e:any) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.onchange = () => onFile((input as any).files?.[0]); input.click(); } }}>
                <div className="text-center opacity-80">
                  <div className={`mx-auto mb-4 h-14 w-14 grid place-items-center rounded-2xl ${isDark ? 'bg-white/90 text-black' : 'bg-black/80 text-white'}`}><ImageIcon className="h-7 w-7" /></div>
                  <div className="font-medium">Drop an image here</div>
                  <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Then type an edit/generation prompt below and press Enter</div>
                </div>
              </div>
            )}

            {currentImageDataUrl && (
              <div className="absolute right-4 top-4 flex gap-2">
                <IconButton aria-label="Download image" onClick={() => { const a = document.createElement('a'); a.href = String(currentImageDataUrl); a.download = `canvas-image-${Date.now()}.png`; a.click(); }}><DownloadIcon className="h-5 w-5" /></IconButton>
              </div>
            )}

            {isLoading && (
              <div className={`absolute inset-0 grid place-items-center ${isDark ? 'bg-black/40' : 'bg-white/40'} backdrop-blur-sm`}>
                <div className={`animate-pulse rounded-xl border px-4 py-2 shadow-sm ${isDark ? 'border-white/10 bg-zinc-900/70' : 'border-black/10 bg-white/70'}`}>Processing…</div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Bottom input */}
      <div className="mx-auto max-w-6xl px-4 py-4 sticky bottom-0">
        <div className={`${isDark ? 'bg-zinc-900/60 border-white/10' : 'bg-white/70 border-black/10'} rounded-3xl border backdrop-blur shadow-lg p-3`}>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto] md:items-stretch">
            <AutoGrowTextarea placeholder={"Describe the edit or generation (e.g., \"A photorealistic golden retriever on a beach at sunset\")"} className={isDark ? '!bg-zinc-900/60 !text-slate-100 placeholder-zinc-400 border-white/10 caret-white' : ''} value={prompt} onChange={(e:any) => setPrompt(e.target.value)} onKeyDown={(e:any) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); (async ()=>{ await (runEdit as any)(); })(); } }} onHeightChange={setInputH} minLines={1} maxLines={isMobile ? 1 : 4} />
            <Button onClick={async ()=>{ await (runEdit as any)(); }} variant={isDark ? 'primaryLight' : 'primary'} style={{ height: inputH }} className="whitespace-nowrap min-w-[88px] md:min-w-[96px] px-5"><MagicWandIcon className="h-5 w-5" />Magic</Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={`mx-auto max-w-6xl px-4 pb-8 text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>All generated/edited images may carry an invisible SynthID watermark when using Gemini 2.5 Flash Image. Please respect local laws and content policies.</div>
    </div>
  );
}

// ---------------------------------
// Placeholder & text wrapping
// ---------------------------------
async function generatePlaceholderFromPrompt(prompt: string) {
  const canvas = document.createElement('canvas'); const W = 1024, H = 768; canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!; const g = ctx.createLinearGradient(0,0,W,H);
  g.addColorStop(0, '#e0e7ff'); g.addColorStop(1, '#cffafe'); ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
  (ctx as any).fillStyle = '#0f172a'; (ctx as any).font = 'bold 40px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto';
  const safe = sanitizeForPreview(prompt || '(no prompt)');
  wrapText(ctx as any, `Preview: ${safe}`, 40, 100, W-80, 46);
  (ctx as any).strokeStyle = '#0ea5e9'; (ctx as any).lineWidth = 12; (ctx as any).strokeRect(24,24,W-48,H-48);
  return canvas.toDataURL('image/png');
}
function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' '); let line = '';
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' '; const metrics = ctx.measureText(testLine);
    if ((metrics as any).width > maxWidth && n > 0) { ctx.fillText(line, x, y); line = words[n] + ' '; y += lineHeight; }
    else { line = testLine; }
  }
  ctx.fillText(line, x, y);
}

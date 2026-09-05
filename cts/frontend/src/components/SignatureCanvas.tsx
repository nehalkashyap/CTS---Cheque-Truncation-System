import { useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";

interface Props {
  onSave: (blob: Blob) => void;
  saving?: boolean;
}

export default function SignatureCanvas({ onSave, saving }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * ratio;
    canvas.height = canvas.clientHeight * ratio;
    ctx.scale(ratio, ratio);
    ctx.fillStyle = "#F6F1E4";
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    ctx.strokeStyle = "#0B1628";
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    hasInk.current = true;
    setEmpty(false);
  }

  function end() {
    drawing.current = false;
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#F6F1E4";
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    hasInk.current = false;
    setEmpty(true);
  }

  function save() {
    const canvas = canvasRef.current;
    if (!canvas || !hasInk.current) return;
    canvas.toBlob((blob) => {
      if (blob) onSave(blob);
    }, "image/png");
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className="w-full h-56 rounded-sm border border-ink-border touch-none cursor-crosshair"
        style={{ backgroundColor: "#F6F1E4" }}
      />
      <div className="flex items-center justify-between mt-3">
        <button onClick={clear} className="btn-ghost !px-2">
          <Eraser size={15} />
          Clear
        </button>
        <button onClick={save} disabled={empty || saving} className="btn-primary">
          {saving ? "Saving…" : "Save Signature"}
        </button>
      </div>
    </div>
  );
}

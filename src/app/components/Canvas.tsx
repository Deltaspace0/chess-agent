import { useRef, useEffect } from 'react';

interface CanvasProps {
  draw: (ctx: CanvasRenderingContext2D, dt: number) => void;
  className?: string;
  mouseHandlers?: {
    onMouseMove?: (event: MouseEvent) => void;
    onMouseUp?: (event: MouseEvent) => void;
    onMouseDown?: (event: MouseEvent) => void;
    onMouseLeave?: () => void;
  };
}

function Canvas({ draw, className, mouseHandlers }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastTimeRef = useRef<number>(0);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    const dpr = window.devicePixelRatio;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);
    let animationFrameId: number;
    const render = (time: number) => {
      time /= 1000;
      const dt = lastTimeRef.current ? time - lastTimeRef.current : 0;
      lastTimeRef.current = time;
      draw(ctx, Number.isNaN(dt) ? 0 : Math.min(0.02, dt));
      animationFrameId = window.requestAnimationFrame(render);
    };
    render(0);
    if (mouseHandlers?.onMouseMove) {
      canvas.addEventListener('mousemove', mouseHandlers.onMouseMove);
    }
    if (mouseHandlers?.onMouseDown) {
      canvas.addEventListener('mousedown', mouseHandlers.onMouseDown);
    }
    if (mouseHandlers?.onMouseUp) {
      canvas.addEventListener('mouseup', mouseHandlers.onMouseUp);
    }
    if (mouseHandlers?.onMouseLeave) {
      canvas.addEventListener('mouseleave', mouseHandlers.onMouseLeave);
    }
    return () => {
      window.cancelAnimationFrame(animationFrameId);
      if (mouseHandlers?.onMouseMove) {
        canvas.removeEventListener('mousemove', mouseHandlers.onMouseMove);
      }
      if (mouseHandlers?.onMouseDown) {
        canvas.removeEventListener('mousedown', mouseHandlers.onMouseDown);
      }
      if (mouseHandlers?.onMouseUp) {
        canvas.removeEventListener('mouseup', mouseHandlers.onMouseUp);
      }
      if (mouseHandlers?.onMouseLeave) {
        canvas.removeEventListener('mouseleave', mouseHandlers.onMouseLeave);
      }
    };
  }, [draw, mouseHandlers]);
  return (
    <canvas className={className} ref={canvasRef}></canvas>
  );
}

export default Canvas;

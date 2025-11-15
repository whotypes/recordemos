import React, {
  MutableRefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const MIN_RANGE = 50;
const ROTATION_DEG = -2.76;
const THETA = ROTATION_DEG * (Math.PI / 180);
const COS_THETA = Math.cos(THETA);
const SIN_THETA = Math.sin(THETA);

const clamp = (v: number, min: number, max: number): number =>
  Math.min(Math.max(v, min), max);

export function HeroTitle() {
  const measureRef = useRef<HTMLSpanElement | null>(null);
  const [textWidth, setTextWidth] = useState<number>(408);

  useEffect(() => {
    const measure = () =>
      setTextWidth(measureRef.current?.clientWidth ?? 408);
    measure();
    window.addEventListener("resize", measure);
    const ro = new ResizeObserver(measure);
    if (measureRef.current) ro.observe(measureRef.current);
    return () => {
      window.removeEventListener("resize", measure);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center text-center">
      <h1 className="font-light tracking-tighter text-5xl text-primary md:text-7xl">
        The Open Source
      </h1>
      <span
        ref={measureRef}
        className="absolute -left-[9999px] px-4 whitespace-nowrap font-light tracking-tighter text-5xl text-primary md:text-7xl"
      >
        Video Editor
      </span>
      <div className="flex justify-center gap-4 mt-4 md:mt-6">
        <OpenSourceSlider width={textWidth} onChange={() => {}} />
      </div>
      <p className="mt-8 text-center text-lg font-light text-primary/60 max-w-2xl mx-auto">
        An intuitive, powerful, and free video editor for everyone. Create stunning videos with professional tools, right from your browser.
      </p>
    </div>
  );
}

type SliderHandle = "left" | "right";

interface OpenSourceSliderProps {
  width: number;
  height?: number;
  handleSize?: number;
  onChange: (r: { left: number; right: number; range: number }) => void;
}

function OpenSourceSlider({
  width: initialWidth,
  height = 70,
  handleSize = 28,
  onChange,
}: OpenSourceSliderProps) {
  const width = initialWidth > 0 ? initialWidth + 35 : 0;

  const [left, setLeft] = useState<number>(0);
  const [right, setRight] = useState<number>(width);
  const [draggingHandle, setDraggingHandle] = useState<SliderHandle | null>(null);
  const [dynamicRotation, setDynamicRotation] = useState<number>(ROTATION_DEG);

  const leftRef = useRef<number>(left);
  const rightRef = useRef<number>(right);

  type DragInfo = {
    handle: SliderHandle;
    startX: number;
    startY: number;
    initialLeft: number;
    initialRight: number;
  } | null;
  const dragRef: MutableRefObject<DragInfo> = useRef<DragInfo>(null);

  useEffect(() => {
    leftRef.current = left;
    rightRef.current = right;
    onChange?.({ left, right, range: right - left });
  }, [left, right, onChange]);

  useEffect(() => {
    if (width > 0) {
      const handleMidpoint = (left + right) / 2;
      const sliderCenter = width / 2;
      const deviationFactor = (handleMidpoint - sliderCenter) / sliderCenter;
      const maxAdditionalTilt = 3;
      const newRotation = ROTATION_DEG + deviationFactor * maxAdditionalTilt;
      setDynamicRotation(newRotation);
    }
  }, [left, right, width]);

  useEffect(() => setRight(width), [width]);

  const startDrag = (
    handle: SliderHandle,
    e: React.PointerEvent<HTMLButtonElement>
  ) => {
    e.preventDefault();
    (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initialLeft: leftRef.current,
      initialRight: rightRef.current,
    };
    setDraggingHandle(handle);
  };

  const moveDrag = useCallback(
    (e: PointerEvent) => {
      if (!dragRef.current) return;
      const {
        handle,
        startX,
        startY,
        initialLeft,
        initialRight,
      } = dragRef.current;
      const dX = e.clientX - startX;
      const dY = e.clientY - startY;
      const projected = dX * COS_THETA + dY * SIN_THETA;
      if (handle === "left") {
        const newLeft = clamp(
          initialLeft + projected,
          0,
          rightRef.current - MIN_RANGE
        );
        setLeft(newLeft);
      } else {
        const newRight = clamp(
          initialRight + projected,
          leftRef.current + MIN_RANGE,
          width
        );
        setRight(newRight);
      }
    },
    [width]
  );

  const endDrag = useCallback(() => {
    dragRef.current = null;
    setDraggingHandle(null);
  }, []);

  useEffect(() => {
    window.addEventListener("pointermove", moveDrag);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    return () => {
      window.removeEventListener("pointermove", moveDrag);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, [moveDrag, endDrag]);

  const nudgeHandle = (handle: SliderHandle) => (
    e: React.KeyboardEvent<HTMLButtonElement>
  ) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const delta = e.key === "ArrowLeft" ? -10 : 10;
    if (handle === "left") {
      setLeft((prev: number) =>
        clamp(prev + delta, 0, rightRef.current - MIN_RANGE)
      );
    } else {
      setRight((prev: number) =>
        clamp(prev + delta, leftRef.current + MIN_RANGE, width)
      );
    }
  };

  return (
    <div
      className="relative select-none transition-transform duration-300 ease-out"
      style={{ width, height, transform: `rotate(${dynamicRotation}deg)` }}
    >
      <div className="absolute inset-0 rounded-2xl border border-secondary/40 pointer-events-none" />
      {(["left", "right"] as SliderHandle[]).map((handle) => {
        const x = handle === "left" ? left : right - handleSize;
        const scaleClass =
          draggingHandle === handle ? "scale-125" : "hover:scale-110";

        return (
          <button
            key={handle}
            type="button"
            aria-label={handle === "left" ? "Adjust start" : "Adjust end"}
            onPointerDown={(e) => startDrag(handle, e)}
            onKeyDown={nudgeHandle(handle)}
            className={`z-20 absolute top-0 h-full w-7 rounded-full bg-card border border-secondary/40 flex items-center justify-center cursor-ew-resize focus:outline-none focus:ring-2 focus:ring-secondary/50 transition-transform duration-150 ease-in-out opacity-100 ${scaleClass}`}
            style={{ left: x, touchAction: "none" }}
          >
            <span className="w-1 h-8 rounded-full bg-secondary" />
          </button>
        );
      })}
      <div
        className="flex z-10 items-center justify-center w-full h-full px-4 overflow-hidden pointer-events-none font-bold tracking-tighter text-5xl text-secondary md:text-6xl"
        style={{ clipPath: `inset(0 ${width - right}px 0 ${left}px round 1rem)` }}
      >
        Video Editor
      </div>
    </div>
  );
}

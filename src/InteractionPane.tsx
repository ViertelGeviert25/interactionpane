import { Stack, type SxProps, type Theme } from "@mui/material";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
  type PropsWithChildren,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent,
} from "react";

type Point = {
  x: number;
  y: number;
};

const SCROLLWHEEL_FACTOR = 0.1; // Determines how quickly the scale will change in reaction to the scroll wheel

const userInputPaneStackSx: SxProps<Theme> = {
  touchAction: "none",
  position: "absolute",
  inset: 0,
  overflow: "hidden",
};

const interactionPaneContainerSx: SxProps<Theme> = {
  position: "relative",
  width: "100%",
  height: "100%",
  overflow: "hidden",
};

const createPoint = (): Point => ({ x: 0, y: 0 });

/**
 * InteractionPane is a React component that allows end users to work with drag, pinch, and zoom using mouse
 * (scrollwheel + mouse buttons) on the desktop as well as hand gestures (pinch/zoom/drag) on mobile devices.
 * Any children places inside the InteractionPane will respond to the user interaction; they will automatically
 * be scaled/moved as required.
 * Based on https://medium.com/@jlklooste/building-a-react-component-for-zoom-drag-for-both-desktop-and-mobile-b9b320521f13
 */
const InteractionPane: FC<
  PropsWithChildren<{
    scale: number;
    setScale: Function;
    offset: {
      x: number;
      y: number;
    };
    setOffset: Function;
    contentSrc: string;
  }>
> = (props) => {
  //Scale determines the size of the displayed children (this react to pinch/zoom movements).
  //Offset determines the position of the displayed children (this respond to dragging movement).
  const { scale, setScale, offset, setOffset } = props;
  const paneRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // const [initialDistanceBetweenFingers, setInitialDistanceBetweenFingers] =
  //     useState(0);
  // const [initialScale, setInitialScale] = useState(1);
  // const [initialTouchCenter, setInitialTouchCenter] =
  //     useState<Point>(createPoint);
  // const [initialOffset, setInitialOffset] = useState<Point>(createPoint);
  const dragPositionStart = useRef<Point>(createPoint());
  const dragPositionOffsetStart = useRef<Point>(createPoint());
  const isDraggingRef = useRef(false);
  const pendingOffset = useRef<Point | null>(null);
  const dragFrame = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const scaledStackSx: SxProps<Theme> = useMemo(
    () => ({
      position: "absolute",
      left: `${offset.x}px`,
      top: `${offset.y}px`,
      transform: `translate(-50%, -50%) scale(${scale})`,
      transformOrigin: "center",
      userSelect: isDragging ? "none" : "auto",
      cursor: isDragging ? "grabbing" : "grab",
    }),
    [offset, scale, isDragging],
  );

  useEffect(() => {
    const pane = paneRef.current;
    if (!pane) {
      return;
    }

    const handleNativeWheel = (event: WheelEvent) => {
      if (event.target !== pane) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    };

    pane.addEventListener("wheel", handleNativeWheel, {
      passive: false,
    });

    return () => {
      pane.removeEventListener("wheel", handleNativeWheel);
      if (dragFrame.current !== null) {
        cancelAnimationFrame(dragFrame.current);
      }
    };
  }, []);

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (!event.ctrlKey) {
        return;
      }

      const initialScale = scale;
      const initialOffset = { ...offset };
      const zoomFactor = event.deltaY > 0 ? 1 - SCROLLWHEEL_FACTOR : 1 + SCROLLWHEEL_FACTOR;
      const newScale = initialScale * zoomFactor;
      const bounds = paneRef.current?.getBoundingClientRect();
      if (!bounds) {
        return;
      }

      const pointerX = event.clientX - bounds.left;
      const pointerY = event.clientY - bounds.top;
      const imageCoordinateX = (pointerX - initialOffset.x) / initialScale;
      const imageCoordinateY = (pointerY - initialOffset.y) / initialScale;

      setScale(newScale);
      setOffset({
        x: pointerX - newScale * imageCoordinateX,
        y: pointerY - newScale * imageCoordinateY,
      });
    },
    [scale, offset, setScale, setOffset],
  );

  useEffect(() => {
    const content = contentRef.current;
    if (!content) {
      return;
    }

    content.addEventListener("wheel", handleWheel, {
      passive: false,
    });

    return () => {
      content.removeEventListener("wheel", handleWheel);
    };
  }, [scale, handleWheel]);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragPositionStart.current = { x: event.clientX, y: event.clientY };
    dragPositionOffsetStart.current = { ...offset };
    isDraggingRef.current = true;
    setIsDragging(true);
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    isDraggingRef.current = false;
    if (dragFrame.current !== null) {
      cancelAnimationFrame(dragFrame.current);
      dragFrame.current = null;
    }
    if (pendingOffset.current !== null) {
      setOffset(pendingOffset.current);
      pendingOffset.current = null;
    }
    setIsDragging(false);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (isDraggingRef.current) {
      pendingOffset.current = {
        x: dragPositionOffsetStart.current.x + event.clientX - dragPositionStart.current.x,
        y: dragPositionOffsetStart.current.y + event.clientY - dragPositionStart.current.y,
      };

      if (dragFrame.current === null) {
        dragFrame.current = requestAnimationFrame(() => {
          dragFrame.current = null;
          if (pendingOffset.current !== null) {
            setOffset(pendingOffset.current);
            pendingOffset.current = null;
          }
        });
      }
    }
  }

  // Return the rendered component
  // The userinputpane div takes the full screen (see left, top, right and bottom attributes), this is there to capture the user's mouse / finger gestures' input.
  // The child div of the interaction pane is the thing we move around and scale as a result of the actions.
  return (
    <Stack sx={interactionPaneContainerSx}>
      <Stack
        ref={paneRef}
        // onTouchStart={handleTouchStart}
        // onTouchMove={handleTouchMove}
        sx={userInputPaneStackSx}
      >
        {/* This is the div that is "moved around" using the offset and scaled automatically, in response to the user's mouse/finger gestures. 
          Note how you can pass in any children that will automatically adapt to the required scale + offset. */}
        <Stack
          component="div"
          sx={scaledStackSx}
          ref={contentRef}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerMove={handlePointerMove}
        >
          <object data={props.contentSrc} type="image/svg+xml" style={{ pointerEvents: "none" }} />
        </Stack>
      </Stack>
    </Stack>
  );
};

export default InteractionPane;

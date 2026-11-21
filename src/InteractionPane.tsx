import { mdiFitToScreen } from "@mdi/js";
import { Fab, Stack, type SxProps, type Theme } from "@mui/material";
import { Icon } from "@mdi/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
  type PropsWithChildren,
  type PointerEvent as ReactPointerEvent,
  type CSSProperties,
} from "react";

type Point = {
  x: number;
  y: number;
};

const SCROLLWHEEL_FACTOR = 0.1; // Determines how quickly the scale will change in reaction to the scroll wheel

const INITIAL_SCALE = 1;
const SCALE_LIMITS = { min: 1, max: 50 };
const IMAGE_TOP_MARGIN = 2;

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

const fitToScreenFabSx: SxProps<Theme> = {
  position: "fixed",
  bottom: 50,
  right: 50,
  zIndex: 9999,
};

const createPoint = (): Point => ({ x: 0, y: 0 });

/**
 * InteractionPane allows end users to work with drag, pinch, and zoom using mouse
 * (scrollwheel + mouse buttons) on the desktop as well as hand gestures (pinch/zoom/drag) on mobile devices.
 * Any content placed inside the InteractionPane will respond to the user interaction; they will automatically
 * be scaled/moved as required.
 * Based on https://medium.com/@jlklooste/building-a-react-component-for-zoom-drag-for-both-desktop-and-mobile-b9b320521f13
 */
const InteractionPane: FC<
  PropsWithChildren<{
    contentSrc: string;
  }>
> = (props) => {
  //Scale determines the size of the displayed children (this react to pinch/zoom movements).
  //Offset determines the position of the displayed children (this respond to dragging movement).
  // const { scale, setScale, offset, setOffset } = props;
  const [scale, setScale] = useState(INITIAL_SCALE);
  const [offset, setOffset] = useState(createPoint());
  // Keep the image hidden until its initial position is set to prevent flickering.
  const [loaded, setLoaded] = useState(false);

  const paneRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const minimumScaleRef = useRef(SCALE_LIMITS.min);

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
      let newScale = initialScale * zoomFactor;
      if (newScale < minimumScaleRef.current) {
        newScale = minimumScaleRef.current;
      } else if (newScale > SCALE_LIMITS.max) {
        newScale = SCALE_LIMITS.max;
      }
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
    const image = imageRef.current;
    if (!image) {
      return;
    }

    image.addEventListener("wheel", handleWheel, {
      passive: false,
    });

    return () => {
      image.removeEventListener("wheel", handleWheel);
    };
  }, [scale, handleWheel]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      dragPositionStart.current = { x: event.clientX, y: event.clientY };
      dragPositionOffsetStart.current = { ...offset };
      isDraggingRef.current = true;
      setIsDragging(true);
    },
    [offset],
  );

  const handlePointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
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
  }, []);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
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
  }, []);

  const fitImageToScreen = useCallback(() => {
    const image = imageRef.current;
    const pane = paneRef.current;
    if (!image || !pane || image.naturalWidth === 0 || image.naturalHeight === 0) {
      return;
    }

    const paneWidth = pane.clientWidth;
    const availableHeight = pane.clientHeight - IMAGE_TOP_MARGIN;
    if (paneWidth === 0 || availableHeight <= 0) {
      return;
    }

    const fitScale = Math.min(
      1,
      paneWidth / image.naturalWidth,
      availableHeight / image.naturalHeight,
    );
    minimumScaleRef.current = Math.min(SCALE_LIMITS.min, fitScale);
    setScale(fitScale);
    setOffset({
      x: paneWidth / 2,
      y: IMAGE_TOP_MARGIN + (image.naturalHeight * fitScale) / 2,
    });
  }, [setScale, setOffset]);

  const handleLoadedImage = useCallback(() => {
    fitImageToScreen();
    setLoaded(true);
  }, [fitImageToScreen]);

  const contentStyle = useMemo<CSSProperties>(
    () => ({ visibility: loaded ? "visible" : "hidden" }),
    [loaded],
  );

  return (
    <Stack sx={interactionPaneContainerSx}>
      <Stack
        ref={paneRef}
        // onTouchStart={handleTouchStart}
        // onTouchMove={handleTouchMove}
        sx={userInputPaneStackSx}
      >
        {/* This is the component that is "moved around" using the offset and scaled automatically, 
        in response to the user's mouse/finger gestures. */}
        <Stack
          sx={scaledStackSx}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerMove={handlePointerMove}
        >
          <img
            ref={imageRef}
            src={props.contentSrc}
            alt="N/A"
            draggable={false}
            style={contentStyle}
            onLoad={handleLoadedImage}
          />
        </Stack>
        <Fab
          aria-label="Fit image to pane"
          color="primary"
          sx={fitToScreenFabSx}
          onClick={fitImageToScreen}
        >
          <Icon path={mdiFitToScreen} size={1} />
        </Fab>
      </Stack>
    </Stack>
  );
};

export default InteractionPane;

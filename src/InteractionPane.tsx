import { mdiFitToScreen, mdiFitToScreenOutline } from "@mdi/js";
import { Fab, Stack, Tooltip, type SxProps, type Theme } from "@mui/material";
import { Icon } from "@mdi/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
  type PointerEvent,
  type CSSProperties,
  type MouseEvent,
  useEffectEvent,
} from "react";

type Point = {
  x: number;
  y: number;
};

type InteractionPaneProps = FC<{
  contentSrc: string;
}>;

const SCROLLWHEEL_FACTOR = 0.1; // Determines how quickly the scale will change in reaction to the scroll wheel
const INITIAL_SCALE = 1; // Initial scaling factor is 1
const SCALE_LIMITS = { min: 1, max: 50 };
const IMAGE_TOP_MARGIN = 2;

const userInputPaneStackSx: SxProps<Theme> = {
  touchAction: "none",
  position: "absolute",
  inset: 0,
  overflow: "hidden",
  "&:focus": {
    outline: "none",
  },
};

const interactionPaneContainerSx: SxProps<Theme> = {
  position: "relative",
  width: "100%",
  height: "100%",
  overflow: "hidden",
};

const fitToScreenFabSx: SxProps<Theme> = {
  position: "absolute",
  bottom: 24,
  right: 24,
  zIndex: 9999,
};

const createPoint = (): Point => ({ x: 0, y: 0 });
const arePointsEqual = (pointA: Point, pointB: Point): boolean =>
  pointA.x === pointB.x && pointA.y === pointB.y;

const calculateImageView = (
  image: HTMLImageElement,
  pane: HTMLDivElement,
  actualSize: boolean,
): { scale: number; offset: Point } | null => {
  if (image.naturalWidth === 0 || image.naturalHeight === 0) {
    return null;
  }

  const paneWidth = pane.clientWidth;
  const availableHeight = pane.clientHeight - IMAGE_TOP_MARGIN;
  if (paneWidth === 0 || availableHeight <= 0) {
    return null;
  }

  const scale = actualSize
    ? 1
    : Math.min(1, paneWidth / image.naturalWidth, availableHeight / image.naturalHeight);

  return {
    scale,
    offset: {
      x: paneWidth / 2,
      y: IMAGE_TOP_MARGIN + (image.naturalHeight * scale) / 2,
    },
  };
};

/**
 * InteractionPane allows end users to work with drag, pinch, and zoom using mouse
 * (scrollwheel + mouse buttons) on the desktop as well as hand gestures (pinch/zoom/drag) on mobile devices.
 * Any content placed inside the InteractionPane will respond to the user interaction; they will automatically
 * be scaled/moved as required.
 */
const InteractionPane: InteractionPaneProps = (props) => {
  // Scale determines the size of the displayed children (this react to pinch/zoom movements)
  const [scale, setScale] = useState(INITIAL_SCALE);
  const [minimumScale, setMinimumScale] = useState(SCALE_LIMITS.min);

  // Offset determines the position of the displayed children (this respond to dragging movement)
  const [offset, setOffset] = useState(createPoint());
  const [defaultOffset, setDefaultOffset] = useState(createPoint());
  // Keep the image hidden until its initial position is set to prevent flickering.
  const [loaded, setLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const paneRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const dragPositionStart = useRef<Point>(createPoint());
  const dragPositionOffsetStart = useRef<Point>(createPoint());
  const isDraggingRef = useRef(false);
  const pendingOffset = useRef<Point | null>(null);
  const dragFrame = useRef<number | null>(null);

  const isAtDefaultView = loaded && scale === minimumScale && arePointsEqual(offset, defaultOffset);

  const scaledStackSx: SxProps<Theme> = useMemo(
    () => ({
      position: "absolute",
      left: `${offset.x}px`,
      top: `${offset.y}px`,
      transform: `translate(-50%, -50%) scale(${scale})`,
      transformOrigin: "center",
      // transition: isFitting ? "left 250ms ease, top 250ms ease, transform 250ms ease" : "none",
      userSelect: isDragging ? "none" : "auto",
      cursor: isAtDefaultView ? "default" : isDragging ? "grabbing" : "grab",
    }),
    [offset, scale, isDragging, isAtDefaultView],
  );

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (!event.ctrlKey) {
        return;
      }

      // Algorithm based on https://medium.com/@jlklooste/building-a-react-component-for-zoom-drag-for-both-desktop-and-mobile-b9b320521f13

      const initialScale = scale;
      const initialOffset = { ...offset };
      const zoomFactor = event.deltaY > 0 ? 1 - SCROLLWHEEL_FACTOR : 1 + SCROLLWHEEL_FACTOR;
      let newScale = initialScale * zoomFactor;
      if (newScale < minimumScale) {
        newScale = minimumScale;
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
    [scale, minimumScale, offset, setScale, setOffset],
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
  }, [handleWheel]);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const pane = paneRef.current;
      const image = imageRef.current;
      if (!pane || !image) {
        return;
      }

      const imageBounds = image.getBoundingClientRect();
      const paneBounds = pane.getBoundingClientRect();
      if (
        imageBounds.left >= paneBounds.left &&
        imageBounds.right <= paneBounds.right &&
        imageBounds.top >= paneBounds.top &&
        imageBounds.bottom <= paneBounds.bottom
      ) {
        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);
      paneRef.current?.focus();
      dragPositionStart.current = { x: event.clientX, y: event.clientY };
      dragPositionOffsetStart.current = { ...offset };
      isDraggingRef.current = true;
      setIsDragging(true);
    },
    [offset],
  );

  const handlePointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
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

  const handlePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) {
      return;
    }

    let offsetX = dragPositionOffsetStart.current.x + event.clientX - dragPositionStart.current.x;
    const offsetY = dragPositionOffsetStart.current.y + event.clientY - dragPositionStart.current.y;

    const image = imageRef.current;
    if (image) {
      // Keep the left image edge from moving beyond the left pane edge.
      const imageHalfWidth = image.getBoundingClientRect().width / 2;
      offsetX = Math.min(offsetX, imageHalfWidth);
    }

    pendingOffset.current = {
      x: offsetX,
      y: offsetY,
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
  }, []);

  const fitImageToPane = useCallback(() => {
    const image = imageRef.current;
    const pane = paneRef.current;
    if (!image || !pane) {
      return;
    }

    const view = calculateImageView(image, pane, false);
    if (!view) {
      return;
    }

    setMinimumScale(Math.min(SCALE_LIMITS.min, view.scale));
    setDefaultOffset(view.offset);
    setScale(view.scale);
    setOffset(view.offset);
  }, [setDefaultOffset, setMinimumScale, setScale, setOffset]);

  const zoomImageToActualSize = useCallback(
    (anchorPoint?: Point) => {
      const image = imageRef.current;
      const pane = paneRef.current;
      if (!image || !pane) {
        return;
      }

      const view = calculateImageView(image, pane, true);
      if (!view) {
        return;
      }

      setScale(view.scale);
      if (anchorPoint) {
        // Convert the pane position under the cursor into image coordinates at the current scale
        const imageCoordinateX = (anchorPoint.x - offset.x) / scale;
        const imageCoordinateY = (anchorPoint.y - offset.y) / scale;
        // Move the offset so the same image coordinates remain under the cursor after scaling to the actual-size scale
        setOffset({
          x: anchorPoint.x - view.scale * imageCoordinateX,
          y: anchorPoint.y - view.scale * imageCoordinateY,
        });
      }
      // Do not set offset if no anchor point ist set
    },
    [scale, offset, setScale, setOffset],
  );

  const toggleImageView = useCallback(
    (anchorPoint?: Point) => {
      if (!loaded) {
        return;
      }
      if (isAtDefaultView) {
        zoomImageToActualSize(anchorPoint);
        return;
      }
      fitImageToPane();
    },
    [loaded, isAtDefaultView, zoomImageToActualSize, fitImageToPane],
  );

  const handlePaneNativeWheel = useEffectEvent((event: WheelEvent) => {
    if (event.target !== paneRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
  });

  const handlePaneKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (!event.ctrlKey) {
      return;
    }

    switch (event.key) {
      case "0":
        fitImageToPane();
        break;
      case "1":
        zoomImageToActualSize();
        break;
      default:
        break;
    }
  });

  useEffect(() => {
    const pane = paneRef.current;
    if (!pane) {
      return;
    }
    const handleNativeWheel = (event: WheelEvent) => handlePaneNativeWheel(event);
    const handleKeyDown = (event: KeyboardEvent) => handlePaneKeyDown(event);

    pane.addEventListener("wheel", handleNativeWheel, {
      passive: false,
    });

    pane.addEventListener("keydown", handleKeyDown);

    return () => {
      pane.removeEventListener("wheel", handleNativeWheel);
      if (dragFrame.current !== null) {
        cancelAnimationFrame(dragFrame.current);
      }
      pane.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleLoadedImage = useCallback(() => {
    fitImageToPane();
    setLoaded(true);
  }, [fitImageToPane]);

  const contentStyle = useMemo<CSSProperties>(
    () => ({ visibility: loaded ? "visible" : "hidden", userSelect: "none" }),
    [loaded],
  );

  const handleImageDoubleClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const pane = paneRef.current;
      if (!pane) {
        return;
      }
      const bounds = pane.getBoundingClientRect();
      toggleImageView({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });
    },
    [toggleImageView],
  );

  const handleFabuttonClick = useCallback(() => {
    toggleImageView();
  }, [toggleImageView]);

  return (
    <Stack sx={interactionPaneContainerSx}>
      <Stack
        ref={paneRef}
        role="region"
        aria-label="Image viewer"
        tabIndex={0}
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
          onDoubleClick={handleImageDoubleClick}
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
        <Tooltip
          title={
            isAtDefaultView
              ? "Auf tatsächlicher Größe zoomen (Ctrl + 1)"
              : "An Fenstergröße anpassen (Ctrl + 0)"
          }
          placement="left"
        >
          <Fab
            aria-label="Fit image to pane"
            color="primary"
            sx={fitToScreenFabSx}
            onClick={handleFabuttonClick}
          >
            <Icon path={isAtDefaultView ? mdiFitToScreen : mdiFitToScreenOutline} size={1} />
          </Fab>
        </Tooltip>
      </Stack>
    </Stack>
  );
};

export default InteractionPane;

// const [initialDistanceBetweenFingers, setInitialDistanceBetweenFingers] =
//     useState(0);
// const [initialScale, setInitialScale] = useState(1);
// const [initialTouchCenter, setInitialTouchCenter] =
//     useState<Point>(createPoint);
// const [initialOffset, setInitialOffset] = useState<Point>(createPoint);
// function handleTouchStart(event: ReactTouchEvent<HTMLDivElement>) {
//     if (event.touches.length >= 2) {
//         const distanceX =
//             event.touches[1].clientX - event.touches[0].clientX;
//         const distanceY =
//             event.touches[1].clientY - event.touches[0].clientY;
//         const initialDistance = Math.sqrt(
//             distanceX * distanceX + distanceY * distanceY,
//         );
//         setInitialDistanceBetweenFingers(initialDistance);
//         const centerX =
//             event.touches[0].clientX +
//             (event.touches[1].clientX - event.touches[0].clientX) / 2;
//         const centerY =
//             event.touches[0].clientY +
//             (event.touches[1].clientY - event.touches[0].clientY) / 2;
//         setInitialTouchCenter({
//             x: centerX,
//             y: centerY,
//         });
//         setInitialScale(scale);
//         setInitialOffset({ ...offset });
//     }
// }

// /*
//  * Handles two finger actions: Pinch/zoom + two finger move
//  * The action is initiated by handleTouchStart, and subsequently the following code is called
//  * while the fingers are on the screen.
//  */
// function handleTouchMove(event: ReactTouchEvent<HTMLDivElement>) {
//     if (event.touches.length >= 2) {
//         //The following calculates how much the scale must changes (given the change in distance between the fingers)
//         const distanceX =
//             event.touches[1].clientX - event.touches[0].clientX;
//         const distanceY =
//             event.touches[1].clientY - event.touches[0].clientY;
//         const currentDistanceBetweenFingers = Math.sqrt(
//             distanceX * distanceX + distanceY * distanceY,
//         );
//         const scaleChange =
//             currentDistanceBetweenFingers / initialDistanceBetweenFingers;
//         const newScale = initialScale * scaleChange;
//         setScale(newScale);

//         //The following adapts the offset in such a way that we zoom in on the center point between the fingers
//         //1. Take the original center, and convert it from screen coordinate space to image coordinate space
//         const imageCoordinateX =
//             (initialTouchCenter.x - initialOffset.x) / initialScale;
//         const imageCoordinateY =
//             (initialTouchCenter.y - initialOffset.y) / initialScale;
//         //2. Calculate where this center would end up, given the new scale
//         const wouldBeNewScreenPositionX =
//             imageCoordinateX * newScale + initialOffset.x;
//         const wouldBeNewScreenPositionY =
//             imageCoordinateY * newScale + initialOffset.y;
//         //3. Calculate the different between the two (we want it to be zero)
//         const offsetAdjustmentX1 =
//             initialTouchCenter.x - wouldBeNewScreenPositionX;
//         const offsetAdjustmentY1 =
//             initialTouchCenter.y - wouldBeNewScreenPositionY;

//         //In addition, the following adapts the offset when both fingers move in a particular direction
//         //This way you can pinch/zoom and move the canvas at the same time
//         const currentCenterX =
//             event.touches[0].clientX +
//             (event.touches[1].clientX - event.touches[0].clientX) / 2;
//         const currentCenterY =
//             event.touches[0].clientY +
//             (event.touches[1].clientY - event.touches[0].clientY) / 2;
//         const offsetAdjustmentX2 = currentCenterX - initialTouchCenter.x;
//         const offsetAdjustmentY2 = currentCenterY - initialTouchCenter.y;

//         //Finally, apply both offset adjustments
//         setOffset({
//             x: initialOffset.x + offsetAdjustmentX1 + offsetAdjustmentX2,
//             y: initialOffset.y + offsetAdjustmentY1 + offsetAdjustmentY2,
//         });
//     }
// }

// onTouchStart={handleTouchStart}
// onTouchMove={handleTouchMove}

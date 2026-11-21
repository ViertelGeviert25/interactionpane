import { useState } from "react";
import InteractionPane from "./InteractionPane";
import { Stack, type SxProps, type Theme } from "@mui/material";

const stackSx: SxProps<Theme> = {
  position: "fixed",
  width: "calc(100% - 4em)",
  height: "calc(100% - 4em)",
  margin: "2em",
  border: "2px solid black",
};

export function App() {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 500, y: 500 });

  return (
    <Stack sx={stackSx}>
      <InteractionPane
        scale={scale}
        setScale={setScale}
        offset={offset}
        setOffset={setOffset}
        contentSrc="/testdata/sample_diagram.svg"
      />
    </Stack>
  );
}

// TODO:
// * center images
// * nicht <object und auch nicht dangerouslyinserthtml oder so...
// * max scaling einbauen...
// * auf mobile testen.
// * Reset button

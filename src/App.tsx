import InteractionPane from "./InteractionPane";
import { Stack, type SxProps, type Theme } from "@mui/material";

const stackSx: SxProps<Theme> = {
  position: "fixed",
  width: "calc(80% - 4em)",
  height: "calc(100% - 4em)",
  margin: "2em",
  border: "2px solid black",
};

export function App() {
  return (
    <Stack sx={stackSx}>
      <InteractionPane contentSrc="/testdata/mb_vision.jpg" />
    </Stack>
  );
}

// TODO:
// 1) zoomImageToActualSize muss cursor-position berücksichtigen (und offset setzen!)
// 2) Wie in der Windows-Fotoanzeige soll man nicht ganz nach oben verschieben können!!
// 3) Mobile touch umsetzen und testen.

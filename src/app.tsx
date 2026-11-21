import InteractionPane from "./InteractionPane";
import { Stack, type SxProps, type Theme } from "@mui/material";

const stackSx: SxProps<Theme> = {
  position: "fixed",
  width: "calc(100% - 4em)",
  height: "calc(100% - 4em)",
  margin: "2em",
  border: "0px solid black",
};

export function App() {
  return (
    <Stack sx={stackSx}>
      <InteractionPane contentSrc="/testdata/mb-vision.jpg" />
    </Stack>
  );
}

// TODO:
// * Wie in der Windows-Fotoanzeige soll man nicht ganz nach oben verschieben können!!
// * Toggle Image View...
// * Mobile touch umsetzen und testen.

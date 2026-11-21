import InteractionPane from "./InteractionPane";
import { Stack, type SxProps, type Theme } from "@mui/material";

const stackSx: SxProps<Theme> = {
  position: "fixed",
  width: "calc(80% - 4em)",
  height: "calc(100% - 4em)",
  margin: "2em",
  border: "2px solid red",
};

export function App() {
  return (
    <Stack sx={stackSx}>
      <InteractionPane contentSrc="/testdata/landscape.svg" />
    </Stack>
  );
}

// TODO:
// 1) Wie in der Windows-Fotoanzeige soll man nicht ganz nach oben verschieben können!!
// 2) Mobile touch umsetzen und testen.

import { useState } from "react";
import InteractionPane from "./InteractionPane";
import { Stack } from "@mui/material";

export function App() {
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    return (
        <Stack
            sx={{
                backgroundColor: "green",
                width: "100vw",
                height: "100vh",
            }}
        >
            <InteractionPane
                scale={scale}
                setScale={setScale}
                offset={offset}
                setOffset={setOffset}
            >
                <img
                    src="https://github.githubassets.com/assets/GitHub-Mark-ea2971cee799.png"
                    width="200px"
                    style={{ position: "absolute", left: "200px" }}
                />
                <div
                    style={{
                        position: "absolute",
                        width: "400px",
                        height: "400px",
                        left: "0px",
                        top: "0px",
                        borderColor: "red",
                        borderStyle: "solid",
                    }}
                ></div>
                <div style={{ position: "absolute" }}>
                    <svg height="400" width="400">
                        <polygon
                            points="0,200 200,200 100,0 0,200"
                            class="triangle"
                        />
                        <circle cx="300" cy="300" r="100" fill="blue" />
                    </svg>
                </div>
            </InteractionPane>
        </Stack>
    );
}

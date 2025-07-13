import express from "express";
import http from "http";
import hiLo from "./routes/hi-lo.js";
import flip from "./routes/flip.js";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use("/arcade/hi-lo", hiLo);
app.use("/arcade/flip", flip);

// 目前的連線遊戲狀態
let gameData = [
    {
        id: 890324,
        game: "tic-tac-toe",
        player: ["<id>", "<id>"],
        data: {
            status: "11001020",
        },
    },
];

let pending = [];

// API to get pending games
app.get("/arcade/pending.json", (req, res) => {
    res.json(pending);
});

app.use("/arcade", express.static("public"));

// if /, redirect to /arcade
app.get("/", (req, res) => {
    res.redirect("/arcade");
});

// hi-lo

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

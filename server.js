import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static("public"));

const PLAYERS = [
  { id: "jogador-7",  name: "Jogador 7 (MEI)" },
  { id: "jogador-9",  name: "Jogador 9 (ATA)" },
  { id: "jogador-10", name: "Jogador 10 (MEI)" },
  { id: "jogador-11", name: "Jogador 11 (PD)" }
];

const rnd = (min, max) => +(Math.random() * (max - min) + min).toFixed(2);
const sampleFor = (playerId) => ({
  playerId,
  bpm: Math.floor(rnd(55, 195)),
  speed: rnd(0, 34),
  pos: { x: rnd(0, 100), y: rnd(0, 100) },
  ts: Date.now()
});

const SAMPLE_MS = Number(process.env.SAMPLE_MS || 1000);
const intervals = new Map();
function startEmitterFor(player) {
  if (intervals.has(player.id)) return;
  const it = setInterval(() => {
    const data = sampleFor(player.id);
    io.to(player.id).emit("sensor", data);
    io.emit("sensor:latest", data);
  }, SAMPLE_MS);
  intervals.set(player.id, it);
}
PLAYERS.forEach(startEmitterFor);

app.get("/api/players", (req, res) => res.json(PLAYERS));

io.on("connection", (socket) => {
  socket.emit("players", PLAYERS);

  socket.on("subscribe", (playerId) => {
    for (const room of socket.rooms) {
      if (room.startsWith("jogador-")) socket.leave(room);
    }
    socket.join(playerId);
    socket.emit("subscribed", playerId);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor em http://localhost:${PORT} (amostra a cada ${SAMPLE_MS}ms)`);
});

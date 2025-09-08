const socket = io(); // mesma origem do server

// DOM
const sel = document.getElementById("selPlayer");
const btnAssinar = document.getElementById("btnAssinar");
const btnPause = document.getElementById("btnPause");
const btnResume = document.getElementById("btnResume");
const infoRoom = document.getElementById("infoRoom");
const connBadge = document.getElementById("connBadge");

const bpmEl = document.getElementById("bpm");
const speedEl = document.getElementById("speed");
const posEl = document.getElementById("pos");
const tsEl = document.getElementById("ts");
const logEl = document.getElementById("log");

const field = document.getElementById("field");
const fctx = field.getContext("2d");
const trail = document.getElementById("trail");
const tctx = trail.getContext("2d");

// Estado
let paused = false;
let signedRoom = null;
const trailPoints = []; // últimos 20 pontos (x,y)
const MAX_SAMPLES = 60; // gráfico 60s

// Conexão badge
socket.on("connect", () => {
  connBadge.textContent = "Conectado";
  connBadge.classList.remove("off"); connBadge.classList.add("ok");
});
socket.on("disconnect", () => {
  connBadge.textContent = "Desconectado";
  connBadge.classList.remove("ok"); connBadge.classList.add("off");
});

// Lista de jogadores
socket.on("players", (players) => {
  sel.innerHTML = players.map(p => `<option value="${p.id}">${p.name}</option>`).join("");
});

// Assinar room
btnAssinar.addEventListener("click", () => {
  const id = sel.value;
  socket.emit("subscribe", id);
});
socket.on("subscribed", (id) => {
  signedRoom = id;
  infoRoom.textContent = `Assinado na room: ${id}`;
  trailPoints.length = 0; // limpa rastro ao trocar
  clearChart(chartBpm); clearChart(chartSpeed);
});

// Pausar/Retomar
btnPause.addEventListener("click", () => paused = true);
btnResume.addEventListener("click", () => paused = false);

// Campo
function drawField(xPct=50, yPct=50) {
  const w = field.width, h = field.height;
  fctx.clearRect(0,0,w,h);
  fctx.strokeStyle = "#2a436a"; fctx.lineWidth = 2;
  fctx.strokeRect(10,10,w-20,h-20);
  fctx.beginPath(); fctx.moveTo(w/2,10); fctx.lineTo(w/2,h-10); fctx.stroke();

  const x = 10 + (w-20) * (xPct/100);
  const y = 10 + (h-20) * (yPct/100);
  fctx.beginPath(); fctx.arc(x, y, 8, 0, Math.PI*2);
  fctx.fillStyle = "#e6eefc"; fctx.fill();
}
drawField();

// Rastro (últimos N pontos com fade)
function drawTrail() {
  const w = trail.width, h = trail.height;
  tctx.clearRect(0,0,w,h);
  // borda igual campo
  tctx.strokeStyle = "#2a436a"; tctx.lineWidth = 2;
  tctx.strokeRect(10,10,w-20,h-20);

  trailPoints.forEach((pt, i) => {
    const alpha = (i + 1) / trailPoints.length;
    tctx.beginPath();
    tctx.arc(pt.x, pt.y, 6, 0, Math.PI*2);
    tctx.fillStyle = `rgba(230,238,252,${alpha})`;
    tctx.fill();
  });
}

// Zonas de esforço (simplesmente heurístico)
function zoneForBpm(v){
  if (v < 120) return ["OK", "ok"];
  if (v < 165) return ["Alerta", "warn"];
  return ["Perigo", "danger"];
}
function zoneForSpeed(v){
  if (v < 12) return ["OK", "ok"];
  if (v < 24) return ["Alerta", "warn"];
  return ["Perigo", "danger"];
}

// Chart helpers
function makeChart(ctx, label){
  return new Chart(ctx, {
    type: "line",
    data: { labels: [], datasets: [{ label, data: [], tension: 0.2 }]},
    options: {
      responsive: true,
      animation: false,
      scales: { x: { display: false }, y: { beginAtZero: true } },
      plugins: { legend: { display: false } }
    }
  });
}
function pushChart(chart, xLabel, value){
  const d = chart.data;
  d.labels.push(xLabel);
  d.datasets[0].data.push(value);
  if (d.labels.length > MAX_SAMPLES) {
    d.labels.shift();
    d.datasets[0].data.shift();
  }
  chart.update();
}
function clearChart(chart){
  chart.data.labels = [];
  chart.data.datasets[0].data = [];
  chart.update();
}

const chartBpm = makeChart(document.getElementById("chartBpm").getContext("2d"), "BPM");
const chartSpeed = makeChart(document.getElementById("chartSpeed").getContext("2d"), "Velocidade");

// Dados da room assinada
socket.on("sensor", (data) => {
  if (paused || !data) return;

  bpmEl.textContent = data.bpm;
  speedEl.textContent = data.speed;
  posEl.textContent = `${data.pos.x}, ${data.pos.y}`;
  const t = new Date(data.ts);
  tsEl.textContent = t.toLocaleTimeString();

  // zonas
  const [bz, bc] = zoneForBpm(data.bpm);
  const [sz, sc] = zoneForSpeed(data.speed);
  const bpmZone = document.getElementById("bpmZone");
  const speedZone = document.getElementById("speedZone");
  bpmZone.textContent = bz; bpmZone.className = `zone ${bc}`;
  speedZone.textContent = sz; speedZone.className = `zone ${sc}`;

  // campo
  drawField(data.pos.x, data.pos.y);

  // rastro
  const w = trail.width, h = trail.height;
  const px = 10 + (w-20) * (data.pos.x/100);
  const py = 10 + (h-20) * (data.pos.y/100);
  trailPoints.push({x: px, y: py});
  if (trailPoints.length > 20) trailPoints.shift();
  drawTrail();

  // gráficos
  pushChart(chartBpm, t.toLocaleTimeString(), data.bpm);
  pushChart(chartSpeed, t.toLocaleTimeString(), data.speed);
});

// Log global
socket.on("sensor:latest", (data) => {
  const line = `[${new Date(data.ts).toLocaleTimeString()}] ${data.playerId} — bpm=${data.bpm}, v=${data.speed}km/h, pos=(${data.pos.x},${data.pos.y})`;
  logEl.textContent = (line + "\n" + logEl.textContent).slice(0, 4000);
});

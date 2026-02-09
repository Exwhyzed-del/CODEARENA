const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================= STORAGE =================
const rooms = {};
const leaderboard = {};

// ================= JUDGE0 =================
const JUDGE_URL =
  "https://ce.judge0.com/submissions?base64_encoded=false&wait=true";

const languages = {
  python: 71,
  cpp: 54,
  java: 62,
};

async function runCode(code, input, languageId) {
  const response = await axios.post(JUDGE_URL, {
    language_id: languageId,
    source_code: code,
    stdin: input,
  });
  return response.data;
}

// ================= ROUTES =================

app.get("/", (req, res) => {
  res.send("<h2>Server running 🚀</h2>");
});

// CREATE ROOM
app.get("/create-room", (req, res) => {
  const roomCode = Math.random().toString(36).slice(2, 8).toUpperCase();

  rooms[roomCode] = {
    question: "Reverse a string",
    publicTestCases: [{ input: "hello", output: "olleh" }],
    hiddenTestCases: [
      { input: "abc", output: "cba" },
      { input: "world", output: "dlrow" },
    ],
    startTime: Date.now(),
    duration: 2 * 60 * 1000, // 2 minutes
  };

  res.send(`
    <h2>Room Created 🎉</h2>
    <p>Room Code: ${roomCode}</p>
    <p>Contest Time: 2 minutes</p>
    <a href="/join-room?code=${roomCode}">Join Room</a>
  `);
});

// JOIN ROOM
app.get("/join-room", (req, res) => {
  const room = rooms[req.query.code];
  if (!room) return res.send("Room not found ❌");

  const timeLeft =
    Math.max(
      0,
      room.duration - (Date.now() - room.startTime)
    ) / 1000;

  res.send(`
    <h2>Question</h2>
    <p>${room.question}</p>
    <p>⏳ Time Left: ${timeLeft.toFixed(0)} seconds</p>

    <form method="POST" action="/submit-code">
      <input type="hidden" name="roomCode" value="${req.query.code}">
      <input name="username" required><br><br>

      <select name="language">
        <option value="python">Python</option>
        <option value="cpp">C++</option>
        <option value="java">Java</option>
      </select><br><br>

      <textarea name="code" rows="12" cols="80" required></textarea><br><br>
      <button>Submit</button>
    </form>
  `);
});

// SUBMIT CODE
app.post("/submit-code", async (req, res) => {
  const { roomCode, username, code, language } = req.body;
  const room = rooms[roomCode];

  if (Date.now() > room.startTime + room.duration) {
    return res.send("<h2>⏰ Contest Over</h2>");
  }

  let passed = 0;
  let totalTime = 0;

  const allTests = [
    ...room.publicTestCases,
    ...room.hiddenTestCases,
  ];

  for (let tc of allTests) {
    const result = await runCode(code, tc.input, languages[language]);
    if (result.stdout?.trim() === tc.output) passed++;
    totalTime += Number(result.time || 0);
  }

  const score = passed * 100 - totalTime * 10;

  leaderboard[username] = {
    score: score.toFixed(2),
  };

  res.send(`
    <h2>Submitted Successfully ✅</h2>
    <p>Score: ${score.toFixed(2)}</p>
    <a href="/leaderboard">Leaderboard</a>
  `);
});

// LEADERBOARD
app.get("/leaderboard", (req, res) => {
  let html = "<h2>🏆 Leaderboard</h2>";

  for (let [name, data] of Object.entries(leaderboard)) {
    html += `<p>${name} : ${data.score}</p>`;
  }

  res.send(html);
});

app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});

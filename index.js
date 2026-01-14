const express = require("express");
const { exec, execSync } = require("child_process");
const fs = require("fs");

const app = express();

/* ================= FORCE UPDATE yt-dlp ================= */
try {
  execSync("yt-dlp -U", { stdio: "ignore" });
} catch (e) {
  console.log("yt-dlp update skipped");
}

/* ================= ROOT ================= */
app.get("/", (req, res) => {
  res.json({ status: true, message: "YT-DLP MP3 API Running" });
});

/* ================= MP3 ROUTE ================= */
app.get("/mp3", (req, res) => {
  const url = req.query.url;
  if (!url)
    return res.status(400).json({ status: false, message: "Missing url" });

  const id = Date.now();
  const out = `/tmp/${id}.mp3`;

  // ⚠️ SIMPLE & SAFE COMMAND (NO EXTRA FLAGS)
  const cmd = `yt-dlp -x --audio-format mp3 --no-playlist -o "${out}" "${url}"`;

  exec(cmd, { timeout: 180000 }, (err, stdout, stderr) => {
    if (err) {
      console.error("YT-DLP STDERR:", stderr);
      return res.status(500).json({
        status: false,
        message: "yt-dlp failed",
        error: stderr?.toString().slice(0, 300)
      });
    }

    if (!fs.existsSync(out)) {
      return res
        .status(500)
        .json({ status: false, message: "MP3 not created" });
    }

    res.json({
      status: true,
      title: "YouTube MP3",
      mp3: `/download/${id}.mp3`
    });
  });
});

/* ================= DOWNLOAD ROUTE ================= */
app.get("/download/:file", (req, res) => {
  const file = `/tmp/${req.params.file}`;
  if (!fs.existsSync(file)) return res.sendStatus(404);

  res.download(file, () => {
    try {
      fs.unlinkSync(file);
    } catch {}
  });
});

/* ================= START ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on", PORT));

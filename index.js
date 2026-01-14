const express = require("express");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.json({ status: true, message: "YT-DLP MP3 API Running" });
});

app.get("/mp3", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url)
      return res.status(400).json({ status: false, error: "URL required" });

    const output = path.join(__dirname, `audio_${Date.now()}.mp3`);

    const command = `yt-dlp -x --audio-format mp3 --audio-quality 0 -o "${output}" "${url}"`;

    exec(command, async (err) => {
      if (err || !fs.existsSync(output)) {
        console.error("yt-dlp error:", err);
        return res.status(500).json({ status: false, error: "Download failed" });
      }

      res.sendFile(output, () => {
        fs.unlinkSync(output);
      });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: false, error: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`YT-DLP MP3 API running on port ${PORT}`);
});

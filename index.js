const express = require("express");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.json({ status: true, message: "YT-DLP MP3 API Running" });
});

app.get("/mp3", (req, res) => {
  const url = req.query.url;
  if (!url)
    return res.status(400).json({ status: false, error: "URL required" });

  const file = `audio_${Date.now()}.mp3`;
  const output = path.join(__dirname, file);

  const cmd = `
yt-dlp \
-f bestaudio/best \
--extract-audio \
--audio-format mp3 \
--audio-quality 0 \
--no-playlist \
--extractor-args "youtube:player_client=android" \
--user-agent "Mozilla/5.0 (Linux; Android 10)" \
-o "${output}" \
"${url}"
`;

  exec(cmd, { maxBuffer: 1024 * 1024 * 100 }, (err) => {
    if (err || !fs.existsSync(output)) {
      console.error("YT-DLP ERROR:", err);
      return res.status(500).json({
        status: false,
        error: "Download failed"
      });
    }

    res.sendFile(output, () => fs.unlinkSync(output));
  });
});

app.listen(PORT, () => {
  console.log("YT-DLP MP3 API running on port", PORT);
});

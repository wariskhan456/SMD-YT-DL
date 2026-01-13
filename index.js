const express = require("express")
const { spawn } = require("child_process")
const path = require("path")

const app = express()
const PORT = process.env.PORT || 3000

app.get("/", (req, res) => {
  res.send("✅ yt-dlp MP3 API is running")
})

app.get("/mp3", (req, res) => {
  const url = req.query.url
  if (!url) return res.status(400).json({ error: "No url provided" })

  res.setHeader("Content-Type", "audio/mpeg")
  res.setHeader("Content-Disposition", "inline; filename=song.mp3")

  // 👉 yt-dlp wrapper path (repo ke andar)
  const ytDlpPath = path.join(__dirname, "bin", "yt-dlp")

  const yt = spawn("bash", [
    ytDlpPath,
    "-f", "bestaudio",
    "-x",
    "--audio-format", "mp3",
    "-o", "-",
    url
  ])

  yt.stdout.pipe(res)

  yt.stderr.on("data", data => {
    console.error("yt-dlp stderr:", data.toString())
  })

  yt.on("error", err => {
    console.error("yt-dlp spawn error:", err)
    if (!res.headersSent) {
      res.status(500).end("yt-dlp failed to start")
    }
  })

  yt.on("close", code => {
    if (code !== 0) {
      console.error("yt-dlp exited with code", code)
    }
    res.end()
  })
})

app.listen(PORT, () => {
  console.log("Server running on", PORT)
})

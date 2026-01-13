const express = require("express")
const { spawn } = require("child_process")

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

  const yt = spawn("yt-dlp", [
    "-f", "bestaudio",
    "-x",
    "--audio-format", "mp3",
    "-o", "-",
    url
  ])

  yt.stdout.pipe(res)

  yt.stderr.on("data", d => {
    console.error("yt-dlp error:", d.toString())
  })

  yt.on("close", () => {
    res.end()
  })
})

app.listen(PORT, () => {
  console.log("Server running on", PORT)
})

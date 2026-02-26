const express = require("express");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// test route
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// carica automaticamente i file API
const files = fs.readdirSync(__dirname).filter(f => f.endsWith(".js") && f !== "server.js");

files.forEach(file => {
  const route = "/api/" + file.replace(".js", "");

  try {
    const handler = require(path.join(__dirname, file));

    app.all(route, (req, res) => {
      try {
        if (typeof handler === "function") {
          return handler(req, res);
        }
        if (handler && typeof handler.default === "function") {
          return handler.default(req, res);
        }

        res.status(500).json({ error: "Invalid export in " + file });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
      }
    });

    console.log("✔ Loaded:", route);
  } catch (e) {
    console.error("❌ Error loading", file, e);
  }
});

app.listen(3001, () => {
  console.log("🚀 API running on http://localhost:3001");
});

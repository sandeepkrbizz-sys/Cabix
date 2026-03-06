import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  let db: any;
  try {
    db = new Database("rides.db");
    console.log("Database initialized");
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        phone TEXT UNIQUE,
        name TEXT,
        role TEXT, -- 'user', 'pilot', 'admin'
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_payment_methods (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        type TEXT, -- 'upi', 'card', 'wallet'
        details TEXT, -- JSON or string details
        is_default INTEGER DEFAULT 0,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS otp_codes (
        phone TEXT PRIMARY KEY,
        code TEXT,
        expires_at DATETIME
      );

      CREATE TABLE IF NOT EXISTS rides (
        id TEXT PRIMARY KEY,
        pickup TEXT,
        pickup_lat REAL,
        pickup_lng REAL,
        destination TEXT,
        dest_lat REAL,
        dest_lng REAL,
        vehicle_type TEXT,
        fare REAL,
        payment_method TEXT,
        status TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (err) {
    console.error("Failed to initialize database:", err);
  }

  app.use(express.json());

  // Auth Routes
  app.post("/api/auth/send-otp", (req, res) => {
    const { phone } = req.body;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60000).toISOString(); // 5 mins
    
    try {
      db.prepare("INSERT OR REPLACE INTO otp_codes (phone, code, expires_at) VALUES (?, ?, ?)").run(phone, code, expiresAt);
      console.log(`OTP for ${phone}: ${code}`); // Log to console for testing
      res.json({ success: true, message: "OTP sent successfully (Check server logs)" });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post("/api/auth/verify-otp", (req, res) => {
    const { phone, code, role, name } = req.body;
    try {
      const otp = db.prepare("SELECT * FROM otp_codes WHERE phone = ? AND code = ?").get(phone, code);
      
      if (!otp) {
        return res.status(400).json({ success: false, message: "Invalid OTP" });
      }
      
      if (new Date(otp.expires_at) < new Date()) {
        return res.status(400).json({ success: false, message: "OTP expired" });
      }
      
      // Check if user exists
      let user = db.prepare("SELECT * FROM users WHERE phone = ?").get(phone);
      
      if (!user) {
        const id = Math.random().toString(36).substr(2, 9);
        db.prepare("INSERT INTO users (id, phone, name, role) VALUES (?, ?, ?, ?)").run(id, phone, name || "User", role || "user");
        user = { id, phone, name: name || "User", role: role || "user" };
      }
      
      // Clear OTP
      db.prepare("DELETE FROM otp_codes WHERE phone = ?").run(phone);
      
      res.json({ success: true, user });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.patch("/api/users/:id", (req, res) => {
    const { id } = req.params;
    const { name, phone } = req.body;
    try {
      db.prepare("UPDATE users SET name = ?, phone = ? WHERE id = ?").run(name, phone, id);
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
      res.json({ success: true, user });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  });

  app.get("/api/users/:id/payment-methods", (req, res) => {
    const { id } = req.params;
    try {
      const methods = db.prepare("SELECT * FROM user_payment_methods WHERE user_id = ?").all();
      res.json(methods);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post("/api/users/:id/payment-methods", (req, res) => {
    const { id } = req.params;
    const { type, details } = req.body;
    const methodId = Math.random().toString(36).substr(2, 9);
    try {
      db.prepare("INSERT INTO user_payment_methods (id, user_id, type, details) VALUES (?, ?, ?, ?)").run(methodId, id, type, details);
      res.json({ success: true, id: methodId });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.delete("/api/payment-methods/:id", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM user_payment_methods WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // API Routes
  app.get("/api/rides", (req, res) => {
    try {
      const rides = db.prepare("SELECT * FROM rides ORDER BY created_at DESC").all();
      res.json(rides);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post("/api/rides", (req, res) => {
    const { id, pickup, pickupCoords, destination, destCoords, vehicle_type, fare, paymentMethod } = req.body;
    try {
      const stmt = db.prepare(
        "INSERT INTO rides (id, pickup, pickup_lat, pickup_lng, destination, dest_lat, dest_lng, vehicle_type, fare, payment_method, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      );
      stmt.run(id, pickup, pickupCoords[0], pickupCoords[1], destination, destCoords[0], destCoords[1], vehicle_type, fare, paymentMethod, "pending");
      res.status(201).json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.patch("/api/rides/:id", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
      const stmt = db.prepare("UPDATE rides SET status = ? WHERE id = ?");
      stmt.run(status, id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

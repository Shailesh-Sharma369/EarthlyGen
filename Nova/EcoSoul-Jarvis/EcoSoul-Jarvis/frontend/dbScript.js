// dbScript.js
require("dotenv").config();
const fs = require("fs");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const csv = require("csv-parser");

const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

if (!MONGO_URI) {
  console.error("❌ MONGO_URI not set in .env. Please add it and rerun.");
  process.exit(1);
}

// --------- Mongoose connection ----------
async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB Atlas");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
}

// --------- Schemas & Models ----------
const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  source: { type: String, default: "manual" },
  isAdmin: { type: Boolean, default: false },
});

const loginLogSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  email: String,
  loginTime: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);
const LoginLog = mongoose.model("LoginLog", loginLogSchema);

// --------- Utility functions ----------

// Create a new user (with hashed password)
async function createUser({
  fullName,
  email,
  password,
  source = "manual",
  isAdmin = false,
}) {
  if (!fullName || !email || !password)
    throw new Error("fullName, email and password required");

  const existing = await User.findOne({ email });
  if (existing) throw new Error("User already exists with this email");

  const hashed = await bcrypt.hash(password, 10);
  const u = new User({ fullName, email, password: hashed, source, isAdmin });
  await u.save();
  console.log("✔ User created:", email);
  return u;
}

// Sign in a user (verify password) and log login
async function signIn({ email, password }) {
  const user = await User.findOne({ email });
  if (!user) throw new Error("Invalid email or password");

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw new Error("Invalid email or password");

  await new LoginLog({ userId: user._id, email: user.email }).save();

  const token = jwt.sign(
    { userId: user._id, isAdmin: user.isAdmin },
    JWT_SECRET,
    { expiresIn: "1d" }
  );
  console.log("✔ Signin success:", email);
  return {
    token,
    user: { fullName: user.fullName, email: user.email, isAdmin: user.isAdmin },
  };
}

// List all users (exclude password)
async function listUsers() {
  const users = await User.find({}, "-password").lean();
  console.log("---- Users ----");
  console.table(users);
  return users;
}

// List login logs (latest first)
async function listLoginLogs(limit = 50) {
  const logs = await LoginLog.find()
    .sort({ loginTime: -1 })
    .limit(limit)
    .lean();
  console.log("---- Login Logs ----");
  console.table(logs);
  return logs;
}

// Import users from CSV (passwords will be hashed)
async function importCsvToUsers(csvFilePath) {
  if (!fs.existsSync(csvFilePath))
    throw new Error("CSV file not found: " + csvFilePath);

  const rows = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on("data", (data) => rows.push(data))
      .on("end", async () => {
        console.log(`Read ${rows.length} rows from ${csvFilePath}`);
        try {
          for (const row of rows) {
            const fullName = row.fullName || row.name || "NoName";
            const email = row.email?.trim();
            const password = row.password || "123456";
            const source = row.source || "import";
            const isAdmin =
              (row.isAdmin || "false").toString().toLowerCase() === "true";

            if (!email) {
              console.warn("Skipping row without email:", row);
              continue;
            }

            const existing = await User.findOne({ email });
            if (existing) {
              console.log("Skipping existing user:", email);
              continue;
            }

            const hashed = await bcrypt.hash(password, 10);
            const u = new User({
              fullName,
              email,
              password: hashed,
              source,
              isAdmin,
            });
            await u.save();
            console.log("Inserted:", email);
          }
          console.log("✅ CSV import completed");
          resolve();
        } catch (err) {
          reject(err);
        }
      })
      .on("error", (err) => reject(err));
  });
}

// --------- Demo runner ----------
async function runDemo() {
  await connectDB();
  try {
    // Examples: Uncomment to use
    // await createUser({ fullName: "Ryan Sharma", email: "ryan@gmail.com", password: "123456", source: "website" });
    // await signIn({ email: "ryan@gmail.com", password: "123456" });
    // await listUsers();
    // await listLoginLogs(20);
    // await importCsvToUsers("raw_users.csv");

    console.log("\n✅ Ready. Edit runDemo() to perform actions.");
  } catch (err) {
    console.error("Error:", err.message || err);
  } finally {
    await mongoose.disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  runDemo();
}

// Export for use in other scripts
module.exports = {
  connectDB,
  createUser,
  signIn,
  listUsers,
  listLoginLogs,
  importCsvToUsers,
};

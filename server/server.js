
import express from "express";
import mongoose from "mongoose";
import "dotenv/config";
import cors from "cors";
import bcrypt from "bcryptjs";
import User from "./models/User.js";
import jwt from "jsonwebtoken";
import Transaction from "./models/Transaction.js";
import authMiddleware from "./middleware/authMiddleware.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Check backend
app.get("/", (req, res) => {
  res.send("Expense Tracker Backend is working!");
});


// Get logged-in user's transactions
app.get("/api/transactions", authMiddleware, async (req, res) => {
  try {
    const transactions = await Transaction.find({
      user: req.user.userId,
    }).sort({
      createdAt: -1,
    });

    res.json(transactions);

  } catch (error) {
    console.error("Failed to load transactions:", error);

    res.status(500).json({
      message: "Failed to load transactions",
    });
  }
});

  
/* Register a new user */
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (
      !name?.trim() ||
      !email?.trim() ||
      !password ||
      password.length < 8
    ) {
      return res.status(400).json({
        message: "Name, valid email and password of at least 8 characters are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email is already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    res.status(201).json({
      message: "Account created successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Email is already registered",
      });
    }

    console.error("Registration failed:", error);
    res.status(500).json({
      message: "Failed to create account",
    });
  }
});


/* Login an existing user */
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check required fields
    if (!email?.trim() || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // Find user by email
    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Compare entered password with hashed password
    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

// Login successful
const token = jwt.sign(
  { userId: user._id },
  process.env.JWT_SECRET,
  { expiresIn: "7d" }
);

res.status(200).json({
  message: "Login successful",
  token,
  user: {
    id: user._id,
    name: user.name,
    email: user.email,
  },
});

  } catch (error) {
    console.error("Login failed:", error);

    res.status(500).json({
      message: "Login failed",
    });
  }
});



// Add a transaction to MongoDB
app.post("/api/transactions", authMiddleware, async (req, res) => {
  try {
    const { name, amount, type, category, date } = req.body;

    const isValidDate =
      date === undefined ||
      date === null ||
      date === "" ||
      !Number.isNaN(Date.parse(date));

    if (
      !name?.trim() ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0 ||
      !["income", "expense"].includes(type) ||
      !category?.trim() ||
      !isValidDate
    ) {
      return res.status(400).json({
        message: "Please provide a valid name, amount, type and category",
      });
    }

    const transaction = await Transaction.create({
      name: name.trim(),
      amount: Number(amount),
      type,
      category: category.trim(),
      ...(date && { date }),
      user: req.user.userId,
    });

    res.status(201).json(transaction);

  } catch (error) {
    console.error("Failed to save transaction:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Invalid transaction details",
      });
    }

    res.status(500).json({
      message: "Failed to save transaction",
    });
  }
});


// Update an existing transaction
app.put("/api/transactions/:id", authMiddleware, async (req, res) => {
  try {
    const { name, amount, type, category, date } = req.body;

    const isValidDate =
      date === undefined ||
      date === null ||
      date === "" ||
      !Number.isNaN(Date.parse(date));

    if (
      !name?.trim() ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0 ||
      !["income", "expense"].includes(type) ||
      !category?.trim() ||
      !isValidDate
    ) {
      return res.status(400).json({
        message: "Please provide valid transaction details including category",
      });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid transaction ID",
      });
    }

    const transaction = await Transaction.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user.userId,
      },
      {
        name: name.trim(),
        amount: Number(amount),
        type,
        category: category.trim(),
        ...(date && { date }),
      },
      { returnDocument: "after", runValidators: true }
    );

    if (!transaction) {
      return res.status(404).json({
        message: "Transaction not found",
      });
    }

    res.json(transaction);

  } catch (error) {
    console.error("Failed to update transaction:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Invalid transaction details",
      });
    }

    res.status(500).json({
      message: "Failed to update transaction",
    });
  }
});


// Delete a transaction
app.delete("/api/transactions/:id", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid transaction ID",
      });
    }

    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!transaction) {
      return res.status(404).json({
        message: "Transaction not found",
      });
    }

    res.json({
      message: "Transaction deleted successfully",
    });

  } catch (error) {
    console.error("Failed to delete transaction:", error);

    res.status(500).json({
      message: "Failed to delete transaction",
    });
  }
});



// Connect MongoDB
await mongoose.connect(process.env.MONGODB_URI);

console.log("MongoDB connected successfully!");

// Export Express app for Vercel
export default app;
// src/login.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const { User } = require("./config");

// GET /login - render login form
router.get("/", (req, res) => {
  res.render("login", { errorMessage: "" });
});

// POST /login - handle login logic
router.post("/", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.body.username });

    if (!user) {
      return res.render("login", { errorMessage: "Invalid Username" });
    }

    const isPasswordMatch = await bcrypt.compare(req.body.password, user.password);

    if (isPasswordMatch) {
      // ✅ Set session values
      req.session.isAuth = true;
      req.session.username = user.username;

      res.redirect("/"); // Login success
    } else {
      res.render("login", { errorMessage: "Invalid Login. Please try again!" });
    }
  } catch (err) {
    console.error("Login error:", err);
    res.render("login", { errorMessage: "Login failed. Server error." });
  }
});

module.exports = router;

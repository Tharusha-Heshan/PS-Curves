
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const { User } = require("./config");


router.get("/", (req, res) => {
  res.render("signup", { success: false, errorMessage: "" });
});


router.post("/", async (req, res) => {
  try {
    const data = {
      username: req.body.username,
      email: req.body.email,
      password: req.body.password,
    };

    const existingUser = await User.findOne({ username: data.username });

    if (existingUser) {
      return res.render("signup", {
        success: false,
        errorMessage: "User already exists",
      });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(data.password, saltRounds);
    data.password = hashedPassword;

    const newUser = await User.insertMany(data);
    console.log("User saved:", newUser);
    res.render("signup", { success: true, errorMessage: "" });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).send("Signup failed. Server error.");
  }
});

module.exports = router;

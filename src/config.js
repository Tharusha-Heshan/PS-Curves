const mongoose = require("mongoose");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);

require('dotenv').config();

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Database connected successfully");
  })
  .catch(() => {
    console.log("Database cannot be connected");
  });

const store = new MongoDBStore({
  uri: process.env.MONGODB_URI,
  collection: "sessions",
});

// User Schema
const LoginSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  cart: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      quantity: { type: Number, default: 1 }
    }
  ]
});

const User = mongoose.model("User", LoginSchema);

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  imageUrl: { type: String, required: true },
  newprice: { type: Number, required: true },
  oldprice: { type: Number },
  description: { type: String }
}, { timestamps: true });

// Order Schema
const OrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      name: String,
      price: Number,
      quantity: Number
    }
  ],
  shippingDetails: {
    fullName: String,
    email: String,
    streetAddress: String,
    city: String,
    postalCode: String,
    phone: String,
    paymentMethod: String
  },
  totalAmount: Number,
  createdAt: { type: Date, default: Date.now }
});

const Order = mongoose.model("Order", OrderSchema);


const Product = mongoose.model("Product", ProductSchema);

module.exports = { User, Product, Order, store };
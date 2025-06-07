const express = require("express");
const router = express.Router();
const { Product, User } = require('./config');

// Show cart items (GET /cart)
router.get("/", async (req, res) => {
  if (!req.session.isAuth || !req.session.username) {
    return res.redirect('/login');
  }

  try {
    const user = await User.findOne({ username: req.session.username }).populate('cart.productId');

    if (!user || !user.cart) {
      return res.render("cart", { cart: [] });
    }

    const cart = user.cart.map(item => {
      const product = item.productId;
      return {
        productId: product._id,
        name: product.name,
        price: product.newprice,
        quantity: item.quantity,
        total: product.newprice * item.quantity
      };
    });

    res.render("cart", { cart });
  } catch (err) {
    console.error("Error loading cart:", err);
    res.status(500).send("Error loading cart");
  }
});

// Add to cart (POST /cart/add/:id)
router.post('/add/:id', async (req, res) => {
  if (!req.session.isAuth || !req.session.username) {
    return res.redirect('/login');
  }

  const productId = req.params.id;

  try {
    const product = await Product.findById(productId);
    if (!product) return res.status(404).send("Product not found");

    // Try to increment quantity if product already in cart
    const updatedUser = await User.findOneAndUpdate(
      { username: req.session.username, 'cart.productId': productId },
      { $inc: { 'cart.$.quantity': 1 } },
      { new: true }
    );

    if (!updatedUser) {
      // Product not in cart, so add new item
      await User.findOneAndUpdate(
        { username: req.session.username },
        { $push: { cart: { productId, quantity: 1 } } }
      );
    }

    res.json({ success: true });

  } catch (err) {
    console.error("Error adding to cart:", err);
    res.status(500).send("Error adding to cart");
  }
});

// Update cart item quantity (POST /cart/update)
router.post('/update', async (req, res) => {
  const { productId, action } = req.body;

  if (!req.session.isAuth || !req.session.username) {
    return res.status(401).json({ success: false, message: "Not authenticated" });
  }

  try {
    // Get current user with cart populated
    const user = await User.findOne({ username: req.session.username }).populate('cart.productId');
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const cartItemIndex = user.cart.findIndex(item => item.productId._id.toString() === productId);
    if (cartItemIndex === -1) {
      return res.status(404).json({ success: false, message: "Item not found in cart" });
    }

    let updatedCart = [...user.cart];

    if (action === 'increase') {
      updatedCart[cartItemIndex].quantity += 1;
    } else if (action === 'decrease') {
      updatedCart[cartItemIndex].quantity -= 1;
      if (updatedCart[cartItemIndex].quantity <= 0) {
        updatedCart.splice(cartItemIndex, 1);
      }
    }

    // Prepare cart array for DB update (unpopulated productId)
    const cartToUpdate = updatedCart.map(item => ({
      productId: item.productId._id ? item.productId._id : item.productId,
      quantity: item.quantity,
    }));

    // Atomically update user cart in DB
    const updatedUser = await User.findOneAndUpdate(
      { username: req.session.username },
      { cart: cartToUpdate },
      { new: true }
    ).populate('cart.productId');

    // Calculate totals
    const recalculatedCart = updatedUser.cart.map(item => ({
      price: item.productId.newprice,
      quantity: item.quantity
    }));

    const grandTotal = recalculatedCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Check if item removed
    const removed = !updatedUser.cart.some(item => item.productId._id.toString() === productId);

    // Get new quantity or 0 if removed
    const newQuantity = removed ? 0 : updatedUser.cart.find(item => item.productId._id.toString() === productId).quantity;

    res.json({
      success: true,
      removed,
      newQuantity,
      itemTotal: removed ? 0 : updatedUser.cart.find(item => item.productId._id.toString() === productId).productId.newprice * newQuantity,
      grandTotal
    });

  } catch (err) {
    console.error("Error updating cart:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;

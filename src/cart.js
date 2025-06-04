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

    const user = await User.findOne({ username: req.session.username });
    if (!user) return res.status(404).send("User not found");

    const existingItem = user.cart.find(item => item.productId.toString() === productId);

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      user.cart.push({ productId, quantity: 1 });
    }

    await user.save();

    res.redirect('/store');
  } catch (err) {
    console.error("Error adding to cart:", err);
    res.status(500).send("Error adding to cart");
  }
});

// Update quantity (POST /cart/update)
router.post('/update', async (req, res) => {
  const { productId, action } = req.body;

  if (!req.session.isAuth || !req.session.username) {
    return res.status(401).json({ success: false, message: "Not authenticated" });
  }

  try {
    const user = await User.findOne({ username: req.session.username }).populate('cart.productId');
    const cartItemIndex = user.cart.findIndex(item => item.productId._id.toString() === productId);

    if (cartItemIndex === -1) {
      return res.status(404).json({ success: false, message: "Item not found in cart" });
    }

    const cartItem = user.cart[cartItemIndex];

    if (action === 'increase') {
      cartItem.quantity += 1;
    } else if (action === 'decrease') {
      cartItem.quantity -= 1;

      if (cartItem.quantity <= 0) {
        user.cart.splice(cartItemIndex, 1); // remove the item from cart
      }
    }

    await user.save();

    // Recalculate totals
    const updatedCart = user.cart.map(item => ({
      price: item.productId.newprice,
      quantity: item.quantity
    }));

    const grandTotal = updatedCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    res.json({
      success: true,
      removed: cartItem.quantity <= 0,
      newQuantity: cartItem.quantity,
      itemTotal: cartItem.productId.newprice * (cartItem.quantity || 0),
      grandTotal
    });

  } catch (err) {
    console.error("Error updating cart:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;

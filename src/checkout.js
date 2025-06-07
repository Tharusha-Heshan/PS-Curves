const express = require('express');
const router = express.Router();
const { User, Product, Order } = require('./config');


app.use(express.urlencoded({ extended: true }));


app.get('/checkout', async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.redirect('/login');
    }

    const user = await User.findById(userId).populate('cart.productId');

    if (!user) {
      return res.redirect('/login');
    }

    const cart = user.cart.map(item => {
      const product = item.productId;
      const price = product.newprice || 0;
      const quantity = item.quantity || 1;

      return {
        name: product.name,
        price: price,
        quantity: quantity,
        total: price * quantity,
      };
    });


    const grandTotal = cart.reduce((acc, item) => acc + item.total, 0);

    res.render('checkout', { cart, grandTotal });
  } catch (err) {
    console.error(err);
    res.status(500).send("An error occurred while loading checkout.");
  }
});


app.post('/place-order', async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.redirect('/login');
    }

    const user = await User.findById(userId).populate('cart.productId');
    if (!user || user.cart.length === 0) {
      return res.status(400).send("Your cart is empty.");
    }


    const items = user.cart.map(item => {
      const product = item.productId;
      return {
        productId: product._id,
        name: product.name,
        price: product.newprice,
        quantity: item.quantity
      };
    });


    const totalAmount = items.reduce((acc, item) => acc + item.price * item.quantity, 0);


    const order = new Order({
      userId: user._id,
      items: items,
      shippingDetails: {
        fullName: req.body.fullName,
        email: req.body.email,
        streetAddress: req.body.streetAddress,
        city: req.body.city,
        postalCode: req.body.postalCode,
        phone: req.body.phone,
        paymentMethod: req.body.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Unknown'
      },
      totalAmount: totalAmount
    });

    await order.save();


    user.cart = [];
    await user.save();


    res.send("<h2>Order placed successfully!</h2><p>Thank you for your purchase.</p>");

  } catch (err) {
    console.error(err);
    res.status(500).send("Something went wrong while placing your order.");
  }
});

module.exports = app;

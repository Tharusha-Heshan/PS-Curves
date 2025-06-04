const { User } = require('./config');

app.get('/checkout', async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.redirect('/login');
    }

    const user = await User.findById(userId).populate('cart.productId');

    const cart = user.cart.map(item => {
      const product = item.productId;
      const price = product.newprice || 0; // use newprice from Product schema
      const quantity = item.quantity || 1;

      return {
        name: product.name,
        price: price,
        quantity: quantity,
        total: price * quantity,
      };
    });

    res.render('checkout', { cart });
  } catch (err) {
    console.error(err);
    res.status(500).send("An error occurred while loading checkout.");
  }
});

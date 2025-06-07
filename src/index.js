const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');

const { User, Product, Order, store } = require("./config");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Use session with MongoDB store
app.use(session({
  secret: process.env.SECRET_KEY || "default_secret_key",
  resave: false,
  saveUninitialized: false,
  store: store,
}));

app.use((req, res, next) => {
  res.locals.isAuth = req.session.isAuth || false;
  res.locals.username = req.session.username || null;
  next();
});

app.use(express.static(path.join(__dirname, '..', 'public')));

// Set EJS view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

// Home route
app.get("/", async (req, res) => {
  try {
    const recentProducts = await Product.find().sort({ createdAt: -1 }).limit(5);
    res.render("home", { recentProducts, isAuth: req.session.isAuth || false, username: req.session.username || null });
  } catch (error) {
    console.error("Error fetching recent products:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get('/contact', (req, res) => {
  const isAuth = req.session.isAuth || false;
  const username = req.session.username || null;

  res.render('contact', { isAuth, username });
});



app.get('/about', (req, res) => {
  res.render('about', {
    isAuth: req.session.isAuth || false,
    username: req.session.username || null
  });
});


// Checkout page
app.get('/checkout', async (req, res) => {
  if (!req.session.isAuth || !req.session.username) {
    return res.redirect('/login');
  }

  try {
    const user = await User.findOne({ username: req.session.username }).populate('cart.productId');
    
    if (!user || !user.cart) {
      return res.render('checkout', { cart: [], grandTotal: 0 });
    }

    let grandTotal = 0;

    const cartWithDetails = user.cart.map(item => {
      const price = item.productId?.newprice || 0;
      const quantity = item.quantity || 1;
      const total = price * quantity;
      grandTotal += total;

      return {
        name: item.productId?.name || 'Unknown Product',
        price,
        quantity,
        total
      };
    });

    res.render('checkout', {
      cart: cartWithDetails,
      grandTotal
    });

  } catch (error) {
    console.error("Error loading checkout:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error("Logout error:", err);
      return res.redirect('/');
    }
    res.redirect('/');
  });
});

// Store page
app.get('/store', async (req, res) => {
  try {
    const products = await Product.find();
    res.render('store', { 
      products, 
      isAuth: req.session.isAuth || false, 
      username: req.session.username || null 
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Product detail page
app.get('/product/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).send('Product not found');
    }
    res.render('product-detail', { 
      product,
      isAuth: req.session.isAuth || false,
      username: req.session.username || null
    });
  } catch (error) {
    console.error("Error fetching product details:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Import routes
const signupRoute = require("./signup");
const loginRoute = require("./login");
const addProductRoute = require("./add-product");
const cartRoute = require("./cart");

// Use routes
app.use("/signup", signupRoute);
app.use("/login", loginRoute);
app.use("/add-product", addProductRoute);
app.use("/cart", cartRoute);

app.get('/order-confirmation', (req, res) => {
  res.render('order-confirmation', {
    isAuth: req.session.isAuth || false,
    username: req.session.username || null
  });
});


// Place order route (POST /place-order)
app.post('/place-order', async (req, res) => {
  if (!req.session.isAuth || !req.session.username) {
    return res.status(401).send('Unauthorized: Please login to place an order.');
  }

  try {
    const user = await User.findOne({ username: req.session.username }).populate('cart.productId');
    if (!user || !user.cart || user.cart.length === 0) {
      return res.status(400).send('Your cart is empty.');
    }

    // Build order items array from user's cart
    const orderItems = user.cart.map(item => ({
      productId: item.productId._id,
      name: item.productId.name,
      price: item.productId.newprice,
      quantity: item.quantity
    }));

    // Calculate total amount
    const totalAmount = orderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    // Get shipping and payment info from the form POST data
    const {
      fullName,
      email,
      streetAddress,
      city,
      postalCode,
      phone,
      paymentMethod
    } = req.body;

    // Create new order document
    const newOrder = new Order({
      userId: user._id,
      items: orderItems,
      shippingDetails: {
        fullName,
        email,
        streetAddress,
        city,
        postalCode,
        phone,
        paymentMethod
      },
      totalAmount
    });

    await newOrder.save();

    // Clear user's cart
    user.cart = [];
    await user.save();

    // Redirect to home or order confirmation page
    res.redirect('/order-confirmation');

  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Start server
const port = 5000;
app.listen(port, () => {
  console.log(`Server running on port: ${port}`);
});

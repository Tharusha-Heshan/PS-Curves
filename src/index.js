const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');

const { User, Product, store } = require("./config"); // Ensure store is properly exported

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Use session with MongoDB store
app.use(session({
  secret: process.env.SECRET_KEY || "default_secret_key", // Use dotenv in production
  resave: false,
  saveUninitialized: false,
  store: store,
}));

// Make login data available in EJS views
app.use((req, res, next) => {
  res.locals.isAuth = req.session.isAuth || false;
  res.locals.username = req.session.username || null;
  next();
});

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// Set EJS view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

// Home route (only one, combined)
app.get("/", async (req, res) => {
  try {
    const recentProducts = await Product.find().sort({ createdAt: -1 }).limit(5);
    // Pass isAuth and username explicitly if needed (locals should work but just in case)
    res.render("home", { recentProducts, isAuth: req.session.isAuth || false, username: req.session.username || null });
  } catch (error) {
    console.error("Error fetching recent products:", error);
    res.status(500).send("Internal Server Error");
  }
});

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

// Product detail page — fix here to pass isAuth and username
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
const cartRoute = require("./cart");  // <-- Import cart route


// Use routes
app.use("/signup", signupRoute);
app.use("/login", loginRoute);
app.use("/add-product", addProductRoute);
app.use("/cart", cartRoute); // <-- Use cart route

// Start server
const port = 5000;
app.listen(port, () => {
  console.log(`Server running on port: ${port}`);
});

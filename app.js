const express = require('express');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const csurf = require('csurf');

const app = express();
const PORT = process.env.PORT || 3000;

const users = [
  { username: 'admin', password: 'password123' }
];

const contacts = [];

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.use(
  session({
    secret: 'super-secret-class-lab-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true
    }
  })
);

app.use(express.static(path.join(__dirname, 'public')));

const csrfProtection = csurf({ cookie: true });

// Route

// simple health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Logging in
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  req.session.user = { username: user.username };

  res.json({
    message: 'Logged in successfully',
    user: req.session.user
  });
});

// Logging out
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out' });
    }

    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

// Token
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Protected route
app.post('/contacts', csrfProtection, (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Session invalid or expired' });
  }

  const { name, phone } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and phone are required' });
  }

  const newContact = {
    id: contacts.length + 1,
    name,
    phone,
    createdBy: req.session.user.username
  };

  contacts.push(newContact);

  res.status(201).json({
    message: 'Contact added',
    contact: newContact
  });
});

// List route for verification
app.get('/contacts', (req, res) => {
  res.json({ contacts });
});

// CSRF error handler
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ error: 'Invalid or missing CSRF token' });
  }

  next(err);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
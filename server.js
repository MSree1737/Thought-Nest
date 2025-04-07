const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const pg = require('pg');
const path = require('path');
const cors = require('cors'); // Add this line

const app = express();
const PORT = 3000;

// Database connection
const db = new pg.Client({
  user: "postgres_blog",
  host: "demo-database-1.cjsaw4syam37.us-east-1.rds.amazonaws.com",
  database: "thought_nest_blog",
  password: "ikLDTgMBEP99aix6EFt9",
  port: 5432,
  ssl: {
    rejectUnauthorized: false
  }
});

// Connect to database
db.connect()
  .then(() => console.log('Connected to PostgreSQL database'))
  .catch(err => console.error('Connection error', err.stack));

// Middleware
app.use(cors()); // Add this line
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Endpoints

// User Registration
app.post('/api/register', async (req, res) => {
  const { email, password, username } = req.body;
  
  try {
      const userExists = await db.query('SELECT id FROM users WHERE email = $1', [email]);
      if (userExists.rows.length > 0) {
          return res.status(400).json({ error: 'Email already in use' });
      }

      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const userUsername = username || email.split('@')[0];
      const newUser = await db.query(
          'INSERT INTO users (email, password_hash, username) VALUES ($1, $2, $3) RETURNING id, email, username, age',
          [email, hashedPassword, userUsername]
      );

      res.status(201).json({ user: newUser.rows[0] });
  } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error during registration' });
  }
});

// User Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await db.query(
      'SELECT id, email, username, password_hash FROM users WHERE email = $1', 
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.query(
      'INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt]
    );

    res.json({ 
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      }
    });
    
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Get User Profile
app.get('/api/user/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const blogs = await db.query(
      'SELECT * FROM blogs WHERE user_email = $1 ORDER BY created_at DESC',
      [email]
    );

    res.json({
      user: result.rows[0],
      blogs: blogs.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update User Profile
app.put('/api/user/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const { username, age } = req.body;

    const result = await db.query(
      'UPDATE users SET username = $1, age = $2 WHERE email = $3 RETURNING *',
      [username, age, email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Single Blog
app.get('/api/blogs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'SELECT * FROM blogs WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create Blog
app.post('/api/blogs', async (req, res) => {
  try {
    const { title, content, user_email, category, image_url, published } = req.body;
    
    if (!title || !content || !user_email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await db.query(
      'INSERT INTO blogs (title, content, user_email, category, image_url, published) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [title, content, user_email, category, image_url, published || false]
    );

    res.json({ blog: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update Blog
app.put('/api/blogs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, image_url, published } = req.body;

    const result = await db.query(
      `UPDATE blogs 
       SET title = $1, content = $2, category = $3, image_url = $4, published = $5 
       WHERE id = $6 RETURNING *`,
      [title, content, category, image_url, published, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    res.json({ blog: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete Blog
app.delete('/api/blogs/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM blogs WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    res.json({ message: 'Blog deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Serve HTML pages
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'blog.html'));
});

app.get("/signin", (req, res) => {
  res.sendFile(path.join(__dirname, 'public/signin.html'));
});

app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, '/public/signup.html'));
});

app.get("/profile", (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
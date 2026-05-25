const validator = require('validator');

/**
 * Validation Middleware
 * Provides input validation for all critical endpoints
 */

// Email validation
exports.validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return { valid: false, message: 'Email is required' };
  }
  
  if (!validator.isEmail(email)) {
    return { valid: false, message: 'Invalid email format' };
  }
  
  return { valid: true };
};

// Password validation
exports.validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  
  return { valid: true };
};

// Signup validation middleware
exports.validateSignup = (req, res, next) => {
  const { fullName, email, password } = req.body;
  
  // Validate full name
  if (!fullName || fullName.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Full name must be at least 2 characters'
    });
  }
  
  // Validate email
  const emailCheck = exports.validateEmail(email);
  if (!emailCheck.valid) {
    return res.status(400).json({
      success: false,
      message: emailCheck.message
    });
  }
  
  // Validate password
  const passwordCheck = exports.validatePassword(password);
  if (!passwordCheck.valid) {
    return res.status(400).json({
      success: false,
      message: passwordCheck.message
    });
  }
  
  next();
};

// Signin validation middleware
exports.validateSignin = (req, res, next) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required'
    });
  }
  
  const emailCheck = exports.validateEmail(email);
  if (!emailCheck.valid) {
    return res.status(400).json({
      success: false,
      message: emailCheck.message
    });
  }
  
  next();
};

// Product validation
exports.validateProduct = (req, res, next) => {
  const { name, price, stock, category } = req.body;
  
  if (!name || name.trim().length < 3) {
    return res.status(400).json({
      success: false,
      message: 'Product name must be at least 3 characters'
    });
  }
  
  if (typeof price !== 'number' || price < 0) {
    return res.status(400).json({
      success: false,
      message: 'Price must be a positive number'
    });
  }
  
  if (typeof stock !== 'number' || stock < 0) {
    return res.status(400).json({
      success: false,
      message: 'Stock must be a non-negative number'
    });
  }
  
  const validCategories = ['Eco', 'Kitchen', 'Fashion', 'Grocery', 'Other'];
  if (category && !validCategories.includes(category)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid category'
    });
  }
  
  next();
};

// Cart item validation
exports.validateCartItem = (req, res, next) => {
  const { productId, quantity } = req.body;
  
  if (!productId) {
    return res.status(400).json({
      success: false,
      message: 'Product ID is required'
    });
  }
  
  const qty = parseInt(quantity);
  if (isNaN(qty) || qty < 1 || qty > 100) {
    return res.status(400).json({
      success: false,
      message: 'Quantity must be between 1 and 100'
    });
  }
  
  req.body.quantity = qty; // Sanitize
  next();
};

// Order validation
exports.validateOrder = (req, res, next) => {
  const { name, email, amount, items } = req.body;
  
  if (!name || name.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Name is required'
    });
  }
  
  const emailCheck = exports.validateEmail(email);
  if (!emailCheck.valid) {
    return res.status(400).json({
      success: false,
      message: emailCheck.message
    });
  }
  
  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid order amount'
    });
  }
  
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Order must contain at least one item'
    });
  }
  
  // Validate each item
  for (const item of items) {
    if (!item.productId || !item.name || typeof item.price !== 'number' || typeof item.qty !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Invalid item data'
      });
    }
    
    if (item.price < 0 || item.qty < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid item price or quantity'
      });
    }
  }
  
  next();
};

// Post validation
exports.validatePost = (req, res, next) => {
  const { text, image } = req.body;
  
  if (!text || text.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Post text is required'
    });
  }
  
  if (text.length > 5000) {
    return res.status(400).json({
      success: false,
      message: 'Post text too long (max 5000 characters)'
    });
  }
  
  if (image && !validator.isURL(image)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid image URL'
    });
  }
  
  next();
};

// Comment validation
exports.validateComment = (req, res, next) => {
  const { text } = req.body;
  
  if (!text || text.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Comment text is required'
    });
  }
  
  if (text.length > 1000) {
    return res.status(400).json({
      success: false,
      message: 'Comment too long (max 1000 characters)'
    });
  }
  
  next();
};

// MongoDB ObjectId validation
exports.validateObjectId = (paramName) => {
  return (req, res, next) => {
    const id = req.params[paramName];
    const mongoose = require('mongoose');
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName} format`
      });
    }
    
    next();
  };
};

// Sanitize HTML to prevent XSS
exports.sanitizeHTML = (text) => {
  if (!text) return text;
  
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Sanitize user input middleware
exports.sanitizeInput = (req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = exports.sanitizeHTML(req.body[key]);
      }
    });
  }
  next();
};

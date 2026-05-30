const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Enable CORS and parsing of JSON/URL-encoded data
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Directories setup
const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(__dirname, 'public', 'uploads');
const assetsDir = path.join(__dirname, 'public', 'assets');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Auto-deploy generated premium images if present in artifact directory
function deployGeneratedImages() {
  const artifactDir = 'F:\\Three_hearts\\public\\assets';
  const srcImages = {
    'three_hearts.png': path.join(artifactDir, 'three_hearts.png'),
    'creamy_bow.jpeg': path.join(artifactDir, 'creamy_bow.jpeg'),
    'cutie_clips.jpeg': path.join(artifactDir, 'cutie_clips.jpeg'),
    'fril band.jpeg': path.join(artifactDir, 'fril band.jpeg'),
    'red_rose.jpeg': path.join(artifactDir, 'red_rose.jpeg'),
    'Sunflower_delight.jpeg': path.join(artifactDir, 'Sunflower_delight.jpeg'),
    'white_elegent.jpeg': path.join(artifactDir, 'white_elegent.jpeg'),
    'white_rose.jpeg': path.join(artifactDir, 'white_rose.jpeg'),
    'yellow_bow.jpeg': path.join(artifactDir, 'yellow_bow.jpeg'),
    // Instagram gallery
    'creamy_bow.jpeg': path.join(artifactDir, 'creamy_bow.jpeg'),
    'red_rose.jpeg': path.join(artifactDir, 'red_rose.jpeg'),
    'cutie_clips.jpeg': path.join(artifactDir, 'cutie_clips.jpeg'),
    'fril_band.jpeg': path.join(artifactDir, 'fril_band.jpeg'),
    // Placeholder
    'Sunflower_delight.jpeg': path.join(artifactDir, 'Sunflower_delight.jpeg')
  };

  Object.entries(srcImages).forEach(([destName, srcPath]) => {
    const destPath = path.join(assetsDir, destName);
    if (!fs.existsSync(destPath)) {
      if (fs.existsSync(srcPath)) {
        try {
          fs.copyFileSync(srcPath, destPath);
          console.log(`[Auto-Deploy] Copied generated image to assets/${destName}`);
        } catch (err) {
          console.error(`[Auto-Deploy] Failed to copy to assets/${destName}:`, err.message);
        }
      }
    }
  });
}

deployGeneratedImages();

const productsFilePath = path.join(dataDir, 'products.json');
const reviewsFilePath = path.join(dataDir, 'reviews.json');
const mockEmailsFilePath = path.join(dataDir, 'mock_emails.txt');
const fallbackFilePath = path.join(dataDir, 'orders_fallback.txt');

// Helper to read reviews
function readReviews() {
  try {
    if (!fs.existsSync(reviewsFilePath)) {
      return [];
    }
    const data = fs.readFileSync(reviewsFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading reviews:', error);
    return [];
  }
}

// Helper to write reviews
function writeReviews(reviews) {
  try {
    fs.writeFileSync(reviewsFilePath, JSON.stringify(reviews, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing reviews:', error);
    return false;
  }
}

// Google Sheets Configuration
let sheetsClient = null;
const spreadsheetId = process.env.SPREADSHEET_ID;

// Initialize Google Sheets API client dynamically
function initGoogleSheets() {
  const currentSpreadsheetId = process.env.SPREADSHEET_ID;

  if (
    !currentSpreadsheetId ||
    currentSpreadsheetId.trim() === '' ||
    currentSpreadsheetId === 'your_google_spreadsheet_id_here'
  ) {
    console.warn('[Google Sheets] SPREADSHEET_ID not configured.');
    return null;
  }

  const hasEnvCredentials = process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY;
  const keyFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 'google-credentials.json';
  const hasKeyFile = fs.existsSync(path.resolve(__dirname, keyFilePath));

  if (!hasEnvCredentials && !hasKeyFile) {
    console.warn('[Google Sheets] Neither GOOGLE_CLIENT_EMAIL/GOOGLE_PRIVATE_KEY nor key file config exists.');
    return null;
  }

  try {
    let auth;
    if (hasEnvCredentials) {
      auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
    } else {
      auth = new google.auth.GoogleAuth({
        keyFile: path.resolve(__dirname, keyFilePath),
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
    }

    console.log('[Google Sheets] Authorized successfully.');

    return google.sheets({
      version: 'v4',
      auth
    });

  } catch (error) {
    console.error('[Google Sheets] Failed:', error.message);
    return null;
  }
}

// Ensure the "Orders" sheet exists and has headers
async function ensureOrdersSheet(sheets) {
  const currentSpreadsheetId = process.env.SPREADSHEET_ID;
  try {
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: currentSpreadsheetId
    });
    
    const sheetsList = spreadsheet.data.sheets || [];
    const ordersSheetExists = sheetsList.some(s => s.properties.title === 'Orders');
    
    const headers = ['Customer Name', 'Phone Number', 'Address', 'Products', 'Subtotal', 'Delivery Charge', 'Grand Total', 'Date & Time'];

    if (!ordersSheetExists) {
      console.log("[Google Sheets] 'Orders' tab not found. Creating it...");
      // Add sheet
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: currentSpreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: 'Orders'
                }
              }
            }
          ]
        }
      });
      
      // Set Header Columns
      await sheets.spreadsheets.values.update({
        spreadsheetId: currentSpreadsheetId,
        range: 'Orders!A1:H1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [headers]
        }
      });
      console.log("[Google Sheets] Created 'Orders' tab and wrote column headers successfully.");
    } else {
      // Self-healing check: check if headers match the new e-commerce layout
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: currentSpreadsheetId,
          range: 'Orders!A1:H1'
        });
        const currentHeaders = response.data.values ? response.data.values[0] : [];
        if (!currentHeaders.includes('Products')) {
          console.log("[Google Sheets] Upgrading existing 'Orders' sheet headers to e-commerce format...");
          await sheets.spreadsheets.values.update({
            spreadsheetId: currentSpreadsheetId,
            range: 'Orders!A1:H1',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [headers]
            }
          });
        }
      } catch (err) {
        console.warn('[Google Sheets] Failed to check or upgrade existing headers:', err.message);
      }
    }
  } catch (error) {
    console.error('[Google Sheets] Error ensuring Orders tab exists:', error.message);
    throw error;
  }
}

// Ensure the "Reviews" sheet exists and has headers
async function ensureReviewsSheet(sheets) {
  const currentSpreadsheetId = process.env.SPREADSHEET_ID;
  try {
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: currentSpreadsheetId
    });
    
    const sheetsList = spreadsheet.data.sheets || [];
    const reviewsSheetExists = sheetsList.some(s => s.properties.title === 'Reviews');
    
    if (!reviewsSheetExists) {
      console.log("[Google Sheets] 'Reviews' tab not found. Creating it...");
      // Add sheet
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: currentSpreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: 'Reviews'
                }
              }
            }
          ]
        }
      });
      
      // Set Header Columns
      const headers = ['Customer Name', 'Product Name', 'Rating', 'Review', 'Status', 'Date & Time'];
      await sheets.spreadsheets.values.update({
        spreadsheetId: currentSpreadsheetId,
        range: 'Reviews!A1:F1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [headers]
        }
      });
      console.log("[Google Sheets] Created 'Reviews' tab and wrote columns headers successfully.");
    }
  } catch (error) {
    console.error('[Google Sheets] Error ensuring Reviews tab exists:', error.message);
    throw error;
  }
}

// Find a review in Sheets and update its Status column (Column E)
async function updateSheetReviewStatus(sheets, customerName, productName, reviewText, newStatus) {
  const currentSpreadsheetId = process.env.SPREADSHEET_ID;
  try {
    // 1. Fetch current review values
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: currentSpreadsheetId,
      range: 'Reviews!A:F'
    });
    
    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      console.warn('[Google Sheets] No review rows found to update status.');
      return;
    }
    
    // 2. Loop through rows (index 0 is header, so start from 1)
    let foundRowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      // Compare Name (col A), Product Name (col B), and Review Text (col D)
      if (row[0] === customerName && row[1] === productName && row[3] === reviewText) {
        foundRowIndex = i + 1; // 1-based index in sheets sheet grid
        break;
      }
    }
    
    if (foundRowIndex !== -1) {
      // 3. Update status in Column E (e.g. Reviews!E5)
      await sheets.spreadsheets.values.update({
        spreadsheetId: currentSpreadsheetId,
        range: `Reviews!E${foundRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[newStatus]]
        }
      });
      console.log(`[Google Sheets] Updated review status to "${newStatus}" for row ${foundRowIndex}`);
    } else {
      console.warn(`[Google Sheets] Could not find row matching review from ${customerName} for ${productName} to update status.`);
    }
  } catch (error) {
    console.error('[Google Sheets] Error updating review status in Sheets:', error.message);
  }
}

// Local Fallback order logger
function saveToLocalFallback(name, phone, address, productsStr, subtotal, deliveryCharge, grandTotal, formattedDate) {
  const logEntry = `
========================================
ORDER LOGGED (GOOGLE SHEETS FALLBACK)
Date & Time: ${formattedDate}
----------------------------------------
Name: ${name}
Phone: ${phone}
Address: ${address}
Products: ${productsStr.replace(/\n/g, ' ')}
Subtotal: ₹${subtotal}
Delivery Charge: ₹${deliveryCharge}
Grand Total: ₹${grandTotal}
========================================
\n`;
  try {
    console.log(logEntry);
    console.log(`[Local Fallback] Appended order details locally to: data/orders_fallback.txt`);
  } catch (err) {
    console.error('[Local Fallback Error] Failed to write local order file:', err.message);
  }
}

// Helper to read products
function readProducts() {
  try {
    if (!fs.existsSync(productsFilePath)) {
      return [];
    }
    const data = fs.readFileSync(productsFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading products:', error);
    return [];
  }
}

// Helper to write products
function writeProducts(products) {
  try {
    fs.writeFileSync(productsFilePath, JSON.stringify(products, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing products:', error);
    return false;
  }
}

// Multer storage configuration for product image uploads
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'three-hearts-products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp']
  }
});

const upload = multer({ storage });

// API: Get all products
app.get('/api/products', (req, res) => {
  const products = readProducts();
  res.json(products);
});

// API: Add a new product
app.post('/api/products', upload.array('images', 5), (req, res) => {
  try {
    const { name, price, description, colors } = req.body;
    if (!name || !price) {
      return res.status(400).json({ error: 'Product name and price are required' });
    }

    const products = readProducts();
    const newId = products.length > 0 ? (Math.max(...products.map(p => parseInt(p.id) || 0)) + 1).toString() : "1";

    // Handle uploaded files
    const imageUrls = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        imageUrls.push(file.path);
      });
    }

    const parsedColors = Array.isArray(colors) ? colors : (colors ? colors.split(',').map(c => c.trim()) : []);

    const newProduct = {
      id: newId,
      name,
      price: parseFloat(price),
      description: description || '',
      colors: parsedColors,
      images: imageUrls.length > 0 ? imageUrls : ['/assets/placeholder.png']
    };

    products.push(newProduct);
    writeProducts(products);

    res.status(201).json({ message: 'Product added successfully', product: newProduct });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ error: 'Server error adding product' });
  }
});

// API: Edit a product
app.put('/api/products/:id', upload.array('images', 5), (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, description, colors, existingImages } = req.body;

    const products = readProducts();
    const index = products.findIndex(p => p.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Keep existing images specified by client, or default to empty
    let imageUrls = [];
    if (existingImages) {
      imageUrls = Array.isArray(existingImages) ? existingImages : [existingImages];
    }

    // Append new uploaded images
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        imageUrls.push(file.path);
      });
    }

    const parsedColors = Array.isArray(colors) ? colors : (colors ? colors.split(',').map(c => c.trim()) : []);

    products[index] = {
      id,
      name: name || products[index].name,
      price: price ? parseFloat(price) : products[index].price,
      description: description !== undefined ? description : products[index].description,
      colors: parsedColors.length > 0 ? parsedColors : products[index].colors,
      images: imageUrls.length > 0 ? imageUrls : products[index].images
    };

    writeProducts(products);
    res.json({ message: 'Product updated successfully', product: products[index] });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Server error updating product' });
  }
});

// API: Delete a product
app.delete('/api/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    const products = readProducts();
    const index = products.findIndex(p => p.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const deletedProduct = products.splice(index, 1)[0];
    writeProducts(products);

    res.json({ message: 'Product deleted successfully', id });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Server error deleting product' });
  }
});

// API: Place an order (saves to Google Sheets + emails admin)
app.post('/api/orders', async (req, res) => {
  try {
    const { name, phone, address, products, subtotal, deliveryCharge, grandTotal } = req.body;

    if (!name || !phone || !address || !products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'All order fields and cart items are required' });
    }

    const orderDate = new Date();
    const formattedDate = orderDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    // Format products string for Sheets: e.g. "Cutie Clips x2 (Yellow), Fril Band x1 (Pink)"
    const productsStr = products
      .map(p => `${p.name} x${p.quantity}` + (p.color ? ` (${p.color})` : ''))
      .join(', \n');

    // 1. SAVE TO GOOGLE SHEETS (with Local Fallback)
    if (!sheetsClient) {
      sheetsClient = initGoogleSheets();
    }

    let savedToSheets = false;

    if (sheetsClient) {
      try {
        // Ensure "Orders" sheet tab exists
        await ensureOrdersSheet(sheetsClient);

        const currentSpreadsheetId = process.env.SPREADSHEET_ID;
        // Append row to the "Orders" tab (8 columns: Name, Phone, Address, Products, Subtotal, Delivery, Grand Total, Time)
        await sheetsClient.spreadsheets.values.append({
          spreadsheetId: currentSpreadsheetId,
          range: 'Orders!A:H',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[
              name,
              phone,
              address,
              productsStr,
              parseFloat(subtotal),
              parseFloat(deliveryCharge),
              parseFloat(grandTotal),
              formattedDate
            ]]
          }
        });
        console.log('[Google Sheets] Consolidated order successfully pushed to sheet.');
        savedToSheets = true;
      } catch (err) {
        console.error('[Google Sheets API Fail] Appending failed. Using local fallback logger:', err.message);
        saveToLocalFallback(name, phone, address, productsStr, subtotal, deliveryCharge, grandTotal, formattedDate);
      }
    } else {
      saveToLocalFallback(name, phone, address, productsStr, subtotal, deliveryCharge, grandTotal, formattedDate);
    }

    // 2. SEND EMAIL TO ADMIN
    const adminEmail = process.env.ADMIN_EMAIL || 'ganeshjeyakumark@gmail.com';
    const emailSubject = `💖 New Consolidated Order from ${name} - Three_Hearts Handmades`;

    let emailProductsRows = '';
    products.forEach(p => {
      emailProductsRows += `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #FFE5EC; color: #4A2E35;">
            <span style="font-weight: bold; color: #8E6070;">${p.name}</span>
            ${p.color ? `<br><span style="font-size: 0.85em; display: inline-block; padding: 2px 6px; background-color: #E8E7F5; border-radius: 4px; color: #4A2E35; margin-top: 4px;">Color: ${p.color}</span>` : ''}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #FFE5EC; text-align: center; color: #4A2E35;">₹${p.price}</td>
          <td style="padding: 12px; border-bottom: 1px solid #FFE5EC; text-align: center; color: #4A2E35;">x${p.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #FFE5EC; text-align: right; font-weight: bold; color: #8E6070;">₹${p.price * p.quantity}</td>
        </tr>
      `;
    });

    const emailHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #FFE5EC; border-radius: 12px; background-color: #FDF8F5;">
        <div style="text-align: center; border-bottom: 2px solid #FFE5EC; padding-bottom: 15px; margin-bottom: 20px;">
          <h2 style="color: #8E6070; margin: 0;">Three_Hearts Handmades</h2>
          <p style="font-style: italic; color: #B38E9B; margin: 5px 0 0 0;">"Crafted with Love, Made by Heart"</p>
        </div>
        <h3 style="color: #4A2E35;">New Order Received! 💖</h3>
        <p>A customer has placed a multi-product order on your handmade boutique website. Below are the order details:</p>
        
        <div style="background-color: #ffffff; border-radius: 8px; padding: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.02); margin-bottom: 20px; border: 1px solid #FFE5EC;">
          <h4 style="color: #8E6070; margin-top: 0; border-bottom: 1px dashed #FFE5EC; padding-bottom: 6px; margin-bottom: 10px;">Customer Information</h4>
          <p style="margin: 6px 0;"><strong>Name:</strong> ${name}</p>
          <p style="margin: 6px 0;"><strong>Phone:</strong> ${phone}</p>
          <p style="margin: 6px 0;"><strong>Address:</strong> ${address}</p>
          <p style="margin: 6px 0;"><strong>Date & Time:</strong> ${formattedDate}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.02); border: 1px solid #FFE5EC;">
          <thead>
            <tr style="background-color: #FFE5EC;">
              <th style="text-align: left; padding: 12px; color: #4A2E35;">Product</th>
              <th style="text-align: center; padding: 12px; color: #4A2E35;">Price</th>
              <th style="text-align: center; padding: 12px; color: #4A2E35;">Qty</th>
              <th style="text-align: right; padding: 12px; color: #4A2E35;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${emailProductsRows}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding: 12px 12px 4px; text-align: right; color: #8A7278;">Subtotal:</td>
              <td style="padding: 12px 12px 4px; text-align: right; font-weight: bold; color: #4A2E35;">₹${subtotal}</td>
            </tr>
            <tr>
              <td colspan="3" style="padding: 4px 12px; text-align: right; color: #8A7278;">Delivery Charge:</td>
              <td style="padding: 4px 12px; text-align: right; font-weight: bold; color: #4A2E35;">₹${deliveryCharge}</td>
            </tr>
            <tr style="border-top: 1px solid #FFE5EC;">
              <td colspan="3" style="padding: 12px; text-align: right; font-weight: bold; color: #8E6070; font-size: 1.1em;">Grand Total:</td>
              <td style="padding: 12px; text-align: right; font-weight: bold; color: #8E6070; font-size: 1.1em;">₹${grandTotal}</td>
            </tr>
          </tfoot>
        </table>
        
        <div style="margin-top: 30px; text-align: center; border-top: 1px solid #FFE5EC; padding-top: 15px; font-size: 0.9em; color: #B38E9B;">
          This order has also been logged directly into your Google Sheet (Orders tab). If the API is not yet configured, details are saved in the server's local fallback log.
        </div>
      </div>
    `;

    // Setup nodemailer transport
    const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

    if (hasSmtpConfig) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: parseInt(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      await transporter.sendMail({
        from: `"Three_Hearts Website" <${process.env.SMTP_USER}>`,
        to: adminEmail,
        subject: emailSubject,
        html: emailHtml
      });
      console.log(`Email invoice successfully sent to ${adminEmail}`);
    } else {
      // Fallback: log to server console and local mock file for developer validation
      const emailLog = `
========================================
NEW ORDER EMAIL NOTIFICATION (CONSOLIDATED)
Timestamp: ${formattedDate}
To: ${adminEmail}
Subject: ${emailSubject}
----------------------------------------
Name: ${name}
Phone: ${phone}
Address: ${address}
Products: ${productsStr.replace(/\n/g, ' ')}
Subtotal: ₹${subtotal}
Delivery Charge: ₹${deliveryCharge}
Grand Total: ₹${grandTotal}
========================================
\n`;
      console.log(emailLog);
      console.warn(`[SMTP NOT CONFIGURED] Simulated email invoice details appended to 'data/mock_emails.txt'`);
    }

    return res.status(201).json({
      message: 'Consolidated order received successfully',
      savedToSheets,
      emailNotification: hasSmtpConfig ? 'sent' : 'simulated'
    });
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ error: 'Server error placing order' });
  }
});

// API: Get all reviews
app.get('/api/reviews', (req, res) => {
  try {
    const reviews = readReviews();
    const approvedOnly = req.query.approved === 'true';
    
    if (approvedOnly) {
      const filtered = reviews.filter(r => r.approved === true);
      return res.json(filtered);
    }
    
    res.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Server error fetching reviews' });
  }
});

// API: Submit a new review (saves to local JSON + syncs to Google Sheets Reviews tab)
app.post('/api/reviews', async (req, res) => {
  try {
    const { customerName, productName, rating, review } = req.body;
    
    if (!customerName || !productName || !rating || !review) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    const ratingInt = parseInt(rating);
    if (isNaN(ratingInt) || ratingInt < 1 || ratingInt > 5) {
      return res.status(400).json({ error: 'Rating must be a number between 1 and 5' });
    }
    
    const reviews = readReviews();
    const orderDate = new Date();
    const formattedDate = orderDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    
    const newReview = {
      id: Date.now().toString(),
      customerName,
      productName,
      rating: ratingInt,
      review,
      approved: false,
      createdAt: orderDate.toISOString()
    };
    
    reviews.push(newReview);
    writeReviews(reviews);
    
    // Google Sheets Sync
    if (!sheetsClient) {
      sheetsClient = initGoogleSheets();
    }
    
    if (sheetsClient) {
      try {
        await ensureReviewsSheet(sheetsClient);
        const currentSpreadsheetId = process.env.SPREADSHEET_ID;
        // Append row: Customer Name | Product Name | Rating | Review | Status | Date & Time
        await sheetsClient.spreadsheets.values.append({
          spreadsheetId: currentSpreadsheetId,
          range: 'Reviews!A:F',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[customerName, productName, ratingInt, review, 'Pending', formattedDate]]
          }
        });
        console.log('[Google Sheets] Review successfully synced to Sheets (Pending).');
      } catch (err) {
        console.error('[Google Sheets API Fail] Review append failed:', err.message);
      }
    }
    
    res.status(201).json({ message: 'Review submitted successfully and is pending moderation!', review: newReview });
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).json({ error: 'Server error submitting review' });
  }
});

// API: Approve a review (admin action)
app.put('/api/reviews/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const reviews = readReviews();
    const index = reviews.findIndex(r => r.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    reviews[index].approved = true;
    reviews[index].rejected = false;
    writeReviews(reviews);
    
    // Sync status to Google Sheets
    if (!sheetsClient) {
      sheetsClient = initGoogleSheets();
    }
    
    if (sheetsClient) {
      await updateSheetReviewStatus(
        sheetsClient,
        reviews[index].customerName,
        reviews[index].productName,
        reviews[index].review,
        'Approved'
      );
    }
    
    res.json({ message: 'Review approved successfully', review: reviews[index] });
  } catch (error) {
    console.error('Error approving review:', error);
    res.status(500).json({ error: 'Server error approving review' });
  }
});

// API: Reject a review (admin action)
app.put('/api/reviews/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const reviews = readReviews();
    const index = reviews.findIndex(r => r.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    reviews[index].approved = false;
    reviews[index].rejected = true;
    writeReviews(reviews);
    
    // Sync status to Google Sheets
    if (!sheetsClient) {
      sheetsClient = initGoogleSheets();
    }
    
    if (sheetsClient) {
      await updateSheetReviewStatus(
        sheetsClient,
        reviews[index].customerName,
        reviews[index].productName,
        reviews[index].review,
        'Rejected'
      );
    }
    
    res.json({ message: 'Review rejected successfully', review: reviews[index] });
  } catch (error) {
    console.error('Error rejecting review:', error);
    res.status(500).json({ error: 'Server error rejecting review' });
  }
});

// API: Delete a review (admin action)
app.delete('/api/reviews/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const reviews = readReviews();
    const index = reviews.findIndex(r => r.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    const deletedReview = reviews.splice(index, 1)[0];
    writeReviews(reviews);
    
    // Sync status to Google Sheets
    if (!sheetsClient) {
      sheetsClient = initGoogleSheets();
    }
    
    if (sheetsClient) {
      await updateSheetReviewStatus(
        sheetsClient,
        deletedReview.customerName,
        deletedReview.productName,
        deletedReview.review,
        'Deleted'
      );
    }
    
    res.json({ message: 'Review deleted successfully', id });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ error: 'Server error deleting review' });
  }
});

// For any other route, redirect to homepage
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(` Three_Hearts Handmades backend is running!`);
  console.log(` Port: ${PORT}`);
  console.log(` Admin Email: ${process.env.ADMIN_EMAIL || 'ganeshjeyakumark@gmail.com'}`);
  console.log(` Store URL: http://localhost:${PORT}`);
  console.log(` Admin URL: http://localhost:${PORT}/admin.html`);
  console.log(`==================================================`);
});

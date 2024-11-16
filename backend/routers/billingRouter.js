import express from 'express';
import Billing from '../models/billingModal.js';
import Product from '../models/productModel.js';
import Log from '../models/Logmodal.js';
import mongoose from 'mongoose';
import Purchase from '../models/purchasemodals.js';
import User from '../models/userModel.js';

const billingRouter = express.Router();

// Create a new billing entry

// POST /create - Create a new billing record
billingRouter.post('/create', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      invoiceDate,
      salesmanName,
      expectedDeliveryDate,
      deliveryStatus = "Pending",
      billingAmount,
      discount = 0,
      customerName,
      customerAddress,
      customerContactNumber,
      marketedBy,
      paymentAmount,
      paymentMethod,
      salesmanPhoneNumber,
      userId,
      paymentReceivedDate,
      products // Expected to be an array of objects with item_id and quantity
    } = req.body;


    let  invoiceNo = req.body.invoiceNo;

    // -----------------------
    // 1. Validate Required Fields
    // -----------------------
    if (
      !invoiceNo ||
      !invoiceDate ||
      !salesmanName ||
      !customerName ||
      !customerAddress ||
      !products ||
      !salesmanPhoneNumber ||
      !Array.isArray(products) ||
      products.length === 0
    ) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // -----------------------
    // 2. Check for Existing Invoice
    // -----------------------
    const existingBill = await Billing.findOne({ invoiceNo }).session(session);
    if (existingBill) {
      // Find the latest invoiceNo that starts with 'KK' and is followed by digits
      const latestInvoice = await Billing.findOne({ invoiceNo: /^KK\d+$/ })
      .sort({ invoiceNo: -1 })
      .collation({ locale: "en", numericOrdering: true });
    
      if (!latestInvoice) {
        // If no invoice exists, start with 'KK001'
        return 'KK001';
      }
    
      const latestInvoiceNo = latestInvoice.invoiceNo;
      const numberPart = parseInt(latestInvoiceNo.replace('KK', ''), 10);
    
      // Increment the numerical part
      const nextNumber = numberPart + 1;
    
      // Format the next number with leading zeros to maintain a 3-digit format
      const nextInvoiceNo = `KK${nextNumber.toString()}`;
      console.log(`Invoice number ${invoiceNo} exists. Assigning next invoice number: ${nextInvoiceNo}`);
    
      // Assign the new invoice number to the request body
      req.body.invoiceNo = nextInvoiceNo;
      invoiceNo = nextInvoiceNo;
      }

    // -----------------------
    // 3. Calculate Total Amount After Discount
    // -----------------------
    const parsedBillingAmount = parseFloat(billingAmount);
    const parsedDiscount = parseFloat(discount);

    if (isNaN(parsedBillingAmount) || parsedBillingAmount <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Invalid billing amount' });
    }

    if (isNaN(parsedDiscount) || parsedDiscount < 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Invalid discount amount' });
    }

    const totalAmount = parsedBillingAmount - parsedDiscount;
    if (totalAmount < 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Discount cannot exceed billing amount' });
    }

    // -----------------------
    // 4. Validate Products and Update Stock
    // -----------------------
    const productUpdatePromises = [];
    for (const item of products) {
      const { item_id, quantity } = item;

      // Validate individual product details
      if (!item_id || !quantity || isNaN(quantity) || quantity <= 0) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: 'Invalid product details' });
      }

      // Fetch product using item_id
      const product = await Product.findOne({ item_id }).session(session);
      if (!product) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ message: `Product with ID ${item_id} not found` });
      }

      // Check if there is enough stock
      if (product.countInStock < quantity) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: `Insufficient stock for product ID ${item_id}` });
      }

      // Deduct the stock
      product.countInStock -= parseFloat(quantity);
      productUpdatePromises.push(product.save({ session }));
    }

    // -----------------------
    // 5. Initialize Billing Data
    // -----------------------
    const billingData = new Billing({
      invoiceNo,
      invoiceDate,
      salesmanName,
      expectedDeliveryDate,
      deliveryStatus,
      billingAmount: parsedBillingAmount,
      discount: parsedDiscount,
      customerName,
      customerAddress,
      customerContactNumber,
      marketedBy,
      products,
      payments: [] // Initialize payments as an empty array
    });

    // -----------------------
    // 6. Add Initial Payment if Provided
    // -----------------------
    if (paymentAmount && paymentMethod) {
      const parsedPaymentAmount = parseFloat(paymentAmount);

      // Validate payment amount
      if (isNaN(parsedPaymentAmount) || parsedPaymentAmount <= 0) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: 'Invalid payment amount' });
      }

      // Ensure paymentAmount does not exceed totalAmount
      if (parsedPaymentAmount > totalAmount) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: 'Payment amount cannot exceed total amount after discount' });
      }

      const paymentEntry = {
        amount: parsedPaymentAmount,
        method: paymentMethod,
        date: paymentReceivedDate ? new Date(paymentReceivedDate) : new Date()
      };

      // Add the payment to the payments array
      billingData.payments.push(paymentEntry);
    }


    const user = await User.findOne({ name: salesmanName })
    if(user){
      user.contactNumber = salesmanPhoneNumber
      await user.save();
    }else{
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'User not found' });
    }

    // -----------------------
    // 7. Save Billing Data and Update Products
    // -----------------------
    await billingData.save({ session });
    await Promise.all(productUpdatePromises);

    // -----------------------
    // 8. Commit the Transaction
    // -----------------------
    await session.commitTransaction();
    session.endSession();

    // -----------------------
    // 9. Respond to Client
    // -----------------------
    res.status(201).json({ message: 'Billing data saved successfully', billingData });
  } catch (error) {
    console.error('Error saving billing data:', error);

    // Attempt to abort the transaction if it's still active
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();

    res.status(500).json({ message: 'Error saving billing data', error: error.message });
  }
});





billingRouter.post('/edit/:id', async (req, res) => {
  const billingId = req.params.id;

  // Start a MongoDB session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Destructure required fields from request body
    const {
      invoiceNo,
      invoiceDate,
      salesmanName,
      expectedDeliveryDate,
      billingAmount,
      customerName,
      customerAddress,
      products,
      discount,
      paymentStatus,
      deliveryStatus,
      payments,
      customerContactNumber,
      marketedBy,
    } = req.body;

    // === 1. Basic Validation ===

    // Check for required fields
    if (
      !invoiceNo ||
      !invoiceDate ||
      !salesmanName ||
      !expectedDeliveryDate ||
      !billingAmount ||
      !customerName ||
      !customerAddress ||
      !customerContactNumber ||
      !products ||
      !Array.isArray(products)
    ) {
      return res.status(400).json({
        message:
          'Missing required fields. Ensure all mandatory fields are provided.',
      });
    }

    // Fetch the existing billing record
    const existingBilling = await Billing.findById(billingId).session(session);
    if (!existingBilling) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Billing record not found.' });
    }

    // === 2. Prepare Product Data ===

    // Extract all product IDs from the updated products list
    const updatedProductIds = products.map((item) => item.item_id.trim());

    // Fetch all products involved in the update in a single query
    const fetchedProducts = await Product.find({
      item_id: { $in: updatedProductIds },
    }).session(session);

    // Create a map for quick access to products by item_id
    const productMap = {};
    fetchedProducts.forEach((product) => {
      productMap[product.item_id] = product;
    });

    // === 3. Handle Product Updates ===

    // Track products to be removed (present in existingBilling but not in updated list)
    const existingProductIds = existingBilling.products.map(
      (p) => p.item_id
    );
    const productsToRemove = existingBilling.products.filter(
      (p) => !updatedProductIds.includes(p.item_id)
    );

    // === 3.1. Remove Products Not Present in Updated List ===
    for (const product of productsToRemove) {
      const productInDB = productMap[product.item_id];
      if (productInDB) {
        // Add back the quantity to stock
        productInDB.countInStock += parseFloat(product.quantity);
        await productInDB.save({ session });
      }

      // Remove the product from billing
      existingBilling.products.id(product._id).remove();
    }

    // === 3.2. Update Existing Products and Add New Products ===
    for (const updatedProduct of products) {
      const {
        item_id,
        name,
        category,
        brand,
        quantity,
        sellingPrice,
        enteredQty,
        sellingPriceinQty,
        unit,
        length,
        breadth,
        psRatio,
        size
      } = updatedProduct;

      const trimmedItemId = item_id.trim();
      const newQuantity = parseFloat(quantity);

      // Validate product exists in the database
      const productInDB = productMap[trimmedItemId];
      if (!productInDB) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          message: `Product with ID ${trimmedItemId} not found.`,
        });
      }

      // Find the product in the existing billing
      const existingProductInBilling = existingBilling.products.find(
        (p) => p.item_id === trimmedItemId
      );

      if (existingProductInBilling) {
        // Calculate quantity difference
        const previousQuantity = parseFloat(existingProductInBilling.quantity);
        const quantityDifference = newQuantity - previousQuantity;

        // Calculate new stock count
        const newStockCount = productInDB.countInStock - quantityDifference;

        if (newStockCount < 0) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({
            message: `Insufficient stock for product ID ${trimmedItemId}. Only ${
              productInDB.countInStock + previousQuantity
            } available.`,
          });
        }

        // Update stock count
        productInDB.countInStock = newStockCount;
        await productInDB.save({ session });

        // Update product details in billing
        existingProductInBilling.quantity = newQuantity;
        existingProductInBilling.sellingPrice = parseFloat(sellingPrice) || 0;
        existingProductInBilling.enteredQty = parseFloat(enteredQty) || 0;
        existingProductInBilling.sellingPriceinQty =  parseFloat(sellingPriceinQty) || 0;
        existingProductInBilling.unit = unit || existingProductInBilling.unit;
        existingProductInBilling.length = parseFloat(length) || 0;
        existingProductInBilling.breadth = parseFloat(breadth) || 0;
        existingProductInBilling.psRatio = parseFloat(psRatio) || 0;
        existingProductInBilling.size = size || productInDB.size;
      } else {
        // New product to be added to billing

        // Ensure sufficient stock
        if (productInDB.countInStock < newQuantity) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({
            message: `Insufficient stock for product ID ${trimmedItemId}. Only ${productInDB.countInStock} available.`,
          });
        }

        // Deduct stock
        productInDB.countInStock -= newQuantity;
        await productInDB.save({ session });

        // Add new product to billing
        existingBilling.products.push({
          item_id: trimmedItemId,
          name: name || productInDB.name,
          sellingPrice: parseFloat(sellingPrice) || 0,
          quantity: newQuantity,
          category: category || productInDB.category,
          brand: brand || productInDB.brand,
          unit: unit || productInDB.unit,
          sellingPriceinQty: parseFloat(sellingPriceinQty) || 0,
          enteredQty: parseFloat(enteredQty) || 0,
          length: parseFloat(length) || 0,
          breadth: parseFloat(breadth) || 0,
          psRatio: parseFloat(psRatio) || 0,
          size: productInDB.size || size,
        });
      }
    }

    // === 4. Handle Payments ===

    if (payments && Array.isArray(payments) && payments.length > 0) {
      payments.forEach((payment) => {
        const { amount, method, receivedDate } = payment;

        // Basic validation for payment fields
        if (
          amount === undefined ||
          method === undefined ||
          receivedDate === undefined
        ) {
          // Skip invalid payment entries
          return;
        }

        existingBilling.payments.push({
          amount: parseFloat(amount) || 0,
          method: method || 'Unknown',
          receivedDate: new Date(receivedDate),
        });
      });
    }

    // === 5. Update Billing Details ===

    existingBilling.invoiceNo = invoiceNo;
    existingBilling.invoiceDate = new Date(invoiceDate);
    existingBilling.salesmanName = salesmanName;
    existingBilling.expectedDeliveryDate = new Date(expectedDeliveryDate);
    existingBilling.billingAmount = parseFloat(billingAmount) || 0;
    existingBilling.discount = parseFloat(discount) || 0;
    existingBilling.customerName = customerName;
    existingBilling.customerAddress = customerAddress;
    existingBilling.customerContactNumber = customerContactNumber;
    existingBilling.marketedBy = marketedBy || existingBilling.marketedBy;
    existingBilling.paymentStatus = paymentStatus || existingBilling.paymentStatus;
    existingBilling.deliveryStatus = deliveryStatus || existingBilling.deliveryStatus;

    // === 6. Save Updated Billing Record ===
    await existingBilling.save({ session });

    // === 7. Commit Transaction ===
    await session.commitTransaction();
    session.endSession();

    // === 8. Send Success Response ===
    res.status(200).json({ message: 'Billing data updated successfully.' });
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction();
    session.endSession();

    console.error('Error updating billing data:', error);

    // Send error response
    res.status(500).json({
      message: 'Error updating billing data.',
      error: error.message,
    });
  }
});




// Get all billings
  billingRouter.get('/', async (req, res) => {
    try {
      // Fetch and sort billing records by createdAt field in descending order (newest first)
      const billings = await Billing.find().sort({ createdAt: -1 });
  
      if (!billings) {
        return res.status(404).json({ message: 'No billings found' });
      }
  
      res.status(200).json(billings);
    } catch (error) {
      console.error('Error fetching billings:', error);
      res.status(500).json({ message: 'Error fetching billings', error: error.message });
    }
  });
  


billingRouter.get('/driver/', async (req, res) => {
  const page = parseFloat(req.query.page) || 1; // Default to page 1
  const limit = parseFloat(req.query.limit) || 3; // Default to 10 items per page

  try {
    const totalBillings = await Billing.countDocuments(); // Get total billing count
    const billings = await Billing.find()
      .sort({ invoiceDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      billings,
      totalPages: Math.ceil(totalBillings / limit),
      currentPage: page,
      totalbilling: totalBillings
    });
  } catch (error) {
    console.error("Error fetching billings:", error);
    res.status(500).json({ message: "Error fetching billings" });
  }
});


billingRouter.get('/product/get-sold-out/:id', async (req, res) => {
  const itemId = req.params.id.trim();

  try {
    const totalQuantity = await Billing.getTotalQuantitySold(itemId);

    // Always return a result, even if no sales are found
    res.status(200).json({ itemId, totalQuantity });
  } catch (error) {
    console.error("Error occurred while fetching total quantity sold:", error);
    res.status(500).json({ message: "An error occurred while fetching the data.", error: error.message });
  }
});




// Get a billing by ID
billingRouter.get('/:id', async (req, res) => {
  try {
    const billing = await Billing.findById(req.params.id);
    if (!billing) {
      return res.status(500).json({ message: 'Billing not found' });
    }
    res.status(200).json(billing);
  } catch (error) {
    console.error('Error fetching billing:', error);
    res.status(500).json({ message: 'Error fetching billing', error });
  }
});


billingRouter.get('/getinvoice/:id', async (req, res) => {
  try {
    const billing = await Billing.findOne({invoiceNo: req.params.id});
    if (!billing) {
      console.log("not found")
      return res.status(500).json({ message: 'Billing not found' });
    }
    res.status(200).json(billing);
  } catch (error) {
    console.error('Error fetching billing:', error);
    res.status(500).json({ message: 'Error fetching billing', error });
  }
});


// Fetch all billing numbers
billingRouter.get('/numbers/getBillings', async (req, res) => {
  try {
    const billings = await Billing.find({}, { invoiceNo: 1 }); // Fetch only billingNo
    res.status(200).json(billings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching billing numbers', error });
  }
});


billingRouter.put("/driver/billings/:id", async (req, res) => {
  const { deliveryStatus, paymentStatus } = req.body;
  try {
    const updatedBilling = await Billing.findByIdAndUpdate(
      req.params.id,
      { deliveryStatus, paymentStatus },
      { new: true }
    );
    res.status(200).json(updatedBilling);
  } catch (error) {
    res.status(500).json({ message: "Error updating billing", error });
  }
});

// Route to fetch a limited number of low-stock products (e.g., for homepage)
billingRouter.get('/deliveries/expected-delivery', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set the time to the start of today (00:00:00)

    const billings = await Billing.find({expectedDeliveryDate: { $gte: today },deliveryStatus: { $ne: 'Delivered' }}).sort({ expectedDeliveryDate: 1 }).limit(1); // Limit to 3 products
    // console.log(billings)
    res.json(billings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching low-stock products', error });
  }
});

billingRouter.get('/alldelivery/all', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set the time to the start of today (00:00:00)
    const billings = await Billing.find({expectedDeliveryDate: {$gte: today}, deliveryStatus: { $ne: 'Delivered' }}).sort({ expectedDeliveryDate: 1 }) // Limit to 3 products
    // console.log(billings)
    res.json(billings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching low-stock products', error });
  }
});


billingRouter.get("/billing/suggestions", async (req, res) => {
  try {
    let { search = "" } = req.query;
    search = search.replace(/\s+/g, "").toUpperCase(); // Normalize the search term

    // Search both `invoiceNo` and `customerName` fields with case insensitive regex
    const suggestions = await Billing.find({
      $or: [
        { invoiceNo: { $regex: search, $options: "i" } },
        { customerName: { $regex: search, $options: "i" } }
      ]
    }).limit(5); // Limit suggestions to 5

    res.status(200).json(suggestions);
  } catch (error) {
    console.error("Error fetching suggestions:", error); // Log the error for debugging
    res.status(500).json({ message: "Error fetching suggestions" });
  }
});




billingRouter.delete('/billings/delete/:id',async(req,res)=>{
  try{
    const billing = await Billing.findById(req.params.id)

    if (!billing) {
      return res.status(404).json({ message: 'Purchase not found' });
    }

    // Loop through each item in the purchase and update product stock
    for (let item of billing.products) {
      const product = await Product.findOne({item_id: item.item_id});

      if (product) {
        // Reduce the countInStock by the quantity in the purchase
        product.countInStock += parseFloat(item.quantity)

        if (product.countInStock < 0) {
          product.countInStock = 0; // Ensure stock doesn't go below zero
        }

        await product.save();  // Save the updated product
      }
    }

    const deleteProduct = await billing.remove();
    res.send({ message: 'Product Deleted', bill: deleteProduct });
  }catch(error){
    res.status(500).send({ message: 'Error Occured' });
  }
});


billingRouter.get('/lastOrder/id', async (req, res) => {
  try {
    // Fetch the invoice with the highest sequence number starting with 'K'
    const billing = await Billing.findOne({ invoiceNo: /^KK\d+$/ })
      .sort({ invoiceNo: -1 })
      .collation({ locale: "en", numericOrdering: true });

    // Check if an invoice was found
    if (billing) {
      res.json(billing.invoiceNo);
    } else {
      const billing = await Billing.find()
      .sort({ invoiceNo: -1 })
      .collation({ locale: "en", numericOrdering: true });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching last order' });
  }
});




billingRouter.post("/billing/:id/addExpenses", async (req, res) => {
  try {
    const { id } = req.params;
    const { fuelCharge = 0, otherExpenses = [] } = req.body;

    // Find the billing document by ID
    const billing = await Billing.findById(id);
    if (!billing) {
      return res.status(404).json({ message: "Billing not found" });
    }

    // Update fuelCharge by adding the new value to the existing one
    billing.fuelCharge = parseFloat(billing.fuelCharge) + parseFloat(fuelCharge || 0);

    // Validate and filter otherExpenses to include only entries with a positive amount
    const validOtherExpenses = Array.isArray(otherExpenses)
      ? otherExpenses.filter(expense => 
          typeof expense === "object" && 
          expense !== null && 
          typeof expense.amount === "number" && 
          expense.amount > 0
        )
      : [];

    // Append valid otherExpenses to the billing document
    if (validOtherExpenses.length > 0) {
      billing.otherExpenses.push(...validOtherExpenses.map(expense => ({
        amount: parseFloat(expense.amount),
        remark: expense.remark || ""
      })));
    }

    // Save the updated document
    await billing.save();

    res.status(200).json({ message: "Expenses added successfully", billing });
  } catch (error) {
    console.error("Error adding expenses:", error);
    res.status(500).json({ message: "Error adding expenses" });
  }
});


billingRouter.get('/summary/monthly-sales', async (req, res) => {
  try {
    const sales = await Billing.aggregate([
      {
        $group: {
          _id: { $month: '$invoiceDate' },
          totalSales: { $sum: '$billingAmount' },
        },
      },
      { $sort: { '_id': 1 } },
    ]);

    res.json(sales);
  } catch (error) {
    console.error('Error fetching monthly sales data:', error);
    res.status(500).json({ message: 'Error fetching monthly sales data' });
  }
});

// GET Total Billing Sum
billingRouter.get('/summary/total-sales', async (req, res) => {
  try {
    const totalSales = await Billing.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$billingAmount' },
        },
      },
    ]);

    res.json({
      totalSales: totalSales.length > 0 ? totalSales[0].totalAmount : 0,
    });
  } catch (error) {
    console.error('Error fetching total sales:', error);
    res.status(500).json({ message: 'Error fetching total sales' });
  }
});

billingRouter.get('/purchases/suggestions', async (req, res) => {
  try {
    const searchTerm = req.query.q;
    if (!searchTerm) {
      return res.status(400).json({ error: 'Query parameter q is required' });
    }

    // Find sellers whose names match the search term (case-insensitive)
    const sellers = await Purchase.find({
      sellerName: { $regex: searchTerm, $options: 'i' }
    }).limit(10); // Limit to 10 suggestions for performance

    const suggestions = sellers.map(seller => seller.sellerName);
    res.json({ suggestions });
  } catch (error) {
    console.error('Error fetching seller suggestions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

billingRouter.get('/purchases/categories', async (req, res) => {
  try {
    // Fetch distinct categories from previous purchase bills
    const categories = await Product.distinct('category');
    res.json({categories});
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


export default billingRouter;

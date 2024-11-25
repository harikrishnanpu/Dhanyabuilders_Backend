import express from 'express';
import PaymentsAccount from '../models/paymentsAccountModal.js';

const accountRouter = express.Router();


accountRouter.post('/create', async (req, res) => {
    try {
      const { accountName, balance} = req.body;
  
      // Create new PaymentAccount instance
      const newAccount = new PaymentsAccount({
        accountName,
        balanceAmount: balance || 0,
      });
  
      // Save to database (balanceAmount will be auto-calculated)
      const savedAccount = await newAccount.save();
  
      res.status(201).json(savedAccount);
    } catch (error) {
      console.error('Error creating payment account:', error);
      res.status(500).json({ message: 'Server Error' });
    }
  });




  // @route   GET /api/payment-accounts
// @desc    Get all payment accounts
// @access  Public (or Protected based on your auth)
accountRouter.get('/allaccounts', async (req, res) => {
    try {
      const accounts = await PaymentsAccount.find().sort({ createdAt: -1 });
      res.json(accounts);
    } catch (error) {
      console.error('Error fetching payment accounts:', error);
      res.status(500).json({ message: 'Server Error' });
    }
  });
  
  // @route   GET /api/payment-accounts/:id
  // @desc    Get a specific payment account by ID
  // @access  Public (or Protected based on your auth)
  accountRouter.get('/get/:id', async (req, res) => {
    try {
      const account = await PaymentsAccount.findById(req.params.id);
      if (!account) {
        return res.status(404).json({ message: 'Payment Account not found' });
      }
      res.json(account);
    } catch (error) {
      console.error('Error fetching payment account:', error);
      res.status(500).json({ message: 'Server Error' });
    }
  });


export default accountRouter;
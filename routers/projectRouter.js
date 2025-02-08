// controllers/projectController.js
import express from 'express';
import Project from '../models/projectModal.js';
import User from '../models/userModel.js';
import Transactions from '../models/transcationsModal.js';
import Tasks from '../models/taskmodal.js';
import ProjectAttendence from '../models/ProjectattendenceMOdal.js';
import Matearials from '../models/matearialsModal.js';
import Worker from '../models/workerMOdal.js';
import PaymentCategory from '../models/paymentcategoryModal.js';
import Material from '../models/materialsModal.js';
import generateId, { calculateProjectInventory } from '../utils.js';
import MaterialReceipt from '../models/matearialreceiptModal.js';
import MaterialUsage from '../models/materialUsageModal.js';
import mongoose from 'mongoose';
import PaymentsAccount from '../models/paymentsAccountModal.js';
import MaterialRequest from '../models/matearialsModal.js';
import { createTask, deleteTask, getTask, getTasks, updateTask } from './projectTask.js';
import Task from '../models/projectTaskModal.js';
import ProjectChat from '../models/projectChat.js';



const projectRouter = express.Router();

// Controller function to create a new project
projectRouter.post('/create', async (req, res) => {
  try {
    const {
      name,
      customerName,
      customerAddress,
      customerPhone,
      estimatedAmount,
      startDate,
      estimatedEndDate,
      supervisors,
    } = req.body;

    // Create new project
    const project = new Project({
      name,
      customerName,
      customerAddress,
      customerPhone,
      estimatedAmount,
      startDate,
      estimatedEndDate,
      supervisors,
    });

    await project.save();

    // Assign the project to supervisors
    if (supervisors && supervisors.length > 0) {
      await User.updateMany(
        { _id: { $in: supervisors } },
        { $push: { assignedProjects: project._id } }
      );
    }

    res.status(201).json({ message: 'Project created successfully', project });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


projectRouter.get('/', async (req, res) => {
    try {
        const projects = await Project.find();
        res.json(projects);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
});


projectRouter.get('/my/assigned/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const projects = await Project.find({ supervisors: userId });
        res.json(projects);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
});


// Get project details
projectRouter.get('/project/details/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;


    if (!projectId) {
      return res.status(400).json({ error: "Project ID is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ error: "Invalid Project ID format" });
    }

    const project = await Project.findById(projectId).populate('supervisors', 'name email');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Transactions
projectRouter.get('/project/transactions/:projectId' , async (req, res) => {
    try {
        const { projectId } = req.params;
        const { date } = req.query;
    
        if (!date) {
          return res.status(400).json({ message: 'Date is required' });
        }
    
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
    
        const transactions = await Transactions.find({
          project: projectId,
          date: { $gte: startDate, $lte: endDate },
        }).sort({ date: 1 });
    
        res.json(transactions);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
});

projectRouter.post('/project/transactions/:projectId' , async (req, res) => {
    try {
        const { projectId } = req.params;
        const {
          type,
          amount,
          paymentFrom,
         paymentMethod : method,
          paymentCategory,
          remarks,
          date,
          transferFrom,
          transferTo,
          userId
        } = req.body;

        const paymentTo = req.body.paymentFrom;

         // Parse and validate amount
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: 'Invalid amount.' });
    }

    // Fetch the payment account by method (accountId)

    let referenceId; 
    let referenceIdOut;
    let referenceIdIn;

    // Handle different transaction types
    if (type === 'in') {

      const myAccount = await PaymentsAccount.findOne({ accountId: method });
      if (!myAccount) {
        return res.status(404).json({ message: 'Payment account not found.' });
      }

      if (!type || !amount || !paymentFrom || !method || !paymentCategory || !date || !userId) {
        return res.status(400).json({ message: 'All fields are required' });
      }
      // Payment In
      referenceId = 'IN' + Date.now().toString();

      const accountPaymentEntry = {
        amount: parsedAmount,
        method: method,
        remark: `Payment from ${paymentFrom}`,
        referenceId: referenceId,
        submittedBy: userId,
        date: new Date(date),
      };

      myAccount.paymentsIn.push(accountPaymentEntry);
      myAccount.balanceAmount += parsedAmount; 
      await myAccount.save();

    } else if (type === 'out') {

      const myAccount = await PaymentsAccount.findOne({ accountId: method });
      if (!myAccount) {
        return res.status(404).json({ message: 'Payment account not found.' });
      }

      if (!type || !amount || !paymentFrom || !method || !paymentCategory || !date || !userId) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      // Payment Out
      referenceId = 'OUT' + Date.now().toString();

      const accountPaymentEntry = {
        amount: parsedAmount,
        method: method,
        remark: `Payment to ${paymentTo}`,
        referenceId: referenceId,
        submittedBy: userId,
        date: new Date(date),
      };

      myAccount.paymentsOut.push(accountPaymentEntry);
      myAccount.balanceAmount -= parsedAmount; 
      // Check for negative balance if needed
      await myAccount.save();

    } else if (type === 'transfer') {

      if(!transferFrom || !transferTo){
        return res.status(400).json({ message: 'Transfer accounts are required.' });
      }

      // Transfer
      // paymentFrom and paymentTo are accountIds
      const fromAccount = await PaymentsAccount.findOne({ accountId: transferFrom });
      const toAccount = await PaymentsAccount.findOne({ accountId: transferTo });

      if (!fromAccount || !toAccount) {
        return res.status(404).json({ message: 'One or both payment accounts not found.' });
      }

      // if (fromAccount.balanceAmount < parsedAmount) {
      //   return res.status(400).json({ message: 'Insufficient funds in the source account.' });
      // }

      referenceIdOut = 'OUT' + Date.now().toString();
      referenceIdIn = 'IN' + Date.now().toString();

      const transferOutEntry = {
        amount: parsedAmount,
        method: toAccount.accountId,
        remark: `Transferred to ${paymentTo}`,
        referenceId: referenceIdOut,
        submittedBy: userId,
        date: new Date(date),
      };

      const transferInEntry = {
        amount: parsedAmount,
        method: fromAccount.accountId,
        remark: `Transferred from ${paymentFrom}`,
        referenceId: referenceIdIn,
        submittedBy: userId,
        date: new Date(date),
      };

      fromAccount.paymentsOut.push(transferOutEntry);
      fromAccount.balanceAmount -= parsedAmount;

      toAccount.paymentsIn.push(transferInEntry);
      toAccount.balanceAmount += parsedAmount;

      await fromAccount.save();
      await toAccount.save();
    }
    
        const transaction = new Transactions({
          project: projectId,
          supervisor: userId,
          type,
          amount,
          paymentFrom: paymentFrom ? paymentFrom : transferFrom,
          paymentMethod: method ? method : transferTo,
          paymentCategory,
          remarks,
          date,
        });
    
        await transaction.save();
    
        res.status(201).json({ message: 'Transaction added', transaction });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
});


projectRouter.get('/project/Paymentcategories', async (req, res) => {
    try {
      const categories = await PaymentCategory.find().sort({ name: 1 });
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });


projectRouter.post('/project/Paymentcategories', async (req, res) => {
    try {
        const { name } = req.body;
    
        if (!name) {
          return res.status(400).json({ message: 'Category name is required' });
        }
    
        // Check if category already exists
        const existingCategory = await PaymentCategory.findOne({ name });
        if (existingCategory) {
          return res.status(400).json({ message: 'Category already exists' });
        }
    
        const category = new PaymentCategory({ name });
        await category.save();
    
        res.status(201).json({ message: 'Payment category added', category });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
});
  

// Material Requests
projectRouter.get('/project/materials/:projectId', async (req, res) => {
  try {
      const { projectId } = req.params;
      const requests = await Matearials.find({ project: projectId })
        .populate('items.material')
        .sort({ createdAt: -1 });
      res.json(requests);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});


// Get approved materials for a project that have not been fully received
projectRouter.get('/project/approved-materials/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    const approvedRequests = await Matearials.find({
      project: projectId,
      'items.status': { $in: ['Approved', 'Partially Approved'] },
    }).populate('items.material');

    let approvedMaterials = [];

    for (const request of approvedRequests) {
      for (const item of request.items) {
        if (item.status !== 'Rejected') {
          const pendingQuantity = item.approvedQuantity - (item.receivedQuantity || 0);

          if (pendingQuantity > 0) {
            approvedMaterials.push({
              _id: item.material._id,
              material: item.material,
              approvedQuantity: pendingQuantity,
              unit: item.material.unit,
            });
          }
        }
      }
    }

    res.json(approvedMaterials);
  } catch (error) {
    console.error('Error fetching approved materials:', error);
    res.status(500).json({ error: error.message });
  }
});


// Create a new material request
projectRouter.post('/materials/:projectId', async (req, res) => {
  try {
      const { projectId } = req.params;
      const { date, items, userId } = req.body;
      if (!date || !items || items.length === 0) {
          return res.status(400).json({ message: 'Date and items are required' });
      }
      const requestId = await generateId('REQ');
      const request = new MaterialRequest({
        requestId,
        project: projectId,
        supervisor: userId,
        date,
        items: items.map(item => ({
            material: item.material,
            quantity: item.quantity,
            approvedQuantity: undefined,  // Explicitly setting it as undefined
            rejectedQuantity: 0,
            receivedQuantity: 0,
            status: 'Pending', // Ensure initial status is Pending
        })),
    });
    
      await request.save();
      res.status(201).json({ message: 'Material request submitted', request });
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

// Update material request status
projectRouter.put('/project/materials/requests/:requestId/approve', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ message: 'Items are required' });
    }

    // Find the material request
    const request = await MaterialRequest.findById(requestId).populate('items.material');
    if (!request) {
      return res.status(404).json({ message: 'Material request not found' });
    }

    // Process items and collect errors
    const errors = [];
    for (const updatedItem of items) {
      const { materialId, approvedQuantity, rejectedQuantity, status } = updatedItem;

      const item = request.items.find(
        (i) => i.material._id.toString() === materialId.toString()
      );

      if (!item) {
        errors.push(`Material with ID ${materialId} not found in request`);
        continue;
      }

      // Validate quantities
      const totalQuantity = item.quantity;
      if ((approvedQuantity ?? 0) + (rejectedQuantity ?? 0) !== totalQuantity) {
        errors.push(`Approved + rejected must equal total for material ${materialId}`);
        continue;
      }

      if (!['Approved', 'Partially Approved', 'Rejected'].includes(status)) {
        errors.push(`Invalid status for material ${materialId}`);
        continue;
      }

      // Update item
      item.approvedQuantity = approvedQuantity;
      item.rejectedQuantity = rejectedQuantity;
      item.status = status;
    }

    // If any errors were found, return them
    if (errors.length > 0) {
      return res.status(400).json({ message: 'Some materials had issues', errors });
    }

    // Save the updated request
    await request.save();

    res.status(200).json({ message: 'Request updated successfully', request });
  } catch (error) {
    console.error('Error approving request:', error.stack);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});




// Attendance
 projectRouter.get('/project/attendence/:projectId' , async (req, res) => {
    try {
        const { projectId } = req.params;
        const { date } = req.query;
    
        if (!date) {
          return res.status(400).json({ message: 'Date is required' });
        }
    
        let attendance = await ProjectAttendence.findOne({ project: projectId, date })
          .populate({
            path: 'attendanceRecords.worker',
            model: 'Worker',
          });
    
        if (!attendance) {
          // Initialize attendance with workers
          const workers = await Worker.find({ project: projectId });
          attendance = {
            project: projectId,
            date,
            attendanceRecords: workers.map((worker) => ({
              worker,
              isPresent: false,
              shifts: 1,
              overtimeHours: 0,
            })),
          };
        }
    
        res.json(attendance);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
});

 projectRouter.post('/project/attendence/:projectId' , async (req, res) => {
    try {
        const { projectId } = req.params;
        const { date, attendanceRecords } = req.body;
    
        if (!date || !attendanceRecords) {
          return res.status(400).json({ message: 'Date and attendance records are required' });
        }
    
        let attendance = await ProjectAttendence.findOne({ project: projectId, date });
    
        if (attendance) {
          // Update existing attendance
          attendance.attendanceRecords = attendanceRecords;
          await attendance.save();
        } else {
          // Create new attendance
          attendance = new ProjectAttendence({
            project: projectId,
            date,
            attendanceRecords,
          });
          await attendance.save();
        }
    
        res.status(201).json({ message: 'Attendance saved', attendance });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
});

// Tasks
 projectRouter.get('/project/tasks/:projectId' , async (req, res) => {
  try {
    const tasks = await Tasks.find({ project: req.params.projectId });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

projectRouter.post('/project/tasks/:taskId' , async (req, res) => {
  try {
    const { progress, status } = req.body;
    const task = await Tasks.findByIdAndUpdate(
      req.params.taskId,
      { progress, status },
      { new: true }
    );
    res.json({ message: 'Task updated', task });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


projectRouter.get('/project/workers', async (req, res) => {
    try {
        const workers = await Worker.find({ project: req.params.projectId });
        res.json(workers);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
});


projectRouter.get('/project/workers/category', async (req, res) => {
    try {
        const workers = await Worker.find().distinct('category');
        res.json(workers);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
});


projectRouter.post('/project/workers/:projectId' , async (req, res) => {
    try {
        const { name, contactNumber, category, shiftSalary } = req.body;
        const worker = new Worker({
          project: req.params.projectId,
          name,
          contactNumber,
          category,
          shiftSalary,
        });
        await worker.save();
        res.status(201).json({ message: 'Worker added', worker });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
});


projectRouter.get('/project/material', async (req, res) => {
    try {
        const materials = await Material.find();
        res.json(materials);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
});


projectRouter.post('/material/add', async (req, res) => {
    try {
        const { name, unit } = req.body;
        if (!name || !unit) {
          return res.status(400).json({ message: 'Name and unit are required' });
        }
        const existingMaterial = await Material.findOne({ name });
        if (existingMaterial) {
          return res.status(400).json({ message: 'Material already exists' });
        }
        const material = new Material({ name, unit });
        await material.save();
        res.status(201).json({ message: 'Material added', material });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
});



projectRouter.get('/project/searchMaterial', async (req, res) => {
    try {
        const { query } = req.query;
        const materials = await Material.find({ name: { $regex: query, $options: 'i' } });
        res.json(materials);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
});



projectRouter.get('/project/inventory/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    // Calculate received quantities
    const receipts = await MaterialReceipt.find({ project: projectId });
    const inventoryMap = {};

    receipts.forEach((receipt) => {
      receipt.items.forEach((item) => {
        const key = item.material.toString();
        if (!inventoryMap[key]) {
          inventoryMap[key] = 0;
        }
        inventoryMap[key] += item.quantity;
      });
    });

    // Subtract used quantities
    const usages = await MaterialUsage.find({ project: projectId });

    usages.forEach((usage) => {
      usage.items.forEach((item) => {
        const key = item.material.toString();
        if (!inventoryMap[key]) {
          inventoryMap[key] = 0;
        }
        inventoryMap[key] -= item.quantity;
      });
    });

    // Remove materials with zero or negative quantities
    for (const key in inventoryMap) {
      if (inventoryMap[key] <= 0) {
        delete inventoryMap[key];
      }
    }

    // Get material details
    const materialIds = Object.keys(inventoryMap);
    const materials = await Material.find({ _id: { $in: materialIds } });

    // Prepare response
    const inventoryList = materials.map((material) => ({
      material,
      quantity: inventoryMap[material._id.toString()],
    }));

    res.json(inventoryList);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: error.message });
  }
});


// Get material receipts for a project
projectRouter.get('/project/get-receipt-material/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const receipts = await MaterialReceipt.find({ project: projectId })
      .populate('items.material')
      .sort({ createdAt: -1 });
    res.json(receipts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// Add a new material receipt
projectRouter.post('/project/add-receipt/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { date, items, userId } = req.body;

    if (!date || !items || items.length === 0 || !userId) {
      console.error("Error: missing required fields");
      return res.status(400).json({ message: 'Date and items are required' });
    }

    // Filter items by checking if they have approved or partially approved requests.
    const validItems = [];
    for (const item of items) {
      const approvedRequests = await Matearials.find({
        project: projectId,
        'items.material': item.material,
        'items.status': { $in: ['Approved', 'Partially Approved'] },
      });
      if (approvedRequests && approvedRequests.length > 0) {
        validItems.push(item);
      } else {
        console.warn(`No approved requests found for material ${item.material}. Skipping this item.`);
      }
    }

    // If none of the items are valid, return an error.
    if (validItems.length === 0) {
      return res.status(400).json({ message: 'No approved requests found for any of the provided items.' });
    }

    // Create the receipt only with valid items.
    const receiptId = await generateId('REC');
    const receipt = new MaterialReceipt({
      receiptId,
      project: projectId,
      supervisor: userId,
      date,
      items: validItems,
    });

    await receipt.save();

    // Update received quantities in material requests for each valid item.
    for (const item of validItems) {
      await updateReceivedQuantities(projectId, item.material, item.quantity);
    }

    res.status(201).json({ message: 'Material receipt added', receipt });
  } catch (error) {
    console.error('Error adding receipt:', error);
    res.status(500).json({ error: error.message });
  }
});




async function updateReceivedQuantities(projectId, materialId, quantityReceived) {
  try {
    const requests = await Matearials.find({
      project: projectId,
      'items.material': materialId,
      'items.status': { $in: ['Approved', 'Partially Approved'] },
    });

    let remainingQuantity = quantityReceived;

    for (const request of requests) {
      for (const item of request.items) {
        if (item.material.toString() === materialId.toString() && item.status !== 'Rejected') {
          const pendingQuantity = item.approvedQuantity - (item.receivedQuantity || 0);

          if (pendingQuantity > 0) {
            const allocateQuantity = Math.min(pendingQuantity, remainingQuantity);
            item.receivedQuantity = (item.receivedQuantity || 0) + allocateQuantity;
            remainingQuantity -= allocateQuantity;

            // Save the updated request
            await request.save();

            if (remainingQuantity <= 0) {
              break;
            }
          }
        }
      }

      if (remainingQuantity <= 0) {
        break;
      }
    }
  } catch (error) {
    console.error('Error updating received quantities:', error);
    throw error;
  }
}


projectRouter.put('/project/approved-materials/:projectId/mark-received', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { materialId, quantityReceived } = req.body;

    // Validate input
    if (!materialId || quantityReceived == null) {
      return res.status(400).json({ message: 'Material ID and quantity received are required' });
    }

    if (!mongoose.Types.ObjectId.isValid(materialId) || !mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: 'Invalid project or material ID' });
    }

    // Find material requests for this project with the specified material ID
    const requests = await Matearials.find({
      project: projectId,
      'items.material': materialId,
      'items.status': { $in: ['Approved', 'Partially Approved'] },
    });

    if (requests.length === 0) {
      return res.status(404).json({ message: 'No approved requests found for this material' });
    }

    let remainingQuantity = quantityReceived;

    // Update the requests and mark them as received
    for (const request of requests) {
      let requestModified = false;

      for (const item of request.items) {
        if (
          item.material.toString() === materialId.toString() &&
          ['Approved', 'Partially Approved'].includes(item.status)
        ) {
          const pendingQuantity = item.approvedQuantity - (item.receivedQuantity || 0);

          if (pendingQuantity > 0) {
            const allocateQuantity = Math.min(pendingQuantity, remainingQuantity);
            item.receivedQuantity = (item.receivedQuantity || 0) + allocateQuantity;
            remainingQuantity -= allocateQuantity;
            requestModified = true;

            // If we've received all the quantity, stop
            if (remainingQuantity <= 0) {
              break;
            }
          }
        }
      }

      if (requestModified) {
        // Update item statuses if fully received
        for (const item of request.items) {
          if (
            item.material.toString() === materialId.toString() &&
            item.receivedQuantity >= item.approvedQuantity
          ) {
            item.status = 'Received';
          }
        }
        await request.save();
      }

      // If all quantity is allocated, stop processing further requests
      if (remainingQuantity <= 0) {
        break;
      }
    }

    // Update the stock in the Material collection
    const material = await Material.findById(materialId);
    if (material) {
      material.stock += quantityReceived;
      await material.save();
    } else {
      return res.status(404).json({ message: 'Material not found' });
    }

    res.status(200).json({ message: 'Approved material marked as received and stock updated' });
  } catch (error) {
    console.error('Error marking approved material as received:', error);
    res.status(500).json({ error: error.message });
  }
});




// Add Used Materials
projectRouter.post('/project/add-used/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { date, items, userId } = req.body;

    // Validate input
    if (!date || !items || items.length === 0) {
      return res.status(400).json({ message: 'Date and items are required.' });
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID.' });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID.' });
    }

    // Step 1: Check stock availability and update in real-time
    for (const item of items) {
      const materialId = item.material;
      const quantityRequested = item.quantity;

      if (!mongoose.Types.ObjectId.isValid(materialId)) {
        return res.status(400).json({ message: `Invalid material ID: ${materialId}` });
      }

      // Fetch the current stock of the material
      const material = await Material.findById(materialId);
      if (!material) {
        return res.status(404).json({ message: `Material not found for ID: ${materialId}` });
      }

      // Check if there is enough stock available
      if (material.stock < quantityRequested) {
        return res.status(400).json({
          message: `Insufficient stock for material ${material.name}. Available: ${material.stock}, Requested: ${quantityRequested}`,
        });
      }

      // Deduct the stock directly in the Material collection
      material.stock -= quantityRequested;
      await material.save();
    }

    // Step 2: Generate a unique usage ID
    const usageId = await generateId('USE');

    // Step 3: Create a new MaterialUsage record
    const usage = new MaterialUsage({
      usageId,
      project: projectId,
      supervisor: userId,
      date,
      items,
    });

    // Save the usage record
    await usage.save();

    res.status(201).json({ message: 'Material usage added successfully.', usage });
  } catch (error) {
    console.error('Error adding used materials:', error);
    res.status(500).json({ error: error.message });
  }
});








// Get Used Materials by Date
projectRouter.get('/project/materials/used/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { date } = req.query;

    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const usages = await MaterialUsage.find({
      project: projectId,
      date: { $gte: startDate, $lte: endDate },
    })
      .populate('items.material')
      .sort({ createdAt: -1 });

    res.json(usages);
  } catch (error) {
    console.error('Error fetching used materials:', error);
    res.status(500).json({ error: error.message });
  }
});



projectRouter.get('/project/all-transactions', async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    // Validate the presence of both dates
    if (!fromDate || !toDate) {
      return res.status(400).json({ message: 'Both fromDate and toDate query parameters are required.' });
    }

    // Convert query parameters to Date objects
    const start = new Date(fromDate);
    const end = new Date(toDate);

    // Validate date formats
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    // Ensure that fromDate is not after toDate
    if (start > end) {
      return res.status(400).json({ message: 'fromDate cannot be after toDate.' });
    }

    // Adjust end date to include the entire day
    end.setHours(23, 59, 59, 999);

    // Retrieve transactions within the date range
    const transactions = await Transactions.find({
      date: { $gte: start, $lte: end },
    }).sort({ date: -1 });

    // Map and format transactions to include payment details
    const formattedTransactions = transactions.map(transaction => {
      let paymentDetails;

      // For a transfer transaction, show both the source and destination details
      if (transaction.type === 'transfer') {
        paymentDetails = {
          paymentFrom: transaction.paymentFrom,
          paymentTo: transaction.paymentMethod, // Here, paymentMethod holds the "to" information
        };
      } else if (transaction.type === 'in') {
        // For an "in" transaction, use paymentFrom as the payment detail
        paymentDetails = transaction.paymentFrom;
      } else if (transaction.type === 'out') {
        // For an "out" transaction, use paymentMethod as the payment detail
        paymentDetails = transaction.paymentMethod;
      }

      return {
        _id: transaction._id,
        project: transaction.project,
        supervisor: transaction.supervisor,
        type: transaction.type,
        amount: transaction.amount,
        paymentFrom: transaction.paymentFrom,
        paymentMethod: transaction.paymentMethod,
        paymentCategory: transaction.paymentCategory,
        remarks: transaction.remarks,
        date: transaction.date,
        createdAt: transaction.createdAt,
        paymentDetails,
      };
    });

    res.json(formattedTransactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: 'Internal Server Error while fetching transactions.' });
  }
});


projectRouter.get('/full/:id', async (req, res) => {
  try {
    const projectId = req.params.id;

    // Fetch the core project details
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Fetch related data concurrently
    const [
      attendance,
      tasks,
      transactions,
      materialReceipts,
      materialRequests,
      materialUsages,
    ] = await Promise.all([
      ProjectAttendence.find({ project: projectId }),
      Task.find({ projectId }),
      Transactions.find({ project: projectId }),
      MaterialReceipt.find({ project: projectId }),
      MaterialRequest.find({ project: projectId }),
      MaterialUsage.find({ project: projectId }),
    ]);

    // Compute total materials received from receipts
    const totalMaterialsReceived = materialReceipts.reduce((acc, receipt) => {
      const sum = receipt.items.reduce((s, item) => s + item.quantity, 0);
      return acc + sum;
    }, 0);

    // Compute total materials used from usages
    const totalMaterialsUsed = materialUsages.reduce((acc, usage) => {
      const sum = usage.items.reduce((s, item) => s + item.quantity, 0);
      return acc + sum;
    }, 0);

    // Compute inventory count (received minus used)
    const inventoryCount = totalMaterialsReceived - totalMaterialsUsed;

    res.json({
      project,
      attendance,
      tasks,
      transactions,
      materialReceipts,
      materialRequests,
      materialUsages,
      totalMaterialsReceived,
      totalMaterialsUsed,
      inventoryCount,
    });
  } catch (error) {
    console.error('Error retrieving full project data:', error);
    res.status(500).json({ message: error.message });
  }
});



// // GET: Fetch all chat messages for a project
projectRouter.get('/:projectId/chat', async (req, res) => {
  const { projectId } = req.params;
  try {
    const messages = await ProjectChat.find({ projectId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST: Create a new chat message for a project
projectRouter.post('/:projectId/chat', async (req, res) => {
  const { projectId } = req.params;
  const { text, authorName, authorRole, authorId, attachmentUrl } = req.body;
  try {
    const newMessage = new ProjectChat({
      text,
      authorName,
      authorRole,
      authorId,
      projectId,
      attachmentUrl
    });
    await newMessage.save();
    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Error saving chat message:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


projectRouter.get('/:projectId/supervisors', async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId).populate('supervisors', 'name role'); 
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project.supervisors);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/projects/:projectId/chat
 * -> Returns all group chat messages for this project (where toUserId is blank).
 */
projectRouter.get('/:projectId/chat', async (req, res) => {
  try {
    const messages = await ProjectChat.find({
      projectId: req.params.projectId,
      toUserId: ''
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    console.error('Error fetching group chat:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/projects/:projectId/chat/user/:otherUserId
 * -> Returns private messages between the current user and otherUserId for that project
 * You can figure out the "current user" from JWT or from a query param, but for example:
 */
projectRouter.get('/:projectId/chat/user/:userA/:userB', async (req, res) => {
  try {
    const { projectId, userA, userB } = req.params;
    // We want messages where:
    // 1) authorId=userA AND toUserId=userB, or
    // 2) authorId=userB AND toUserId=userA
    const messages = await ProjectChat.find({
      projectId,
      $or: [
        { authorId: userA, toUserId: userB },
        { authorId: userB, toUserId: userA }
      ]
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    console.error('Error fetching private chat:', err);
    res.status(500).json({ error: 'Server error' });
  }
});




// GET all tasks for a project
projectRouter.get('/:projectId/tasks', getTasks);

// GET one specific task
projectRouter.get('/:projectId/tasks/:taskId', getTask);

// CREATE a new task
projectRouter.post('/:projectId/tasks', createTask);

// UPDATE a task
projectRouter.put('/:projectId/tasks/:taskId', updateTask);

// DELETE a task
projectRouter.delete('/:projectId/tasks/:taskId', deleteTask);







export default projectRouter;

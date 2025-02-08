// models/MaterialRequest.js
import mongoose from 'mongoose';

const MaterialRequestSchema = new mongoose.Schema(
  {
    requestId: { type: String, unique: true, required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    supervisor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    status: {
      type: String,
      enum: ['Pending', 'Partially Approved', 'Approved', 'Rejected', 'Partially Received', 'Received'],
      default: 'Pending',
    },
    items: [
      {
        material: { type: mongoose.Schema.Types.ObjectId, ref: 'Material', required: true },
        quantity: { type: Number, required: true }, // Requested Quantity
        approvedQuantity: { type: Number, default: 0 },
        rejectedQuantity: { type: Number, default: 0 },
        receivedQuantity: { type: Number, default: 0 },
        status: {
          type: String,
          enum: ['Pending', 'Partially Approved', 'Approved', 'Rejected', 'Partially Received', 'Received'],
          default: 'Pending',
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);


MaterialRequestSchema.pre('save', function (next) {
  const request = this;

  request.items.forEach((item) => {
      if (item.approvedQuantity === undefined || item.approvedQuantity === null) {
          item.status = 'Pending';  // Default Pending for new requests
      } else if (item.approvedQuantity === item.quantity) {
          item.status = 'Approved';
      } else if (item.approvedQuantity > 0 && item.approvedQuantity < item.quantity) {
          item.status = 'Partially Approved';
      } else if (item.approvedQuantity === 0 && item.status !== 'Pending') { 
          // Only reject if it's not Pending (to avoid auto-rejecting new requests)
          item.status = 'Rejected';
      }

      if (item.receivedQuantity === item.approvedQuantity && item.approvedQuantity > 0) {
          item.status = 'Received';
      } else if (item.receivedQuantity > 0 && item.receivedQuantity < item.approvedQuantity) {
          item.status = 'Partially Received';
      }
  });

  const itemStatuses = request.items.map((item) => item.status);

  // Update overall request status based on item statuses
  if (itemStatuses.every((status) => status === 'Received')) {
    request.status = 'Received';
  } else if (itemStatuses.some((status) => ['Partially Received', 'Received'].includes(status))) {
    request.status = 'Partially Received';
  } else if (itemStatuses.every((status) => status === 'Approved')) {
    request.status = 'Approved';
  } else if (itemStatuses.every((status) => status === 'Rejected')) {
    request.status = 'Rejected';
  } else if (itemStatuses.some((status) => ['Partially Approved', 'Approved'].includes(status))) {
    request.status = 'Partially Approved';
  } else {
    request.status = 'Pending';
  }

  next();
});


// Pre-save hook to update the item and overall request statuses based on quantities
// MaterialRequestSchema.pre('save', function (next) {
//   const request = this;

//   // Update status for each item
//   request.items.forEach((item) => {
//     if (item.approvedQuantity === undefined || item.approvedQuantity === null) {
//         item.status = 'Pending'; // Ensure status remains Pending for new requests
//     } else if (item.approvedQuantity === item.quantity) {
//         item.status = 'Approved';
//     } else if (item.approvedQuantity > 0 && item.approvedQuantity < item.quantity) {
//         item.status = 'Partially Approved';
//     } else if (item.approvedQuantity === 0) {
//         item.status = 'Rejected';
//     }

//     if (item.receivedQuantity === item.approvedQuantity && item.approvedQuantity > 0) {
//         item.status = 'Received';
//     } else if (item.receivedQuantity > 0 && item.receivedQuantity < item.approvedQuantity) {
//         item.status = 'Partially Received';
//     }
// });


//   // Collect all item statuses
  // const itemStatuses = request.items.map((item) => item.status);

  // // Update overall request status based on item statuses
  // if (itemStatuses.every((status) => status === 'Received')) {
  //   request.status = 'Received';
  // } else if (itemStatuses.some((status) => ['Partially Received', 'Received'].includes(status))) {
  //   request.status = 'Partially Received';
  // } else if (itemStatuses.every((status) => status === 'Approved')) {
  //   request.status = 'Approved';
  // } else if (itemStatuses.every((status) => status === 'Rejected')) {
  //   request.status = 'Rejected';
  // } else if (itemStatuses.some((status) => ['Partially Approved', 'Approved'].includes(status))) {
  //   request.status = 'Partially Approved';
  // } else {
  //   request.status = 'Pending';
  // }

  // next();
// });

const MaterialRequest = mongoose.model('MaterialRequest', MaterialRequestSchema);
export default MaterialRequest;

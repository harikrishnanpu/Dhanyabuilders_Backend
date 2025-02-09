import mongoose, { Types } from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    id: { type: String, default: Date.now().toString() },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: false, required: true },
    isEmployee: { type: Boolean, default: false, required: true },
    isSupervisor: { type: Boolean, default: false, required: true },
    isSuper: { type: Boolean, default: false},
    role: { type: String, default: 'sales'},
    contactNumber: { type: String},
    faceDescriptor: { type: Array , default: null },
    work_email: { type: String },
    personal_email: { type: String },
    work_phone: { type: String },
    personal_phone: { type: String },
    location: { type: String },
    avatar: { type: String },
    status: { type: String },
    lastMessage: { type: String },
    birthdayText: { type: String },
    unReadChatCount: { type: Number, default: 0 },
    online_status: { type: String, default: 'offline' }
  },
  {
    timestamps: true,
  }
);
const User = mongoose.model('User', userSchema);
export default User;

// models/ProjectChatMessage.js
import mongoose from 'mongoose';

const ProjectChatMessageSchema = new mongoose.Schema({
  text: { type: String },
  authorName: { type: String, required: true },
  authorRole: { type: String, required: true },
  authorId: { type: String, required: true },
  projectId: { type: String, required: true },
  attachmentUrl: { type: String, default: '' },

  // "toUserId" is optional. If present, it's a private message from authorId -> toUserId.
  // If null, it's a group chat message for the entire project.
  toUserId: { type: String, default: '' },

  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('ProjectChatMessage', ProjectChatMessageSchema);

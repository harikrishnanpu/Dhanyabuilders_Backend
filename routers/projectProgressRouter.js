// controllers/projectController.js

import Project from "../models/projectModal.js";



// Helper to (optionally) re-calc the main progress item’s percentage from subprogress
function recalcMainProgressItem(item) {
  if (!item.subProgress || item.subProgress.length === 0) {
    // No subprogress => keep existing item.percentage as-is (or do something else)
    return;
  }
  // Example: sum of subProgress percentages (clamped at 100)
  const sum = item.subProgress.reduce((acc, sp) => acc + sp.percentage, 0);
  item.percentage = Math.min(sum, 100); // or handle differently if you want
  // Mark completed if total >= 100 (or all subProgress are completed, etc.)
  item.completed = sum >= 100;
}

/**
 * Get all progress items for a project
 * GET /api/projects/:projectId/progress
 */
export const getProgressItems = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId).lean();
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project.progress || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Create a new main progress item
 * POST /api/projects/:projectId/progress
 */
export const createProgressItem = async (req, res) => {
  try {
    const { title, percentage = 0 } = req.body;
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    project.progress.push({ title, percentage });
    await project.save();
    res.json(project.progress);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Update a main progress item
 * PATCH /api/projects/:projectId/progress/:progressId
 */
export const updateProgressItem = async (req, res) => {
  try {
    const { title, percentage, completed } = req.body;
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const item = project.progress.id(req.params.progressId);
    if (!item) return res.status(404).json({ error: 'Progress item not found' });

    if (title !== undefined) item.title = title;
    if (percentage !== undefined) item.percentage = percentage;
    if (completed !== undefined) item.completed = completed;

    // Optionally recalc if subProgress exist
    recalcMainProgressItem(item);

    await project.save();
    res.json(project.progress);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Delete a main progress item
 * DELETE /api/projects/:projectId/progress/:progressId
 */
export const deleteProgressItem = async (req, res) => {
    try {
      const project = await Project.findById(req.params.projectId);
      if (!project) return res.status(404).json({ error: 'Project not found' });
  
      // ✅ Correct way to remove the progress item
      project.progress = project.progress.filter(
        (p) => p._id.toString() !== req.params.progressId
      );
  
      await project.save();
      res.json({ message: "Progress item deleted successfully", progress: project.progress });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
  

/**
 * Create a sub-progress item
 * POST /api/projects/:projectId/progress/:progressId/subprogress
 */
export const createSubProgressItem = async (req, res) => {
  try {
    const { title, percentage = 0 } = req.body;
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const mainItem = project.progress.id(req.params.progressId);
    if (!mainItem) return res.status(404).json({ error: 'Progress item not found' });

    mainItem.subProgress.push({ title, percentage });
    // recalc
    recalcMainProgressItem(mainItem);

    await project.save();
    res.json(project.progress);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Update a sub-progress item
 * PATCH /api/projects/:projectId/progress/:progressId/subprogress/:subProgressId
 */
export const updateSubProgressItem = async (req, res) => {
  try {
    const { title, percentage, completed } = req.body;
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const mainItem = project.progress.id(req.params.progressId);
    if (!mainItem) return res.status(404).json({ error: 'Progress item not found' });

    const subItem = mainItem.subProgress.id(req.params.subProgressId);
    if (!subItem) return res.status(404).json({ error: 'Sub-progress item not found' });

    if (title !== undefined) subItem.title = title;
    if (percentage !== undefined) subItem.percentage = percentage;
    if (completed !== undefined) subItem.completed = completed;

    // recalc
    recalcMainProgressItem(mainItem);

    await project.save();
    res.json(project.progress);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Delete a sub-progress item
 * DELETE /api/projects/:projectId/progress/:progressId/subprogress/:subProgressId
 */
export const deleteSubProgressItem = async (req, res) => {
    try {
      const project = await Project.findById(req.params.projectId);
      if (!project) return res.status(404).json({ error: 'Project not found' });
  
      const mainItem = project.progress.id(req.params.progressId);
      if (!mainItem) return res.status(404).json({ error: 'Main progress item not found' });
  
      // ✅ Correct way to delete a sub-progress item
      mainItem.subProgress = mainItem.subProgress.filter(
        (sp) => sp._id.toString() !== req.params.subProgressId
      );
  
      await project.save();
      res.json(mainItem.subProgress);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
  

/**
 * Get comments for a main progress item
 * GET /api/projects/:projectId/progress/:progressId/comments
 */
export const getProgressComments = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId).populate('progress.comments.user', 'name');
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const mainItem = project.progress.id(req.params.progressId);
    if (!mainItem) return res.status(404).json({ error: 'Progress item not found' });

    res.json(mainItem.comments || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Add a comment to a main progress item
 * POST /api/projects/:projectId/progress/:progressId/comments
 */
export const addProgressComment = async (req, res) => {
  try {
    // Example: we read user from req.user if you have auth
    // or you can pass userId in the body for demonstration
    const { text, userId } = req.body;
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const mainItem = project.progress.id(req.params.progressId);
    if (!mainItem) return res.status(404).json({ error: 'Progress item not found' });

    mainItem.comments.push({ text, user: userId });
    await project.save();

    res.json(mainItem.comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Update a comment
 * PATCH /api/projects/:projectId/progress/:progressId/comments/:commentId
 */
export const updateProgressComment = async (req, res) => {
  try {
    const { text } = req.body;
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const mainItem = project.progress.id(req.params.progressId);
    if (!mainItem) return res.status(404).json({ error: 'Progress item not found' });

    const comment = mainItem.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    // Optionally check if comment.user == req.user._id to ensure ownership
    comment.text = text;

    await project.save();
    res.json(mainItem.comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Delete a comment
 * DELETE /api/projects/:projectId/progress/:progressId/comments/:commentId
 */
export const deleteProgressComment = async (req, res) => {
    try {
      const project = await Project.findById(req.params.projectId);
      if (!project) return res.status(404).json({ error: 'Project not found' });
  
      const mainItem = project.progress.id(req.params.progressId);
      if (!mainItem) return res.status(404).json({ error: 'Progress item not found' });
  
      // Fix: Use filter to remove the comment
      mainItem.comments = mainItem.comments.filter(
        (c) => c._id.toString() !== req.params.commentId
      );
  
      await project.save();
      res.json(mainItem.comments);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
  

import Task from '../models/projectTaskModal.js';

/**
 * GET /api/projects/:projectId/tasks
 * Fetch all tasks for a given project
 */
export async function getTasks(req, res) {
  try {
    const { projectId } = req.params;
    const tasks = await Task.find({ projectId }).sort({ createdAt: -1 });
    return res.status(200).json(tasks);
  } catch (err) {
    console.error('Error fetching tasks:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}

/**
 * GET /api/projects/:projectId/tasks/:taskId
 * Fetch a single task by ID
 */
export async function getTask(req, res) {
  try {
    const { projectId, taskId } = req.params;
    const task = await Task.findOne({ _id: taskId, projectId });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    return res.status(200).json(task);
  } catch (err) {
    console.error('Error fetching task:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}

/**
 * POST /api/projects/:projectId/tasks
 * Create a new task
 */
export async function createTask(req, res) {
  try {
    const { projectId } = req.params;
    const payload = req.body;
    // Ensure projectId is stored
    payload.projectId = projectId;

    const newTask = await Task.create(payload);
    return res.status(201).json(newTask);
  } catch (err) {
    console.error('Error creating task:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}

/**
 * PUT /api/projects/:projectId/tasks/:taskId
 * Update an existing task
 */
export async function updateTask(req, res) {
  try {
    const { projectId, taskId } = req.params;
    const updates = req.body;
    updates.updatedAt = new Date();

    const task = await Task.findOneAndUpdate(
      { _id: taskId, projectId },
      updates,
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    return res.status(200).json(task);
  } catch (err) {
    console.error('Error updating task:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}

/**
 * DELETE /api/projects/:projectId/tasks/:taskId
 * Delete a task
 */
export async function deleteTask(req, res) {
  try {
    const { projectId, taskId } = req.params;
    const task = await Task.findOneAndDelete({ _id: taskId, projectId });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    return res.status(200).json({ message: 'Task deleted successfully' });
  } catch (err) {
    console.error('Error deleting task:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}

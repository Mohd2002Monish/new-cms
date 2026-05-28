import Joi from 'joi';
import { Category } from '../models/Category.js';
import * as audit from '../services/audit.service.js';

// ─── Validation Schemas ──────────────────────────────────────────────────────

const createCategorySchema = Joi.object({
  name: Joi.string().min(2).max(80).required(),
  description: Joi.string().max(500).allow('').optional(),
});

const updateCategorySchema = Joi.object({
  name: Joi.string().min(2).max(80).optional(),
  description: Joi.string().max(500).allow('').optional(),
  isActive: Joi.boolean().optional(),
});

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * GET /api/categories
 * Returns all active categories (all authenticated users).
 * Admins get all including inactive by passing ?all=true.
 */
export const getCategories = async (req, res, next) => {
  try {
    const isAdmin = req.user?.role === 'admin';
    const showAll = isAdmin && req.query.all === 'true';
    const showDeleted = req.query.showDeleted === 'true';

    const filter = showAll ? {} : { isActive: true };
    if (showDeleted && isAdmin) {
      filter.deletedAt = { $ne: null };
    } else {
      filter.deletedAt = null;
    }

    const categories = await Category.find(filter)
      .setOptions({ includeDeleted: showDeleted })
      .sort({ order: 1, name: 1 })
      .populate('createdBy', 'name email');

    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/categories
 * Create a new category (Admin only).
 */
export const createCategory = async (req, res, next) => {
  try {
    const { error, value } = createCategorySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const exists = await Category.findOne({ name: new RegExp(`^${value.name}$`, 'i') });
    if (exists) {
      return res.status(409).json({ success: false, message: 'A category with this name already exists' });
    }

    const category = await Category.create({ ...value, createdBy: req.user._id });

    await audit.log({
      req, action: 'CATEGORY_CREATED', targetType: 'Category', targetId: category._id, targetLabel: category.name,
      newState: { name: category.name, description: category.description, isActive: category.isActive }
    });

    res.status(201).json({ success: true, message: 'Category created', data: category });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/categories/:id
 * Update a category (Admin only).
 */
export const updateCategory = async (req, res, next) => {
  try {
    const { error, value } = updateCategorySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const existingCategory = await Category.findById(req.params.id);
    if (!existingCategory) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    const previousState = { name: existingCategory.name, description: existingCategory.description, isActive: existingCategory.isActive };

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      value,
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    await audit.log({
      req, action: 'CATEGORY_UPDATED', targetType: 'Category', targetId: category._id, targetLabel: category.name,
      previousState, newState: { name: category.name, description: category.description, isActive: category.isActive }
    });

    res.json({ success: true, message: 'Category updated', data: category });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/categories/:id
 * Soft-delete: marks category as inactive (Admin only).
 */
export const deleteCategory = async (req, res, next) => {
  try {
    const existingCategory = await Category.findById(req.params.id);
    if (!existingCategory) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    const previousState = { isActive: existingCategory.isActive, deletedAt: null };
    const deactivatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      { isActive: false, deletedAt: new Date(), deletedBy: req.user._id },
      { new: true }
    );
    if (!deactivatedCategory) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    
    await audit.log({
      req, action: 'CATEGORY_DEACTIVATED', targetType: 'Category', targetId: deactivatedCategory._id, targetLabel: deactivatedCategory.name,
      previousState, newState: { isActive: false, deletedAt: deactivatedCategory.deletedAt }
    });

    res.json({ success: true, message: 'Category soft deleted', data: deactivatedCategory });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/categories/:id/restore
 * Restore a soft-deleted category (Admin only).
 */
export const restoreCategory = async (req, res, next) => {
  try {
    const existingCategory = await Category.findOne({ _id: req.params.id }).setOptions({ includeDeleted: true });
    if (!existingCategory) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    if (!existingCategory.deletedAt) {
      return res.status(400).json({ success: false, message: 'Category is not deleted' });
    }

    const previousState = { isActive: existingCategory.isActive, deletedAt: existingCategory.deletedAt };
    
    const restoredCategory = await Category.findByIdAndUpdate(
      req.params.id,
      { isActive: true, $unset: { deletedAt: "", deletedBy: "" } },
      { new: true }
    ).setOptions({ includeDeleted: true });

    await audit.log({
      req, action: 'CATEGORY_RESTORED', targetType: 'Category', targetId: restoredCategory._id, targetLabel: restoredCategory.name,
      previousState, newState: { isActive: true, deletedAt: null }
    });

    res.json({ success: true, message: 'Category restored', data: restoredCategory });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/categories/reorder
 * Bulk update category order via drag and drop.
 */
export const reorderCategories = async (req, res, next) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ success: false, message: 'orderedIds must be an array' });
    }

    const updates = orderedIds.map((id, index) => {
      return Category.findByIdAndUpdate(id, { order: index });
    });

    await Promise.all(updates);

    await audit.log({
      req, action: 'CATEGORY_REORDERED', targetType: 'Category', targetLabel: 'Bulk Category Reorder'
    });

    res.json({ success: true, message: 'Category order updated successfully' });
  } catch (error) {
    next(error);
  }
};

import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, Tag } from 'lucide-react';
import { Category, CategoryType } from '../types/budget';
import { formatMoney, getCurrencySymbol } from '../services/currencyService';

interface CategoryManagerProps {
  categories: Category[];
  onAddCategory: (cat: Omit<Category, 'id'>) => void;
  onUpdateCategory: (id: string, cat: Partial<Category>) => void;
  onDeleteCategory: (id: string) => void;
  onClose?: () => void;
  currency?: string;
}

const COLOR_PALETTE = [
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#14B8A6', // Teal
  '#6366F1', // Indigo
  '#EF4444', // Red
];

export const CategoryManagerModal: React.FC<CategoryManagerProps> = ({
  categories,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  currency = 'INR',
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBudget, setNewBudget] = useState('300');
  const [newColor, setNewColor] = useState(COLOR_PALETTE[0]);
  const [newType, setNewType] = useState<CategoryType>('discretionary');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBudget, setEditBudget] = useState('');

  const totalBudgeted = categories.reduce((sum, c) => sum + c.budgetLimit, 0);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const limit = parseFloat(newBudget) || 0;
    onAddCategory({
      name: newName.trim(),
      budgetLimit: limit,
      color: newColor,
      icon: 'Tag',
      type: newType,
    });
    setNewName('');
    setNewBudget('300');
    setIsAdding(false);
  };

  const handleSaveEdit = (id: string) => {
    const limit = parseFloat(editBudget);
    if (!isNaN(limit)) {
      onUpdateCategory(id, { budgetLimit: limit });
    }
    setEditingId(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-950 dark:text-white">
            Custom Expense Categories & Budgets
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Define custom classifications, spending targets, and financial envelope rules
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-neutral-500 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 px-3 py-1.5 rounded-lg">
            Total Envelope Target: <strong className="font-mono text-neutral-900 dark:text-white">{formatMoney(totalBudgeted, currency)}</strong>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Category</span>
          </button>
        </div>
      </div>

      {/* Add New Category Form Drawer */}
      {isAdding && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-neutral-900 border border-emerald-500/40 rounded-xl p-5 shadow-sm space-y-4 text-xs animate-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-neutral-900 dark:text-white">Create Custom Category</h3>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-neutral-400 hover:text-neutral-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-neutral-500 font-medium mb-1">Category Name</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Pet Care, Education, Gaming..."
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-neutral-500 font-medium mb-1">
                Monthly Spending Limit ({getCurrencySymbol(currency)} {currency})
              </label>
              <input
                type="number"
                required
                value={newBudget}
                onChange={(e) => setNewBudget(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 font-mono text-neutral-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-neutral-500 font-medium mb-1">Classification Type</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as any)}
                className="w-full px-2.5 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none capitalize"
              >
                <option value="essential">Essential Needs (50% rule)</option>
                <option value="discretionary">Discretionary Wants (30% rule)</option>
                <option value="savings">Savings & Investments (20% rule)</option>
                <option value="debt">Debt Repayment</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-neutral-500 font-medium mb-1.5">Color Tag</label>
            <div className="flex items-center gap-2">
              {COLOR_PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewColor(color)}
                  className={`w-6 h-6 rounded-full cursor-pointer transition-transform ${newColor === color ? 'scale-125 ring-2 ring-neutral-400 ring-offset-2' : ''}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-neutral-500 hover:text-neutral-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg font-semibold"
            >
              Create Category
            </button>
          </div>
        </form>
      )}

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => {
          const isEditing = editingId === cat.id;

          return (
            <div
              key={cat.id}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <div>
                      <div className="font-semibold text-xs text-neutral-900 dark:text-white">
                        {cat.name}
                      </div>
                      <div className="text-[10px] text-neutral-400 capitalize">
                        {cat.type}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingId(cat.id);
                        setEditBudget(cat.budgetLimit.toString());
                      }}
                      className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-white cursor-pointer"
                      title="Edit Limit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteCategory(cat.id)}
                      className="p-1 text-neutral-400 hover:text-rose-600 cursor-pointer"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-[11px] text-neutral-500">Monthly Spending Limit</div>
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 mt-1">
                      <input
                        type="number"
                        value={editBudget}
                        onChange={(e) => setEditBudget(e.target.value)}
                        className="w-24 px-2 py-1 text-sm font-mono rounded border border-emerald-500 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white outline-none"
                      />
                      <button
                        onClick={() => handleSaveEdit(cat.id)}
                        className="p-1 bg-emerald-600 text-white rounded cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-xl font-bold font-mono text-neutral-950 dark:text-white tabular-nums mt-0.5">
                      {formatMoney(cat.budgetLimit, currency)}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 text-[11px] text-neutral-400">
                Rule: {cat.type === 'essential' ? 'Must have (50%)' : cat.type === 'discretionary' ? 'Lifestyle want (30%)' : 'Wealth accumulation (20%)'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

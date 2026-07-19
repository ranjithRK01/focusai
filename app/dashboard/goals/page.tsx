'use client';
import { useState, useEffect } from 'react';
import { requireUser } from '@/lib/server-helpers';
import type { Goal } from '@/types';

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch goals on component mount
  const fetchGoals = async () => {
    try {
      const res = await fetch('/api/goals');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setGoals(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  // Create a new goal
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });

      if (res.ok) {
        setTitle('');
        setDescription('');
        await fetchGoals();
      }
    } catch (error) {
      console.error('Error creating goal:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Your Focus Goal</h1>

      {/* Set New Goal Form */}
      <div className="bg-white border rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Set a New Goal</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Goal Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Become a React Developer"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              disabled={submitting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell us more about your goal..."
              rows={3}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              disabled={submitting}
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !title.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Setting Goal...' : 'Set as Active Goal'}
          </button>
        </form>
      </div>

      {/* Goals List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading goals...</div>
      ) : goals.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">You haven&apos;t set any goals yet!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => (
            <div
              key={goal._id}
              className={`border rounded-lg p-6 ${goal.isActive ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-semibold">{goal.title}</h3>
                    {goal.isActive && (
                      <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-medium">Active</span>
                    )}
                  </div>
                  {goal.description && (
                    <p className="text-gray-600 mt-2">{goal.description}</p>
                  )}
                  <p className="text-sm text-gray-400 mt-2">
                    Created on {new Date(goal.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

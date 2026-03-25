import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { db } from '@/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { queueAction } from '@/services/sync';
import { useAcademic } from '@/context/AcademicContext';

export const useTodos = () => {
  const { activeYear, activeTerm } = useAcademic();
  const [adding, setAdding] = useState(false);

  // Scoped Loading: Only show items for active term
  const todos = useLiveQuery(
    async () => {
        if (!activeTerm?.id) return [];
        return await db.todos.where('term_id').equals(activeTerm.id).toArray();
    },
    [activeTerm?.id]
  ) || [];

  const addTodo = async (title: string) => {
    // VALIDATION: Prevent creation without loaded scope
    if (!title.trim() || !activeYear?.id || !activeTerm?.id) {
        showError("Task creation blocked: Academic context required.");
        return;
    }
    setAdding(true);

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const newTodo = {
            id: crypto.randomUUID(),
            user_id: user.id,
            year_id: activeYear.id, // Automatic assignment
            term_id: activeTerm.id, // Automatic assignment
            title: title.trim(),
            completed: false,
            created_at: new Date().toISOString()
        };

        await db.todos.add(newTodo);
        await queueAction('todos', 'create', newTodo);
        
        showSuccess('Task added.');
    } catch (e) {
        showError('Failed to add task locally.');
    } finally {
        setAdding(false);
    }
  };

  const toggleTodo = async (id: string, currentStatus: boolean) => {
    try {
        await db.todos.update(id, { completed: !currentStatus });
        await queueAction('todos', 'update', { id, completed: !currentStatus });
    } catch (e) {
        showError('Failed to update task.');
    }
  };

  const deleteTodo = async (id: string) => {
    try {
        await db.todos.delete(id);
        await queueAction('todos', 'delete', { id });
    } catch (e) {
        showError('Failed to delete task.');
    }
  };

  return { 
      todos: todos.sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1)), 
      loading: !todos, 
      adding, 
      addTodo, 
      toggleTodo, 
      deleteTodo 
  };
};
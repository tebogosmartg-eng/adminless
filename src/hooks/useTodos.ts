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

  // Updated Scoping: Load items for active term AND legacy items without term IDs
  const todos = useLiveQuery(
    async () => {
        const allTodos = await db.todos.toArray();
        
        if (!activeTerm) return allTodos; // Show all if no term selected

        return allTodos.filter(t => t.term_id === activeTerm.id || !t.term_id);
    },
    [activeTerm?.id]
  ) || [];

  const addTodo = async (title: string) => {
    if (!title.trim() || !activeYear || !activeTerm) return;
    setAdding(true);

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const newTodo = {
            id: crypto.randomUUID(),
            user_id: user.id,
            year_id: activeYear.id,
            term_id: activeTerm.id,
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

  const handleBatchUpdate = async (ids: string[], updates: any) => {
      // Internal utility for migration if needed
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
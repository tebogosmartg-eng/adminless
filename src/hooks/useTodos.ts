import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Todo } from '@/lib/types';

export const useTodos = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setTodos(data || []);
    }
    setLoading(false);
  };

  const addTodo = async (title: string) => {
    if (!title.trim()) return;
    setAdding(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        setAdding(false);
        return;
    }

    const { data, error } = await supabase
      .from('todos')
      .insert([{ user_id: user.id, title: title.trim(), completed: false }])
      .select()
      .single();

    if (error) {
      showError('Failed to add task.');
    } else if (data) {
      setTodos([data, ...todos]);
      showSuccess('Task added.');
    }
    setAdding(false);
  };

  const toggleTodo = async (id: string, currentStatus: boolean) => {
    // Optimistic update
    setTodos(todos.map(t => t.id === id ? { ...t, completed: !currentStatus } : t));

    const { error } = await supabase
      .from('todos')
      .update({ completed: !currentStatus })
      .eq('id', id);

    if (error) {
      showError('Failed to update task.');
      fetchTodos(); // Revert
    }
  };

  const deleteTodo = async (id: string) => {
    // Optimistic update
    setTodos(todos.filter(t => t.id !== id));

    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id);

    if (error) {
      showError('Failed to delete task.');
      fetchTodos(); // Revert
    }
  };

  return { todos, loading, adding, addTodo, toggleTodo, deleteTodo };
};
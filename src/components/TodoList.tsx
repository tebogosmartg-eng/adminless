import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus, Trash2, CheckSquare } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
}

export const TodoList = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');
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

  const handleAddTodo = async () => {
    if (!newTodo.trim()) return;
    setAdding(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('todos')
      .insert([{ user_id: user.id, title: newTodo.trim(), completed: false }])
      .select()
      .single();

    if (error) {
      showError('Failed to add task.');
    } else if (data) {
      setTodos([data, ...todos]);
      setNewTodo('');
      showSuccess('Task added.');
    }
    setAdding(false);
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    // Optimistic update
    setTodos(todos.map(t => t.id === id ? { ...t, completed: !currentStatus } : t));

    const { error } = await supabase
      .from('todos')
      .update({ completed: !currentStatus })
      .eq('id', id);

    if (error) {
      showError('Failed to update task.');
      // Revert on error
      fetchTodos();
    }
  };

  const handleDelete = async (id: string) => {
    // Optimistic update
    setTodos(todos.filter(t => t.id !== id));

    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id);

    if (error) {
      showError('Failed to delete task.');
      fetchTodos();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTodo();
    }
  };

  const completedCount = todos.filter(t => t.completed).length;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckSquare className="h-5 w-5 text-primary" />
              Tasks
            </CardTitle>
            <CardDescription>
              {completedCount} of {todos.length} completed
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4 min-h-[300px]">
        <div className="flex gap-2">
          <Input 
            placeholder="Add a new task..." 
            value={newTodo} 
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button onClick={handleAddTodo} disabled={adding || !newTodo.trim()} size="icon">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>

        <ScrollArea className="flex-1 -mx-2 px-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : todos.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <p>No tasks yet. Stay organized!</p>
            </div>
          ) : (
            <ul className="space-y-2 pb-2">
              {todos.map((todo) => (
                <li key={todo.id} className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 group transition-colors">
                  <Checkbox 
                    id={`todo-${todo.id}`} 
                    checked={todo.completed}
                    onCheckedChange={() => handleToggle(todo.id, todo.completed)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <label 
                      htmlFor={`todo-${todo.id}`}
                      className={cn(
                        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 break-words cursor-pointer",
                        todo.completed && "line-through text-muted-foreground"
                      )}
                    >
                      {todo.title}
                    </label>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(todo.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
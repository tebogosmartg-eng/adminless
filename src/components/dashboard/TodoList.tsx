import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus, Trash2, CheckSquare } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useTodos } from '@/hooks/useTodos';

export const TodoList = () => {
  const { todos, loading, adding, addTodo, toggleTodo, deleteTodo } = useTodos();
  const [newTodo, setNewTodo] = useState('');

  const handleAddTodo = () => {
    addTodo(newTodo);
    setNewTodo('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTodo();
    }
  };

  const completedCount = todos.filter(t => t.completed).length;

  return (
    <Card className="border-none shadow-sm bg-white dark:bg-card">
      <CardHeader className="pb-2 pt-4">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckSquare className="h-4 w-4 text-primary" />
              Tasks
            </CardTitle>
            <CardDescription className="text-xs">
              {completedCount} of {todos.length} done
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pb-4">
        <div className="flex gap-1.5">
          <Input 
            placeholder="Add task..." 
            value={newTodo} 
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-8 text-xs"
          />
          <Button onClick={handleAddTodo} disabled={adding || !newTodo.trim()} size="icon" className="h-8 w-8">
            {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          </Button>
        </div>

        <ScrollArea className="max-h-[300px] -mx-1 px-1">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground opacity-30" />
            </div>
          ) : todos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-xs">
              <p>No tasks yet.</p>
            </div>
          ) : (
            <ul className="space-y-1 pb-1">
              {todos.map((todo) => (
                <li key={todo.id} className="flex items-start gap-2 p-1.5 rounded-md hover:bg-muted/40 group transition-colors">
                  <Checkbox 
                    id={`todo-${todo.id}`} 
                    checked={todo.completed}
                    onCheckedChange={() => toggleTodo(todo.id, todo.completed)}
                    className="mt-0.5 h-3.5 w-3.5"
                  />
                  <div className="flex-1 min-w-0">
                    <label 
                      htmlFor={`todo-${todo.id}`}
                      className={cn(
                        "text-[12px] font-medium leading-tight peer-disabled:cursor-not-allowed peer-disabled:opacity-70 break-words cursor-pointer",
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
                    onClick={() => deleteTodo(todo.id)}
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
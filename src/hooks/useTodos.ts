"use client";

import { useMemo } from "react";
import { useAcademic } from "@/context/AcademicContext";

export const useTodos = () => {
  const { activeYear, activeTerm } = useAcademic();

  const todos: any[] = [];
  const loading = false;
  const adding = false;

  // 🔥 ADD TODO (safe no-op during migration)
  const addTodo = async (title: string) => {
    void title;
    return;
  };

  // 🔥 TOGGLE (safe no-op during migration)
  const toggleTodo = async (id: string, currentStatus: boolean) => {
    void id;
    void currentStatus;
  };

  // 🔥 DELETE (safe no-op during migration)
  const deleteTodo = async (id: string) => {
    void id;
  };

  // 🔥 SORT (same behavior as before)
  const sortedTodos = useMemo(() => {
    return [...todos].sort((a, b) =>
      a.completed === b.completed ? 0 : a.completed ? 1 : -1
    );
  }, [todos]);

  void activeYear;
  void activeTerm;

  return {
    todos: sortedTodos,
    loading,
    adding,
    addTodo,
    toggleTodo,
    deleteTodo,
  };
};
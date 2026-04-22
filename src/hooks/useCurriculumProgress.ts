"use client";

export const useCurriculumProgress = (
  subject?: string,
  grade?: string,
  classId?: string
) => {
  const data = {
    topics: [],
    percent: 0,
    coveredCount: 0,
    totalCount: 0,
  };

  const loading = false;

  void subject;
  void grade;
  void classId;

  return { data, loading };
};
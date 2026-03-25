"use client";

import React from 'react';

export const DataMigrationGuard = ({ children }: { children: React.ReactNode }) => {
  // Removed diagnostic and background sync loops to improve performance
  // and prevent network storms. Data mutations are handled individually.
  return <>{children}</>;
};
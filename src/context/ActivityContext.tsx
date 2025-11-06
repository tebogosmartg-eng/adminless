import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';

export interface Activity {
  id: string;
  timestamp: string;
  message: string;
}

interface ActivityContextType {
  activities: Activity[];
  logActivity: (message: string) => void;
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

export const ActivityProvider = ({ children }: { children: ReactNode }) => {
  const [activities, setActivities] = useState<Activity[]>(() => {
    try {
      const savedActivities = localStorage.getItem('activities');
      return savedActivities ? JSON.parse(savedActivities) : [];
    } catch (error) {
      console.error("Failed to parse activities from localStorage", error);
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('activities', JSON.stringify(activities));
  }, [activities]);

  const logActivity = useCallback((message: string) => {
    const newActivity: Activity = {
      id: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      message,
    };
    setActivities((prevActivities) => [newActivity, ...prevActivities].slice(0, 20)); // Keep last 20 activities
  }, []);

  return (
    <ActivityContext.Provider value={{ activities, logActivity }}>
      {children}
    </ActivityContext.Provider>
  );
};

export const useActivity = () => {
  const context = useContext(ActivityContext);
  if (context === undefined) {
    throw new Error('useActivity must be used within an ActivityProvider');
  }
  return context;
};
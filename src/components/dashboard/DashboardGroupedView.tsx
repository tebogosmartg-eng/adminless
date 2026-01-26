import ClassSummaryCard from '@/components/ClassSummaryCard';
import AggregatedPerformanceChart from '@/components/charts/AggregatedPerformanceChart';
import { ClassInfo } from '@/types';

interface DashboardGroupedViewProps {
  activeClasses: ClassInfo[];
  groupedClasses: Record<string, ClassInfo[]>;
  groupBy: 'subject' | 'grade';
}

export const DashboardGroupedView = ({ activeClasses, groupedClasses, groupBy }: DashboardGroupedViewProps) => {
  return (
    <div className="space-y-6">
      <AggregatedPerformanceChart classes={activeClasses} groupBy={groupBy} />
      <div className="space-y-6">
         {Object.entries(groupedClasses).sort().map(([groupName, groupClasses]) => (
            <div key={groupName} className="space-y-4">
               <h3 className="text-lg font-semibold">{groupName}</h3>
               <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {groupClasses.map(c => (
                     <ClassSummaryCard key={c.id} classInfo={c} />
                  ))}
               </div>
            </div>
         ))}
      </div>
    </div>
  );
};
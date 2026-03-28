import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateClassDialog } from "@/components/CreateClassDialog";
import { EditClassDialog } from "@/components/dialogs/EditClassDialog";
import { DeleteClassDialog } from "@/components/dialogs/DeleteClassDialog";
import { Search, Filter, X, Archive, ArrowLeft, Users, Loader2 } from "lucide-react";
import { useClassesLogic } from "@/hooks/useClassesLogic";
import { ClassCard } from "@/components/ClassCard";
import { cn } from "@/lib/utils";
import { useAuthGuard } from "@/hooks/useAuthGuard";

const ClassesContent = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const highlightId = location.state?.highlightId;
  const isGuided = location.state?.fromOnboarding;

  const {
    addClass,
    isEditOpen, setIsEditOpen,
    isDeleteOpen, setIsDeleteOpen,
    selectedClass,
    searchQuery, setSearchQuery,
    selectedGrade, setSelectedGrade,
    activeTab, setActiveTab,
    uniqueGrades,
    activeClasses,
    archivedClasses,
    hasActiveFilters,
    handleEdit,
    handleDeleteClick,
    handleToggleArchive,
    handleDuplicate,
    handleView,
    clearFilters
  } = useClassesLogic();

  return (
    <div className="space-y-6 w-full">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">Classes</h1>
                {isGuided && (
                    <Button variant="outline" size="sm" onClick={() => navigate('/')} className="h-8 gap-2 border-primary text-primary hover:bg-primary/5">
                        <ArrowLeft className="h-3.5 w-3.5" /> Back to Checklist
                    </Button>
                )}
            </div>
            <p className="text-muted-foreground text-sm">Manage your class rosters and term assignments.</p>
        </div>
        
        <div className={cn(
            "flex items-center gap-2 w-full md:w-auto",
            highlightId === 'create-class-btn' ? "guide-highlight rounded-md p-0.5" : ""
        )}>
            <CreateClassDialog onClassCreate={addClass} />
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <TabsList className="bg-muted/50 border p-1 h-auto min-h-10 flex flex-wrap w-full md:w-auto">
                <TabsTrigger value="active" className="px-6 h-8 flex-1 md:flex-none">Active Classes</TabsTrigger>
                <TabsTrigger value="archived" className="px-6 h-8 flex-1 md:flex-none">Archived</TabsTrigger>
            </TabsList>

            {/* Integrated Filter Ribbon */}
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search..."
                        className="pl-9 h-10 bg-background w-full"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto">
                  <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                      <SelectTrigger className="w-full sm:w-[140px] h-10 bg-background">
                          <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                          <SelectValue placeholder="Grade" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="all">All Grades</SelectItem>
                          {uniqueGrades.map((grade) => (
                              <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>

                  {hasActiveFilters && (
                      <Button variant="ghost" size="icon" onClick={clearFilters} className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground border bg-background" title="Clear Filters">
                          <X className="h-4 w-4" />
                      </Button>
                  )}
                </div>
            </div>
        </div>

        <TabsContent value="active" className="mt-0 focus-visible:outline-none">
            {activeClasses.length === 0 ? (
                <Card className="border-dashed border-2 bg-muted/5">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <Users className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
                        <h3 className="text-lg font-semibold">No Active Classes</h3>
                        <p className="text-muted-foreground text-sm max-w-xs mt-1">
                            {searchQuery || selectedGrade !== 'all' 
                                ? "No classes match your current filters. Try adjusting your search." 
                                : "You haven't created any classes for this term yet."}
                        </p>
                        {hasActiveFilters && (
                            <Button variant="link" onClick={clearFilters} className="mt-2">Clear all filters</Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {activeClasses.map((classItem, idx) => (
                        <div key={classItem.id} className={cn(
                            "transition-all duration-300",
                            idx === 0 && highlightId === 'class-list-roster' ? "guide-highlight rounded-xl p-1" : ""
                        )}>
                            <ClassCard 
                                classItem={classItem}
                                onView={handleView}
                                onEdit={handleEdit}
                                onDelete={handleDeleteClick}
                                onDuplicate={handleDuplicate}
                                onToggleArchive={handleToggleArchive}
                            />
                        </div>
                    ))}
                </div>
            )}
        </TabsContent>

        <TabsContent value="archived" className="mt-0 focus-visible:outline-none">
            {archivedClasses.length === 0 ? (
                <Card className="border-dashed border-2 bg-muted/5">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <Archive className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
                        <h3 className="text-lg font-semibold">Empty Archive</h3>
                        <p className="text-muted-foreground text-sm max-w-xs mt-1">
                            Classes you archive to declutter your dashboard will appear here.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {archivedClasses.map((classItem) => (
                        <ClassCard 
                            key={classItem.id} 
                            classItem={classItem}
                            onView={handleView}
                            onEdit={handleEdit}
                            onDelete={handleDeleteClick}
                            onDuplicate={handleDuplicate}
                            onToggleArchive={handleToggleArchive}
                        />
                    ))}
                </div>
            )}
        </TabsContent>
      </Tabs>

      <EditClassDialog open={isEditOpen} onOpenChange={setIsEditOpen} classInfo={selectedClass} />
      <DeleteClassDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} classInfo={selectedClass} />
    </div>
  );
};

const Classes = () => {
  const { user, authReady } = useAuthGuard();

  if (!authReady || !user) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center animate-in fade-in duration-500">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Verifying Session...</p>
        </div>
      </div>
    );
  }

  return <ClassesContent />;
};

export default Classes;
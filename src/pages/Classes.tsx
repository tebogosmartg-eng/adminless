import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateClassDialog } from "@/components/CreateClassDialog";
import { EditClassDialog } from "@/components/dialogs/EditClassDialog";
import { DeleteClassDialog } from "@/components/dialogs/DeleteClassDialog";
import { Search, Filter, X, Archive, ArrowLeft } from "lucide-react";
import { useClassesLogic } from "@/hooks/useClassesLogic";
import { ClassCard } from "@/components/ClassCard";
import { cn } from "@/lib/utils";

const Classes = () => {
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
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold">Classes</h1>
            {isGuided && (
                <Button variant="outline" size="sm" onClick={() => navigate('/')} className="gap-2 border-primary text-primary">
                    <ArrowLeft className="h-4 w-4" /> Back to Checklist
                </Button>
            )}
        </div>
        <div className={cn(highlightId === 'create-class-btn' ? "guide-highlight rounded-md" : "")}>
            <CreateClassDialog onClassCreate={addClass} />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="active">Active Classes</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search classes or subjects..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-[180px]">
          <Select value={selectedGrade} onValueChange={setSelectedGrade}>
            <SelectTrigger>
              <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Filter by Grade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              {uniqueGrades.map((grade) => (
                <SelectItem key={grade} value={grade}>{grade}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" onClick={clearFilters} className="px-3">
            <X className="mr-2 h-4 w-4" /> Clear
          </Button>
        )}
      </div>

      {activeTab === 'active' ? (
         activeClasses.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <h3 className="text-lg font-semibold">No Active Classes</h3>
                  <p className="text-muted-foreground mt-2">
                    {searchQuery ? "No classes match your search." : "Create a new class or check the Archived tab."}
                  </p>
                </div>
              </CardContent>
            </Card>
         ) : (
           <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
             {activeClasses.map((classItem, idx) => (
               <div key={classItem.id} className={cn(idx === 0 && highlightId === 'class-list-roster' ? "guide-highlight rounded-xl" : "")}>
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
         )
      ) : (
        archivedClasses.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12 text-muted-foreground">
                <Archive className="h-10 w-10 mx-auto mb-2 opacity-20" />
                <h3 className="text-lg font-semibold">No Archived Classes</h3>
                <p>Classes you archive will appear here for safekeeping.</p>
              </div>
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
        )
      )}

      <EditClassDialog open={isEditOpen} onOpenChange={setIsEditOpen} classInfo={selectedClass} />
      <DeleteClassDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} classInfo={selectedClass} />
    </>
  );
};

export default Classes;
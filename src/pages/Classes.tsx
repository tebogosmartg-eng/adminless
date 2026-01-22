import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreateClassDialog, ClassInfo } from "@/components/CreateClassDialog";
import { EditClassDialog } from "@/components/EditClassDialog";
import { DeleteClassDialog } from "@/components/DeleteClassDialog";
import { Users, MoreVertical, Copy, Search, Filter, X } from "lucide-react";
import { useClasses } from "../context/ClassesContext";
import { showSuccess } from "@/utils/toast";

const Classes = () => {
  const { classes, addClass } = useClasses();
  const navigate = useNavigate();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);
  
  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");

  const handleEdit = (classItem: ClassInfo) => {
    setSelectedClass(classItem);
    setIsEditOpen(true);
  };

  const handleDelete = (classItem: ClassInfo) => {
    setSelectedClass(classItem);
    setIsDeleteOpen(true);
  };

  const handleDuplicate = (classItem: ClassInfo) => {
    const newClass: ClassInfo = {
      ...classItem,
      id: new Date().toISOString(),
      className: `${classItem.className} (Copy)`,
      // Create fresh learner objects with empty marks/comments
      learners: classItem.learners.map(l => ({
        name: l.name,
        mark: "",
        comment: ""
      }))
    };
    
    addClass(newClass);
    showSuccess(`Class duplicated as "${newClass.className}"`);
  };

  // Derive unique grades for the filter dropdown
  const uniqueGrades = useMemo(() => {
    const grades = new Set(classes.map(c => c.grade));
    return Array.from(grades).sort();
  }, [classes]);

  // Filter classes based on search and grade selection
  const filteredClasses = useMemo(() => {
    return classes.filter(c => {
      const matchesSearch = 
        c.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.subject.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesGrade = selectedGrade === "all" || c.grade === selectedGrade;
      
      return matchesSearch && matchesGrade;
    });
  }, [classes, searchQuery, selectedGrade]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedGrade("all");
  };

  const hasActiveFilters = searchQuery !== "" || selectedGrade !== "all";

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h1 className="text-3xl font-bold">Classes</h1>
        <CreateClassDialog onClassCreate={addClass} />
      </div>

      {/* Search and Filter Bar */}
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

      {classes.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Your Classes</CardTitle>
            <CardDescription>Manage your classes, subjects, and student lists here.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold">No Classes Found</h3>
              <p className="text-muted-foreground mt-2">Get started by creating your first class.</p>
            </div>
          </CardContent>
        </Card>
      ) : filteredClasses.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <h3 className="text-lg font-semibold">No matching classes</h3>
          <p className="text-muted-foreground mt-2">Try adjusting your search or filters.</p>
          <Button variant="link" onClick={clearFilters} className="mt-2">Clear all filters</Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredClasses.map((classItem) => (
            <Card key={classItem.id} className="flex flex-col hover:border-primary/50 transition-colors">
              <CardHeader className="flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle className="text-xl truncate pr-2">{classItem.subject}</CardTitle>
                  <CardDescription className="truncate">{classItem.grade} - {classItem.className}</CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/classes/${classItem.id}`)}>
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDuplicate(classItem)}>
                      <Copy className="mr-2 h-4 w-4" /> Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEdit(classItem)}>
                      Edit Info
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleDelete(classItem)} className="text-destructive">
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="flex-grow cursor-pointer pt-0" onClick={() => navigate(`/classes/${classItem.id}`)}>
                <div className="mt-4 flex items-center text-sm text-muted-foreground">
                  <Users className="mr-2 h-4 w-4" />
                  <span>{classItem.learners.length} learners</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <EditClassDialog isOpen={isEditOpen} onOpenChange={setIsEditOpen} classInfo={selectedClass} />
      <DeleteClassDialog isOpen={isDeleteOpen} onOpenChange={setIsDeleteOpen} classInfo={selectedClass} />
    </>
  );
};

export default Classes;
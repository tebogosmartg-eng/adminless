import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useClasses } from "@/context/ClassesContext";
import { ClassInfo } from "@/lib/types";
import { showSuccess } from "@/utils/toast";

export const useClassesLogic = () => {
  const { classes, addClass, toggleClassArchive, deleteClass } = useClasses();
  const navigate = useNavigate();
  
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("active");

  const handleEdit = (classItem: ClassInfo) => {
    setSelectedClass(classItem);
    setIsEditOpen(true);
  };

  const handleDeleteClick = (classItem: ClassInfo) => {
    setSelectedClass(classItem);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = (id: string) => {
     deleteClass(id);
     setIsDeleteOpen(false);
  };

  const handleToggleArchive = (classItem: ClassInfo) => {
    const newStatus = !classItem.archived;
    toggleClassArchive(classItem.id, newStatus);
    showSuccess(newStatus ? "Class archived." : "Class restored to active list.");
  };

  const handleDuplicate = (classItem: ClassInfo) => {
    const newClass: ClassInfo = {
      ...classItem,
      id: new Date().toISOString(),
      className: `${classItem.className} (Copy)`,
      archived: false,
      learners: classItem.learners.map(l => ({
        name: l.name,
        mark: "",
        comment: ""
      }))
    };
    
    addClass(newClass);
    showSuccess(`Class duplicated as "${newClass.className}"`);
  };

  const handleView = (id: string) => {
    navigate(`/classes/${id}`);
  };

  const uniqueGrades = useMemo(() => {
    const grades = new Set(classes.map(c => c.grade));
    return Array.from(grades).sort();
  }, [classes]);

  const getFilteredClasses = (isArchived: boolean) => {
    return classes.filter(c => {
      const matchesArchive = !!c.archived === isArchived;
      const matchesSearch = 
        c.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.subject.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesGrade = selectedGrade === "all" || c.grade === selectedGrade;
      
      return matchesArchive && matchesSearch && matchesGrade;
    });
  };

  const activeClasses = getFilteredClasses(false);
  const archivedClasses = getFilteredClasses(true);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedGrade("all");
  };

  const hasActiveFilters = searchQuery !== "" || selectedGrade !== "all";

  return {
    classes,
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
  };
};
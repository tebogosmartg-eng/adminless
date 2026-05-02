import { startTransition, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useClasses } from "@/context/ClassesContext";
import { useAcademic } from "@/context/AcademicContext";
import { ClassInfo } from "@/lib/types";
import { showSuccess, showError } from "@/utils/toast";
import { useDebounce } from "@/hooks/useDebounce";
import { useAsyncState } from "@/hooks/useAsyncState";

export const useClassesLogic = () => {
  const { classes, addClass, toggleClassArchive, deleteClass } = useClasses();
  const { activeTerm } = useAcademic();
  const navigate = useNavigate();
  
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("active");
  const actionState = useAsyncState();

  const handleEdit = (classItem: ClassInfo) => {
    setSelectedClass(classItem);
    setIsEditOpen(true);
  };

  const handleDeleteClick = (classItem: ClassInfo) => {
    setSelectedClass(classItem);
    setIsDeleteOpen(true);
  };

  const handleToggleArchive = async (classItem: ClassInfo) => {
    const newStatus = !classItem.archived;
    try {
      await actionState.run(
        () => toggleClassArchive(classItem.id, newStatus),
        { status: "saving" },
      );
      showSuccess(newStatus ? "Class archived." : "Class restored.");
    } catch {
      showError("Failed - Retry");
    }
  };

  const handleDuplicate = async (classItem: ClassInfo) => {
    if (activeTerm?.closed) {
        showError("Restricted: Cannot manually duplicate classes in a finalized term. Use the Roll Forward tool in Settings.");
        return;
    }

    const newClass: ClassInfo = {
      ...classItem,
      id: crypto.randomUUID(),
      className: `${classItem.className} (Copy)`,
      archived: false,
      learners: classItem.learners.map(l => ({
        ...l,
        id: crypto.randomUUID(),
        mark: "",
        comment: ""
      }))
    };
    
    try {
      await actionState.run(() => addClass(newClass), { status: "saving" });
      showSuccess(`Class duplicated as "${newClass.className}"`);
    } catch {
      showError("Failed - Retry");
    }
  };

  const handleView = (id: string) => {
    startTransition(() => {
      navigate(`/classes/${id}`);
    });
  };

  const uniqueGrades = useMemo(() => {
    const grades = new Set(classes.map(c => c.grade).filter(Boolean));
    return Array.from(grades).sort();
  }, [classes]);

  const normalizedSearchQuery = debouncedSearchQuery.toLowerCase();

  const activeClasses = useMemo(
    () =>
      classes.filter((c) => {
        const matchesArchive = !c.archived;
        const matchesSearch =
          (c.className || "").toLowerCase().includes(normalizedSearchQuery) ||
          (c.subject || "").toLowerCase().includes(normalizedSearchQuery);
        const matchesGrade = selectedGrade === "all" || c.grade === selectedGrade;
        return matchesArchive && matchesSearch && matchesGrade;
      }),
    [classes, normalizedSearchQuery, selectedGrade]
  );

  const archivedClasses = useMemo(
    () =>
      classes.filter((c) => {
        const matchesArchive = !!c.archived;
        const matchesSearch =
          (c.className || "").toLowerCase().includes(normalizedSearchQuery) ||
          (c.subject || "").toLowerCase().includes(normalizedSearchQuery);
        const matchesGrade = selectedGrade === "all" || c.grade === selectedGrade;
        return matchesArchive && matchesSearch && matchesGrade;
      }),
    [classes, normalizedSearchQuery, selectedGrade]
  );

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedGrade("all");
  };

  const hasActiveFilters = searchQuery !== "" || selectedGrade !== "all";

  return {
    classes, addClass, isEditOpen, setIsEditOpen, isDeleteOpen, setIsDeleteOpen,
    selectedClass, searchQuery, setSearchQuery, selectedGrade, setSelectedGrade,
    activeTab, setActiveTab, uniqueGrades, activeClasses, archivedClasses,
    hasActiveFilters, handleEdit, handleDeleteClick, handleToggleArchive,
    handleDuplicate, handleView, clearFilters, actionState
  };
};
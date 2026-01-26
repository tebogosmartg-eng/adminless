import { useClasses } from '@/context/ClassesContext';
import { useSettings } from '@/context/SettingsContext';
import { getGradeSymbol } from '@/utils/grading';
import autoTable from 'jspdf-autotable';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { useReportsData } from '@/hooks/useReportsData';
import { ReportsFilterCard } from '@/components/reports/ReportsFilterCard';
import { ReportsAssessmentSelector } from '@/components/reports/ReportsAssessmentSelector';
import { ReportsResults } from '@/components/reports/ReportsResults';

const Reports = () => {
  const { classes } = useClasses();
  const { gradingScheme, schoolName, teacherName } = useSettings();

  const {
    selectedGrade, setSelectedGrade,
    selectedSubject, setSelectedSubject,
    uniqueGrades, uniqueSubjects,
    filteredClasses,
    selectedClassIds,
    weights,
    handleClassToggle,
    handleWeightChange,
    calculateResults,
    aggregatedData,
    setAggregatedData,
    trendData
  } = useReportsData(classes);

  const handleExportCSV = () => {
    if (!aggregatedData) return;

    const selectedClassInfos = selectedClassIds.map(id => classes.find(c => c.id === id)!);
    
    let csvContent = "Learner Name";
    selectedClassInfos.forEach(c => {
      csvContent += `,${c.className} (${c.subject}) [${weights[c.id]}%]`;
    });
    csvContent += ",Final Mark,Symbol,Level\n";

    aggregatedData.forEach(l => {
      let row = `"${l.name}"`;
      selectedClassInfos.forEach(c => {
        const m = l.marks[c.id];
        row += `,${m !== null ? m : ''}`;
      });
      
      const symbol = getGradeSymbol(l.finalMark, gradingScheme);
      row += `,${l.finalMark},${symbol?.symbol || '-'},${symbol?.level || '-'}\n`;
      csvContent += row;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `Aggregated_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const handleExportPDF = () => {
    if (!aggregatedData) return;
    const doc = new jsPDF();
    const selectedClassInfos = selectedClassIds.map(id => classes.find(c => c.id === id)!);

    doc.setFontSize(18);
    doc.text("Aggregated Performance Report", 14, 20);
    
    doc.setFontSize(10);
    doc.text(`${schoolName}`, 14, 26);
    doc.text(`Generated: ${format(new Date(), 'dd/MM/yyyy')}`, 14, 32);
    if(teacherName) doc.text(`Teacher: ${teacherName}`, 14, 38);

    let subHeader = `Included Assessments: `;
    selectedClassInfos.forEach((c, i) => {
        if(i > 0) subHeader += ", ";
        subHeader += `${c.className} (${weights[c.id]}%)`;
    });
    const splitSub = doc.splitTextToSize(subHeader, 180);
    doc.text(splitSub, 14, 46);

    const head = [['Name', ...selectedClassInfos.map(c => c.className), 'Final %', 'Sym', 'Lvl']];
    const body = aggregatedData.map(l => {
        const marks = selectedClassInfos.map(c => l.marks[c.id] !== null ? l.marks[c.id] : '-');
        const symbol = getGradeSymbol(l.finalMark, gradingScheme);
        return [
            l.name,
            ...marks,
            l.finalMark,
            symbol?.symbol || '-',
            symbol?.level || '-'
        ];
    });

    autoTable(doc, {
        startY: 55 + (splitSub.length * 5),
        head: head,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [41, 37, 36] },
        styles: { fontSize: 8 }
    });

    doc.save(`Aggregated_Report.pdf`);
  };

  // Clear data when filters change (wrapper)
  const handleGradeChange = (v: string) => { setSelectedGrade(v); setAggregatedData(null); };
  const handleSubjectChange = (v: string) => { setSelectedSubject(v); setAggregatedData(null); };

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold">Aggregate Reports</h1>
        <p className="text-muted-foreground">Combine multiple assessments into a final term or year mark.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          <ReportsFilterCard 
            selectedGrade={selectedGrade}
            setSelectedGrade={handleGradeChange}
            uniqueGrades={uniqueGrades}
            selectedSubject={selectedSubject}
            setSelectedSubject={handleSubjectChange}
            uniqueSubjects={uniqueSubjects}
          />

          <ReportsAssessmentSelector 
            filteredClasses={filteredClasses}
            selectedClassIds={selectedClassIds}
            weights={weights}
            onToggleClass={handleClassToggle}
            onWeightChange={handleWeightChange}
            onCalculate={calculateResults}
          />
        </div>

        <div className="lg:col-span-2 space-y-6">
           <ReportsResults 
             aggregatedData={aggregatedData}
             trendData={trendData}
             selectedClassIds={selectedClassIds}
             classes={classes}
             weights={weights}
             gradingScheme={gradingScheme}
             onExportCSV={handleExportCSV}
             onExportPDF={handleExportPDF}
           />
        </div>
      </div>
    </div>
  );
};

export default Reports;
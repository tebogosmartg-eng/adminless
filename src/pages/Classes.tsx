import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PlusCircle } from "lucide-react";

const Classes = () => {
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Classes</h1>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Create Class
        </Button>
      </div>
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
    </>
  );
};

export default Classes;
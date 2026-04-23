import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageSquareQuote, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSettings } from "@/context/SettingsContext";
import { showSuccess } from "@/utils/toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const CommentBankSettings = () => {
  const { commentBank, addToCommentBank, removeFromCommentBank } = useSettings();
  const [newComment, setNewComment] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

  const handleAddComment = () => {
    setStatusMessage(null);
    setErrorMessage(null);
    if (newComment.trim()) {
      addToCommentBank(newComment.trim());
      setNewComment("");
      showSuccess("Comment added to bank.");
      setStatusMessage("Saved ✓ Comment added to bank.");
      return;
    }
    setErrorMessage("Enter a comment before adding.");
  };

  return (
    <Card className="h-full flex flex-col min-w-0">
        <CardHeader>
           <div className="flex items-center gap-2">
              <MessageSquareQuote className="h-5 w-5 text-primary" />
              <CardTitle>Comment Bank</CardTitle>
           </div>
           <CardDescription>
              Save frequently used comments for quick access.
           </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4 min-w-0">
           {statusMessage && (
            <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{statusMessage}</AlertDescription>
            </Alert>
           )}
           {errorMessage && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
           )}
           <section className="space-y-2">
            <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Add Comment</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input 
                placeholder="Type a new comment..." 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                className="w-full h-10 sm:col-span-2"
              />
              <Button onClick={handleAddComment} disabled={!newComment.trim()} className="w-full sm:w-auto h-10 sm:justify-self-end">Add</Button>
            </div>
           </section>
           
           <section className="space-y-2 min-w-0 flex-1">
            <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Saved Comments</p>
            <ScrollArea className="flex-1 h-[240px] border rounded-md p-2 min-w-0">
              {commentBank.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                   No saved comments yet.
                </div>
              ) : (
                <ul className="space-y-1">
                  {commentBank.map((comment, index) => (
                    <li key={index} className="flex items-center justify-between p-2 bg-muted/40 rounded-md hover:bg-muted group">
                       <span className="text-sm truncate mr-2">{comment}</span>
                       <Button variant="ghost" size="icon" className="h-6 w-6 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0" onClick={() => setCommentToDelete(comment)}>
                          <Trash2 className="h-3 w-3" />
                       </Button>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
           </section>
        </CardContent>
        <AlertDialog open={commentToDelete !== null} onOpenChange={(open) => !open && setCommentToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove comment?</AlertDialogTitle>
              <AlertDialogDescription>
                This comment will be removed from your reusable comment bank.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (!commentToDelete) return;
                  removeFromCommentBank(commentToDelete);
                  showSuccess("Comment removed.");
                  setStatusMessage("Saved ✓ Comment removed.");
                  setCommentToDelete(null);
                }}
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </Card>
  );
};
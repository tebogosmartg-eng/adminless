import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageSquareQuote, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSettings } from "@/context/SettingsContext";
import { showSuccess } from "@/utils/toast";

export const CommentBankSettings = () => {
  const { commentBank, addToCommentBank, removeFromCommentBank } = useSettings();
  const [newComment, setNewComment] = useState("");

  const handleAddComment = () => {
    if (newComment.trim()) {
      addToCommentBank(newComment.trim());
      setNewComment("");
      showSuccess("Comment added to bank.");
    }
  };

  return (
    <Card className="h-full flex flex-col">
        <CardHeader>
           <div className="flex items-center gap-2">
              <MessageSquareQuote className="h-5 w-5 text-primary" />
              <CardTitle>Comment Bank</CardTitle>
           </div>
           <CardDescription>
              Save frequently used comments for quick access.
           </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4">
           <div className="flex gap-2">
              <Input 
                placeholder="Type a new comment..." 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
              />
              <Button onClick={handleAddComment} disabled={!newComment.trim()}>Add</Button>
           </div>
           
           <ScrollArea className="flex-1 h-[240px] border rounded-md p-2">
              {commentBank.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                   No saved comments yet.
                </div>
              ) : (
                <ul className="space-y-1">
                  {commentBank.map((comment, index) => (
                    <li key={index} className="flex items-center justify-between p-2 bg-muted/40 rounded-md hover:bg-muted group">
                       <span className="text-sm truncate mr-2">{comment}</span>
                       <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive" onClick={() => removeFromCommentBank(comment)}>
                          <Trash2 className="h-3 w-3" />
                       </Button>
                    </li>
                  ))}
                </ul>
              )}
           </ScrollArea>
        </CardContent>
    </Card>
  );
};
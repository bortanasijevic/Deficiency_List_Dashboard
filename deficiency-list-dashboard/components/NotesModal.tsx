"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface NotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (text: string) => Promise<void>;
  initialText: string;
  itemNumber: string;
  itemSubject: string;
}

export function NotesModal({
  isOpen,
  onClose,
  onSave,
  initialText,
  itemNumber,
  itemSubject,
}: NotesModalProps) {
  const [text, setText] = useState(initialText);
  const [isSaving, setIsSaving] = useState(false);

  // Update text when initialText changes
  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(text);
      onClose();
    } catch (error) {
      console.error("Failed to save note:", error);
      alert("Failed to save note. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setText(initialText); // Reset to initial text
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            Edit Note - Item {itemNumber}
          </DialogTitle>
          <DialogDescription className="truncate">
            {itemSubject}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter notes here..."
            className="min-h-[200px] resize-none"
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


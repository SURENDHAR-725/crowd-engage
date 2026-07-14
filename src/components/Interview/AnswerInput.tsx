import { useState, KeyboardEvent, ChangeEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";

interface AnswerInputProps {
  onSubmit: (answer: string) => void;
  disabled: boolean;
  placeholder?: string;
}

export function AnswerInput({
  onSubmit,
  disabled,
  placeholder = "Type your detailed response here... Press Ctrl + Enter to submit."
}: AnswerInputProps) {
  const [value, setValue] = useState("");

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setValue("");
  };

  return (
    <div className="flex gap-2 items-end border border-border bg-background p-2 rounded-xl focus-within:ring-1 focus-within:ring-primary shadow-sm">
      <Textarea
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 min-h-[50px] max-h-[160px] border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-2 py-1.5 text-sm resize-none bg-transparent"
        rows={2}
      />
      <div className="flex flex-col items-end gap-1.5 pr-1">
        <span className="text-[10px] text-muted-foreground select-none">
          {value.length} chars
        </span>
        <Button
          size="icon"
          className="h-8 w-8 rounded-lg shrink-0"
          onClick={handleSend}
          disabled={!value.trim() || disabled}
        >
          {disabled ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

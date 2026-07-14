import { useState, useRef } from "react";
import { UploadCloud, FileText, CheckCircle2, Trash2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

interface ResumeUploaderProps {
  onUploadSuccess: (file: File) => void;
  onClear: () => void;
  isParsing: boolean;
  hasAnalysis: boolean;
}

export function ResumeUploader({
  onUploadSuccess,
  onClear,
  isParsing,
  hasAnalysis
}: ResumeUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf") {
        setFile(droppedFile);
        onUploadSuccess(droppedFile);
      } else {
        alert("Please upload a PDF file only.");
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile);
        onUploadSuccess(selectedFile);
      } else {
        alert("Please upload a PDF file only.");
      }
    }
  };

  const handleButtonClick = () => {
    inputRef.current?.click();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    onClear();
  };

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf"
        onChange={handleChange}
        disabled={isParsing}
      />

      <AnimatePresence mode="wait">
        {!file && !hasAnalysis ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={handleButtonClick}
            className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
              dragActive
                ? "border-primary bg-primary/5 scale-[0.99]"
                : "border-border hover:border-primary/50 hover:bg-muted/30"
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="font-medium text-sm text-center">
              Drag & drop your PDF resume here, or <span className="text-primary hover:underline font-semibold">browse</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">Supports PDF up to 5MB</p>
          </motion.div>
        ) : (
          <motion.div
            key="file-details"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border border-border/80 rounded-2xl p-4 sm:p-5 bg-card/50 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-spark-coral/10 flex items-center justify-center text-spark-coral shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate max-w-[200px] sm:max-w-xs md:max-w-sm">
                  {file ? file.name : "Analyzed Resume Profile"}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {isParsing ? (
                    <span className="flex items-center text-xs text-muted-foreground gap-1">
                      <Loader2 className="w-3 h-3 animate-spin text-primary" />
                      Parsing text...
                    </span>
                  ) : hasAnalysis ? (
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10 gap-1 border-emerald-500/20 text-[10px]">
                      <CheckCircle2 className="w-3 h-3" />
                      AI Profile Loaded
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Ready to start</span>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-spark-coral hover:bg-spark-coral/10 rounded-full shrink-0"
              onClick={handleClear}
              disabled={isParsing}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

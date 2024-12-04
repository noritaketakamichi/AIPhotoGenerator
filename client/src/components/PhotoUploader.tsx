import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { PhotoPreview } from "./PhotoPreview";
import { UploadStatus } from "./UploadStatus";
import { Upload } from "lucide-react";

export function PhotoUploader() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [falUrl, setFalUrl] = useState<string | null>(null);
  const [trainingResult, setTrainingResult] = useState<any>(null);
  const [prompt, setPrompt] = useState<string>("");
  const { toast } = useToast();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length + files.length > 4) {
        toast({
          title: "Too many files",
          description: "Please upload exactly 4 photos",
          variant: "destructive",
        });
        return;
      }

      const imageFiles = acceptedFiles.filter((file) =>
        file.type.startsWith("image/"),
      );

      setFiles((prev) => [...prev, ...imageFiles].slice(0, 4));
    },
    [files, toast],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    maxSize: 5242880, // 5MB
  });

  // New function to call the training endpoint
  const startTraining = async (url: string) => {
    const response = await fetch("/api/train", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ falUrl: url }),
    });

    if (!response.ok) {
      throw new Error("Training failed");
    }

    return response.json();
  };

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((file, index) => {
        formData.append(`photo${index + 1}`, file);
      });

      console.log(formData);
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const result = (await response.json()) as {
        success: boolean;
        uploadId: number;
        falUrl: string;
      };

      return result;
    },
    onSuccess: async (data) => {
      toast({
        title: "Success!",
        description: "Photos uploaded and ZIP created successfully",
      });
      setFalUrl(data.falUrl);

      try {
        console.log("Starting training process");
        const trainingData = await startTraining(data.falUrl);
        console.log(trainingData);
        setTrainingResult(trainingData);

        toast({
          title: "Training Complete",
          description: "AI model training finished successfully",
        });
      } catch (error) {
        console.error("Training error:", error);
        toast({
          title: "Training Failed",
          description: "Failed to train AI model",
          variant: "destructive",
        });
      }

      setFiles([]);
      setUploadProgress(0);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload photos",
        variant: "destructive",
      });
    },
  });

  const handleUpload = () => {
    if (files.length !== 4) {
      toast({
        title: "Invalid number of files",
        description: "Please upload exactly 4 photos",
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate(files);
  };

  return (
    <div className="space-y-6">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? "border-primary bg-primary/5" : "border-border"}`}
      >
        <input {...getInputProps()} />
        <div className="space-y-2">
          <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
          <div className="text-lg font-medium">
            Drag photos here or click to browse
          </div>
          <p className="text-sm text-muted-foreground">
            Upload exactly 4 photos (max 5MB each)
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {files.map((file, index) => (
              <PhotoPreview
                key={index}
                file={file}
                onRemove={() => {
                  setFiles((prev) => prev.filter((_, i) => i !== index));
                }}
              />
            ))}
          </div>

          <div className="space-y-2">
            {uploadMutation.isPending && (
              <Progress value={uploadProgress} className="w-full" />
            )}

            <div className="flex justify-between items-center">
              <UploadStatus
                filesCount={files.length}
                isUploading={uploadMutation.isPending}
              />

              <Button
                onClick={handleUpload}
                disabled={files.length !== 4 || uploadMutation.isPending}
              >
                {uploadMutation.isPending ? "Processing..." : "Create ZIP"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {falUrl && (
        <div className="mt-4 p-4 border rounded-lg bg-muted">
          <p className="font-medium">ZIP File URL:</p>
          <a
            href={falUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline break-all"
          >
            {falUrl}
          </a>
        </div>
      )}

      {trainingResult?.diffusers_lora_file?.url && (
        <div className="mt-4 p-4 border rounded-lg bg-muted">
          <p className="font-medium">Model File URL:</p>
          <a
            href={trainingResult.diffusers_lora_file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline break-all"
          >
            {trainingResult.diffusers_lora_file.url}
          </a>
        </div>
      )}

      {trainingResult && (
        <div className="mt-4 p-4 border rounded-lg bg-muted">
          <p className="font-medium">Training Results:</p>
          <pre className="mt-2 p-2 bg-background rounded overflow-auto">
            {JSON.stringify(trainingResult, null, 2)}
          </pre>
        </div>
      )}

      {trainingResult && (
        <div className="mt-4 space-y-4">
          <div className="p-4 border rounded-lg bg-muted">
            <p className="font-medium mb-2">Enter Prompt:</p>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full p-2 border rounded-md"
              placeholder="Enter your prompt here..."
            />
            <button
              className="mt-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
              onClick={() => {
                console.log('Prompt submitted:', prompt);
                // Future implementation will go here
              }}
            >
              Submit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

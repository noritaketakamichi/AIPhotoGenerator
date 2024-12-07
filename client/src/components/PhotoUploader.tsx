import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { PhotoPreview } from "./PhotoPreview";
import { UploadStatus } from "./UploadStatus";
import { ModelSelector } from "./ModelSelector";
import { Upload, Loader2 } from "lucide-react";

export function PhotoUploader() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [falUrl, setFalUrl] = useState<string | null>(null);
  const [trainingResult, setTrainingResult] = useState<any>(null);
  const [prompt, setPrompt] = useState<string>("");
  const [generatedImages, setGeneratedImages] = useState<Array<{ url: string; file_name: string }>>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreateModelOpen, setIsCreateModelOpen] = useState(true);
  const { toast } = useToast();
  const { user, refreshUserData } = useAuth();

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
        await refreshUserData(); // Refresh credits after successful training
      } catch (error: any) {
        console.error("Training error:", error);
        if (error.message?.includes("Insufficient credits")) {
          toast({
            title: "Not Enough Credits",
            description: "Please charge your credits & enjoy generating photos! 🎨",
            variant: "default",
          });
        } else {
          toast({
            title: "Training Failed",
            description: "Failed to train AI model",
            variant: "destructive",
          });
        }
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

    // Check if user has enough credits (20 for training)
    if (!user?.credit || user.credit < 20) {
      toast({
        title: "Not Enough Credits",
        description: "Please charge your credits & enjoy generating photos! 🎨",
        variant: "default",
      });
      return;
    }

    uploadMutation.mutate(files);
  };

  return (
    <div className="space-y-6">
      <div className="mt-8 space-y-8">
        {/* Create Model Section */}
        <div className="space-y-4 border rounded-lg p-4">
          <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsCreateModelOpen(!isCreateModelOpen)}>
            <h2 className="text-lg font-semibold">Create model</h2>
            <Button variant="ghost" size="sm">
              {isCreateModelOpen ? "−" : "+"} 
            </Button>
          </div>
          {isCreateModelOpen && (
            <div>
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
                        {uploadMutation.isPending ? "Processing..." : "Upload photos"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Model Selection and Generation Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Generate Images</h2>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Training Cost: 20 credits</div>
            <div className="text-sm text-muted-foreground">Generation Cost: 1 credit per image</div>
          </div>
          <div className="p-4 border rounded-lg bg-muted">
            <ModelSelector 
              onModelSelect={(model) => {
                if (model) {
                  console.log("Selected model:", model);
                  setTrainingResult({
                    modelId: model.id,
                    diffusers_lora_file: { url: model.trainingDataUrl },
                    config_file: { url: model.configUrl }
                  });
                }
              }} 
            />
            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium">Enter Prompt:</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full p-4 border rounded-md min-h-[120px] resize-y"
                placeholder="Enter your prompt here..."
              />
              <Button
                className="w-full"
                disabled={isGenerating}
                onClick={async () => {
                  try {
                    console.log("Current trainingResult:", trainingResult);
                    if (!trainingResult?.modelId || !trainingResult?.diffusers_lora_file?.url) {
                      console.log("Model validation failed:", {
                        modelId: trainingResult?.modelId,
                        loraUrl: trainingResult?.diffusers_lora_file?.url
                      });
                      toast({
                        title: "Error",
                        description: "Please select a model first",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    setIsGenerating(true);
                    const response = await fetch("/api/generate", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        modelId: trainingResult.modelId,
                        loraUrl: trainingResult.diffusers_lora_file.url,
                        prompt: prompt,
                      }),
                    });

                    if (!response.ok) {
                      const errorData = await response.json();
                      if (response.status === 403 && errorData.error === "Insufficient credits") {
                        toast({
                          title: "Not Enough Credits",
                          description: "Please charge your credits & enjoy generating photos! 🎨",
                          variant: "default",
                        });
                        return;
                      }
                      throw new Error(errorData.error || "Generation failed");
                    }

                    const result = await response.json();
                    if (result.images && result.images.length > 0) {
                      setGeneratedImages(result.images);
                    }

                    toast({
                      title: "Success",
                      description: "Image generated successfully",
                    });
                    await refreshUserData(); // Refresh credits after successful generation
                  } catch (error) {
                    console.error("Generation error:", error);
                    toast({
                      title: "Error",
                      description: "Failed to generate image",
                      variant: "destructive",
                    });
                  } finally {
                    setIsGenerating(false);
                  }
                }}
              >
                {isGenerating ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Generating...</span>
                  </div>
                ) : (
                  "Generate Image"
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Generated Images Section */}
        {generatedImages.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Generated Images</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {generatedImages.map((image, index) => (
                <div key={index} className="border rounded-lg p-2">
                  <img
                    src={image.url}
                    alt={`Generated ${index + 1}`}
                    className="w-full h-auto rounded-lg"
                  />
                  <div className="flex justify-between mt-2 px-2">
                    <a
                      href={image.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Open Image
                    </a>
                    <a
                      href={image.url}
                      download={`generated-${index + 1}.png`}
                      className="text-primary hover:underline"
                      onClick={(e) => {
                        e.preventDefault();
                        fetch(image.url)
                          .then(response => response.blob())
                          .then(blob => {
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `generated-${index + 1}.png`;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                          });
                      }}
                    >
                      Download
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

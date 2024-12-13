import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { PhotoPreview } from "./PhotoPreview";
import { UploadStatus } from "./UploadStatus";
import { ModelSelector } from "./ModelSelector";
import { Upload, Loader2 } from "lucide-react";

interface Model {
  id: number;
  name: string;
  trainingDataUrl: string;
  configUrl: string;
  createdAt: string;
}

interface TrainingResult {
  modelId?: number;
  diffusers_lora_file?: { url: string };
  config_file?: { url: string };
}

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

if (!apiUrl) {
  throw new Error("VITE_API_URL is not defined. Please set it in your environment variables.");
}

export function PhotoUploader() {
  const { data: models = [], isLoading, refetch: refetchModels } = useQuery<Model[]>({
    queryKey: ["/api/models"],
    queryFn: async () => {
      const res = await fetch(`${apiUrl}/api/models`, { credentials: "include" });
      if (!res.ok) {
        throw new Error("Failed to fetch models");
      }
      return res.json();
    },
    refetchOnMount: true,
  });
  const [files, setFiles] = useState<File[]>([]);
  const [falUrl, setFalUrl] = useState<string | null>(null);
  const [trainingResult, setTrainingResult] = useState<TrainingResult | null>(null);
  const [prompt, setPrompt] = useState<string>("");
  const [generatedImages, setGeneratedImages] = useState<Array<{ url: string; file_name: string }>>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { user, refreshUserData } = useAuth();
  
  // トレーニング中フラグ
  const [isTraining, setIsTraining] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setIsCreateModelOpen(models.length === 0);
    }
  }, [models, isLoading]);

  const [isCreateModelOpen, setIsCreateModelOpen] = useState<boolean>(true);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length + files.length > 4) {
      toast({
        title: "Too many files",
        description: "Please upload exactly 4 photos",
        variant: "destructive",
      });
      return;
    }

    const imageFiles = acceptedFiles.filter((file) => file.type.startsWith("image/"));
    setFiles((prev) => [...prev, ...imageFiles].slice(0, 4));
  }, [files, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpeg", ".jpg", ".png", ".webp"] },
    maxSize: 5242880,
  });

  const startTraining = async (url: string) => {
    const response = await fetch(`${apiUrl}/api/train`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
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

      const response = await fetch(`${apiUrl}/api/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }
      const result = await response.json() as {
        success: boolean;
        uploadId: number;
        falUrl: string;
      };
      return result;
    },
    onSuccess: async (data) => {
      toast({
        title: "Success!",
        description: "Photos successfully uploaded. Starting training...",
      });
      setFalUrl(data.falUrl);
    
      try {
        const response = await fetch(`${apiUrl}/api/train`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ falUrl: data.falUrl }),
        });
      
        if (!response.ok) {
          throw new Error("Failed to start training");
        }
      
        toast({
          title: "Training Started",
          description: "Your model is being trained. We will notify you by email once it's finished.",
        });
        setIsTraining(true);
      } catch (err: any) {
        console.error("Error starting training:", err);
        toast({
          title: "Training Start Error",
          description: "Could not initiate training. Please try again.",
          variant: "destructive",
        });
        setIsTraining(false);
      }
    
      setFiles([]);
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
          <div>
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsCreateModelOpen(!isCreateModelOpen)}>
              <div>
                <h2 className="text-lg font-semibold">Create model</h2>
                <p className="text-sm text-muted-foreground">Cost: 20 credits</p>
                <a 
                  href="https://medium.com/@noritaket28/tips-for-uploading-photos-e16d6c3b8f3e" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-sm text-primary hover:underline"
                >
                  Tips for uploading photos
                </a>
              </div>
              <Button variant="ghost" size="sm">
                {isCreateModelOpen ? "−" : "+"}
              </Button>
            </div>
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
                          setFiles((prev) =>
                            prev.filter((_, i) => i !== index),
                          );
                        }}
                      />
                    ))}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <UploadStatus filesCount={files.length} isUploading={uploadMutation.isPending} />

                      <Button
                        onClick={handleUpload}
                        disabled={files.length !== 4 || uploadMutation.isPending}
                      >
                        {uploadMutation.isPending
                          ? "Processing..."
                          : "Create Model"}
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
          <p className="text-sm text-muted-foreground">1 credit per image</p>
          <div className="p-4 border rounded-lg bg-muted">
            <ModelSelector
              onModelSelect={(model) => {
                if (model) {
                  setTrainingResult({
                    modelId: model.id,
                    diffusers_lora_file: { url: model.trainingDataUrl },
                    config_file: { url: model.configUrl },
                  });
                } else {
                  setTrainingResult(null);
                }
              }}
            />
            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium">Enter Prompt:</label>
              <div className="text-sm text-muted-foreground mb-2">
                Example: "a person as Santa Claus"
              </div>
              <div className="text-sm mb-2">
                <a 
                  href="https://medium.com/@noritaket28/prompt-samples-90e47d8a18c5" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-primary hover:underline"
                >
                  Prompt samples
                </a>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full p-4 border rounded-md min-h-[120px] resize-y"
                placeholder="Enter your prompt here... (Sorry, only English is supported now, Japanese will be supported soon)"
              />
              <Button
                className="w-full"
                disabled={isGenerating}
                onClick={async () => {
                  if (!trainingResult?.modelId || !trainingResult?.diffusers_lora_file?.url) {
                    toast({
                      title: "Error",
                      description: "Please select a model first",
                      variant: "destructive",
                    });
                    return;
                  }

                  try {
                    setIsGenerating(true);
                    const response = await fetch(`${apiUrl}/api/generate`, {
                      method: "POST",
                      credentials: "include",
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
                          description:
                            "Please charge your credits & enjoy generating photos! 🎨",
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
                    await refreshUserData(); 
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

        <div className="mt-4">
          {isTraining && (
            <div className="text-blue-600 font-semibold space-y-2">
              <div>
                モデルのトレーニングが開始されました。<br />
                完了次第メールでお知らせしますので、しばらくお待ちください。
              </div>
              <div>
                Model training has started.<br />
                We'll notify you by email when it's complete. Please wait a moment.
              </div>
            </div>
          )}
        </div>

        {/* Generated Images Section */}
        {generatedImages.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Generated Images</h2>
            <p className="text-sm text-muted-foreground">1 credit per image</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {generatedImages.map((image, index) => (
                <div key={index} className="border rounded-lg p-2">
                  <img
                    src={image.url}
                    alt={`Generated ${index + 1}`}
                    className="w-full h-auto rounded-lg"
                  />
                  <div className="mt-2 px-2 flex justify-end">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        fetch(image.url)
                          .then((response) => response.blob())
                          .then((blob) => {
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `generated-${index + 1}.png`;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                          });
                      }}
                    >
                      Download Image
                    </Button>
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
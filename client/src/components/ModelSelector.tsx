import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";

interface Model {
  id: number;
  name: string;
  trainingDataUrl: string;
  configUrl: string;
  createdAt: string;
}

interface ModelSelectorProps {
  onModelSelect: (model: Model | null) => void;
}

export function ModelSelector({ onModelSelect }: ModelSelectorProps) {
  const { data: models, isLoading } = useQuery<Model[]>({
    queryKey: ["/api/models"],
  });

  if (isLoading) {
    return <div>Loading models...</div>;
  }

  if (!models?.length) {
    return <div>No models available. Train a model first.</div>;
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Select Model</label>
      <Select
        onValueChange={(value) => {
          const selectedModel = models.find((m) => m.id.toString() === value);
          onModelSelect(selectedModel || null);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a model" />
        </SelectTrigger>
        <SelectContent>
          {models.map((model) => (
            <SelectItem key={model.id} value={model.id.toString()}>
              {model.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

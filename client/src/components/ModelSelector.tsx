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
  const { data: models = [], isLoading, isError, refetch } = useQuery<Model[]>({
    queryKey: ["/api/models"],
    refetchOnMount: true,
  });

  const content = () => {
    if (isLoading) {
      return <div className="text-sm text-muted-foreground">Loading models...</div>;
    }

    if (isError) {
      return <div className="text-sm text-destructive">Error loading models</div>;
    }

    if (!models.length) {
      return <div className="text-sm text-muted-foreground">No models available. Train a model first.</div>;
    }

    return (
      <Select
        onOpenChange={(open) => {
          if (open) {
            refetch();
          }
        }}
        onValueChange={(value) => {
          const selectedModel = models.find((m) => m.id.toString() === value);
          if (selectedModel) {
            onModelSelect({
              ...selectedModel,
              modelId: selectedModel.id
            });
          } else {
            onModelSelect(null);
          }
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
    );
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Select Model</label>
      {content()}
    </div>
  );
}

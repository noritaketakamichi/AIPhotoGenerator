import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface PhotoPreviewProps {
  file: File;
  onRemove: () => void;
}

export function PhotoPreview({ file, onRemove }: PhotoPreviewProps) {
  return (
    <div className="relative group">
      <AspectRatio ratio={1}>
        <img
          src={URL.createObjectURL(file)}
          alt="Preview"
          className="rounded-lg object-cover w-full h-full"
        />
      </AspectRatio>
      
      <Button
        variant="destructive"
        size="icon"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

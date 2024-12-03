import { Badge } from "@/components/ui/badge";
import { Check, Loader2 } from "lucide-react";

interface UploadStatusProps {
  filesCount: number;
  isUploading: boolean;
}

export function UploadStatus({ filesCount, isUploading }: UploadStatusProps) {
  const remaining = 4 - filesCount;
  
  if (isUploading) {
    return (
      <Badge variant="secondary" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Processing files...
      </Badge>
    );
  }

  if (filesCount === 4) {
    return (
      <Badge variant="success" className="gap-1">
        <Check className="h-3 w-3" />
        Ready to upload
      </Badge>
    );
  }

  return (
    <Badge variant="secondary">
      {remaining} more {remaining === 1 ? 'photo' : 'photos'} needed
    </Badge>
  );
}

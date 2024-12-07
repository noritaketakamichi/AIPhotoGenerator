import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useCallback } from "react";

interface GeneratedPhoto {
  id: number;
  prompt: string;
  image_url: string;
  created_at: string;
  model_name: string;
}

export default function GalleryPage() {
  const { user } = useAuth();
  const { data: photos = [], isLoading } = useQuery<GeneratedPhoto[]>({
    queryKey: ["/api/photos"],
    enabled: !!user,
  });

  const handleDownload = useCallback(async (photo: GeneratedPhoto) => {
    try {
      const response = await fetch(photo.image_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${photo.model_name}-${photo.id}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  }, []);

  if (!user) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">
          <p className="mb-4">Please sign in to view your gallery</p>
          <Link href="/auth">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Your Gallery</h1>
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="text-center">Loading your photos...</div>
        ) : photos.length === 0 ? (
          <div className="text-center">
            <p className="text-muted-foreground">No generated photos yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {photos.map((photo) => (
              <div key={photo.id} className="space-y-2">
                <div className="relative group">
                  <img
                    src={photo.image_url}
                    alt={photo.prompt}
                    className="w-full rounded-lg shadow-md"
                  />
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDownload(photo)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{photo.prompt}</p>
                  <p className="text-xs font-medium">Model: {photo.model_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(photo.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

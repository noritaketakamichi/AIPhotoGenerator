import { PhotoUploader } from "../components/PhotoUploader";
import { Card } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="container mx-auto p-4 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Photo Upload</h1>
          <p className="text-muted-foreground">
            Upload exactly 4 photos to create a ZIP archive
          </p>
          <a href="/auth" className="text-primary hover:underline mt-2 inline-block">
            Go to Auth
          </a>
        </div>
        
        <Card className="p-6">
          <PhotoUploader />
        </Card>
      </div>
    </div>
  );
}

import { PhotoUploader } from "../components/PhotoUploader";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { user, logout } = useAuth();

  return (
    <div className="container mx-auto p-4 min-h-screen">
      <div className="flex justify-end mb-4">
        {user ? (
          <div className="flex items-center gap-4">
            <span>Welcome, {user.name}!</span>
            <Button variant="outline" onClick={logout}>Logout</Button>
          </div>
        ) : (
          <Link to="/login">
            <Button variant="outline">Login</Button>
          </Link>
        )}
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Photo Upload</h1>
          <p className="text-muted-foreground">
            Upload exactly 4 photos to create a ZIP archive
          </p>
        </div>
        
        <Card className="p-6">
          <PhotoUploader />
        </Card>
      </div>
    </div>
  );
}

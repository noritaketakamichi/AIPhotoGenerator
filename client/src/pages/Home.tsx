import { PhotoUploader } from "../components/PhotoUploader";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "../contexts/AuthContext";

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="container mx-auto p-4 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Photo Upload</h1>
          {!user ? (
            <Link to="/login">
              <Button variant="secondary">Login</Button>
            </Link>
          ) : (
            <span className="text-muted-foreground">Welcome, {user.email}</span>
          )}
        </div>

        <div className="text-center space-y-2">
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

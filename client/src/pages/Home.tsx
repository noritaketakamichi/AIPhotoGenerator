import { PhotoUploader } from "../components/PhotoUploader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const { user, logout } = useAuth();
  return (
    <div className="container mx-auto p-4 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Photo Upload</h1>
          <p className="text-muted-foreground">
            Upload exactly 4 photos to create a ZIP archive
          </p>
          {user ? (
            <div className="space-y-2">
              <p>Welcome, {user.email}</p>
              <Button onClick={logout} variant="outline">Sign Out</Button>
            </div>
          ) : (
            <Link href="/auth">
              <Button className="mt-2">Sign In</Button>
            </Link>
          )}
        </div>
        
        <Card className="p-6">
          {user ? (
            <PhotoUploader />
          ) : (
            <div className="text-center p-4">
              <p className="text-muted-foreground">Please sign in to upload photos</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

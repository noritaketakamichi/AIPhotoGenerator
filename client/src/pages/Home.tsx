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
          <h1 className="text-3xl font-bold tracking-tight">AI Sokkuri photo generator</h1>
          <p className="text-muted-foreground">
            Upload your photos & Create Sokkuri images in any situation as you want
          </p>
          {user ? (
            <div className="space-y-2">
              <div className="space-y-2">
                <p>Welcome, {user.email}</p>
                <p className="text-sm text-muted-foreground">Credits Available: {user.credit}</p>
                <div className="flex justify-between items-center">
                  <Link href="/gallery">
                    <Button variant="outline">Go to Gallery</Button>
                  </Link>
                  <Button onClick={logout} variant="ghost" size="sm" className="text-muted-foreground">
                    Sign Out
                  </Button>
                </div>
              </div>
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

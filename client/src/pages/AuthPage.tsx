import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthPage() {
  const { login, user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (user) {
    return (
      <div className="container mx-auto p-4">
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Welcome, {user.email}</h1>
          <p>You are already logged in.</p>
          <Link href="/">
            <Button>Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Sign In</h1>
          <p className="text-muted-foreground">
            Sign in with your Google account to continue
          </p>
        </div>

        <Button
          onClick={login}
          className="w-full"
          variant="outline"
        >
          Sign in with Google
        </Button>

        <div className="text-center">
          <Link href="/">
            <Button variant="link">Back to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

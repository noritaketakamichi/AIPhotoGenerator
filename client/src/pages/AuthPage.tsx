import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { LoginForm } from "@/components/LoginForm";

export default function AuthPage() {
  return (
    <div className="container mx-auto p-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Login</h1>
          <p className="text-muted-foreground">
            Enter your credentials to access your account
          </p>
        </div>
        
        <LoginForm />
        
        <div className="text-center">
          <Link href="/">
            <Button variant="ghost">Back to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-4 min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Welcome Back</h1>
          <p className="text-muted-foreground">
            Sign in to continue to Photo ZIP Manager
          </p>
        </div>

        <Button
          className="w-full"
          onClick={() => {
            // Will implement Google OAuth login later
            console.log("Google login clicked");
          }}
        >
          <img
            src="https://www.google.com/favicon.ico"
            alt=""
            className="w-4 h-4 mr-2"
          />
          Continue with Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <button
              onClick={() => navigate("/signup")}
              className="underline underline-offset-4 hover:text-primary"
            >
              Sign up
            </button>
          </p>
        </div>
      </Card>
    </div>
  );
}

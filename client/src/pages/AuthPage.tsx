import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function AuthPage() {
  return (
    <div className="container mx-auto p-4">
      <div className="space-y-4">
        <h1>auth</h1>
        <Link href="/">
          <Button>Back to Home</Button>
        </Link>
      </div>
    </div>
  );
}

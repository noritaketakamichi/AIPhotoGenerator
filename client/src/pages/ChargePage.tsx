import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function ChargePage() {
  return (
    <div className="container mx-auto p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Charge Credits</h1>
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>
        <div className="text-center">
          <p className="text-muted-foreground">
            Charge page content will be added here
          </p>
        </div>
      </div>
    </div>
  );
}

import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function ChargeSuccessPage() {
  const [, setLocation] = useLocation();
  const { refreshUserData } = useAuth();
  
  // Get credits from URL parameters
  const params = new URLSearchParams(window.location.search);
  const credits = params.get("credits");

  useEffect(() => {
    refreshUserData();
  }, [refreshUserData]);

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="p-6">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-green-600">Payment Successful!</h1>
            <p>You have successfully purchased {credits} credits.</p>
            <Button onClick={() => setLocation("/")}>
              Return to Home
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

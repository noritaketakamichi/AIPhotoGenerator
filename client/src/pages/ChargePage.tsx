import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

// Verify Stripe initialization
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  console.error('Stripe public key is not set in environment variables');
}
import { Link } from "wouter";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

interface CreditOption {
  credits: number;
  price: number;
}

const creditOptions: CreditOption[] = [
  { credits: 10, price: 1 },
  { credits: 20, price: 2 },
  { credits: 50, price: 5 },
];

export default function ChargePage() {
  const [selectedOption, setSelectedOption] = useState<CreditOption>(creditOptions[0]);
  const { toast } = useToast();

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Charge Credits</h1>
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>

        <Card className="p-6">
          <div className="space-y-6">
            <RadioGroup
              defaultValue={selectedOption.credits.toString()}
              onValueChange={(value) => {
                const option = creditOptions.find(
                  (opt) => opt.credits.toString() === value,
                );
                if (option) setSelectedOption(option);
              }}
            >
              {creditOptions.map((option) => (
                <div
                  key={option.credits}
                  className="flex items-center space-x-2"
                >
                  <RadioGroupItem
                    value={option.credits.toString()}
                    id={`option-${option.credits}`}
                  />
                  <Label
                    htmlFor={`option-${option.credits}`}
                    className="text-base"
                  >
                    {option.credits} credits (${option.price})
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <Button 
              className="w-full" 
              size="lg"
              onClick={async () => {
                try {
                  const response = await fetch('/api/create-checkout-session', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      credits: selectedOption.credits,
                      amount: selectedOption.price,
                    }),
                  });

                  const { id: sessionId } = await response.json();
                  
                  // Load Stripe.js
                  const stripe = await stripePromise;
                  
                  // Redirect to Stripe Checkout
                  await stripe?.redirectToCheckout({
                    sessionId,
                  });
                } catch (error) {
                  console.error('Payment error:', error);
                  toast({
                    title: "Payment Error",
                    description: "Failed to initiate payment. Please try again.",
                    variant: "destructive",
                  });
                }
              }}
            >
              Buy {selectedOption.credits} credits
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

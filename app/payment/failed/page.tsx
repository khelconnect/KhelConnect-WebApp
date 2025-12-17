"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PaymentFailed() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("booking_id");

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md text-center pt-6 border-red-200 bg-red-50/50">
        <CardContent className="space-y-4">
          <XCircle className="h-16 w-16 text-red-500 mx-auto" />
          <h2 className="text-2xl font-bold text-red-600">Payment Failed</h2>
          <p className="text-muted-foreground">
            We couldn't process your payment. Your slot has not been confirmed.
          </p>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => router.push("/")}>
              Home
            </Button>
            {/* Retry Logic: Go back to booking page for this turf? */}
            <Button className="flex-1" onClick={() => router.back()}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
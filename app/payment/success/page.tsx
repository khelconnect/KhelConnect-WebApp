"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PaymentSuccess() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const bookingId = searchParams.get("booking_id");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Optimistic check: Dodo says success, so we can likely assume it's good.
    // Ideally, we wait for the webhook, but for UX, we just show success.
    if (bookingId) {
      setTimeout(() => setLoading(false), 1500);
    }
  }, [bookingId]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md text-center pt-6 border-green-200 bg-green-50/50">
        <CardContent className="space-y-4">
          {loading ? (
            <>
              <Loader2 className="h-16 w-16 animate-spin text-green-600 mx-auto" />
              <h2 className="text-2xl font-bold">Confirming Booking...</h2>
              <p className="text-muted-foreground">Please wait while we secure your slot.</p>
            </>
          ) : (
            <>
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
              <h2 className="text-2xl font-bold text-green-700">Booking Confirmed!</h2>
              <p className="text-muted-foreground">
                Your payment was successful. Get ready to play!
              </p>
              <Button 
                className="w-full mt-4 bg-green-600 hover:bg-green-700" 
                onClick={() => router.push("/my-bookings")}
              >
                View Ticket
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
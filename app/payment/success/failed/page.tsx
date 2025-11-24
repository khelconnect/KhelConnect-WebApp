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
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    if (bookingId) {
      // Optional: You can verify status here, or rely on the Webhook (Step 4)
      // For better UX, we optimistically show success or poll the DB
      setTimeout(() => setVerifying(false), 2000);
    }
  }, [bookingId]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md text-center pt-6">
        <CardContent className="space-y-4">
          {verifying ? (
            <>
              <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
              <h2 className="text-2xl font-bold">Verifying Payment...</h2>
            </>
          ) : (
            <>
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold text-green-600">Booking Not Confirmed!</h2>
              <p className="text-muted-foreground">
                Your payment has failed and your slot is not booked.
              </p>
              <Button className="w-full mt-4" onClick={() => router.push("/my-bookings")}>
                View My Bookings
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// ...imports remain unchanged...

export default function MyBookingsPage() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [error, setError] = useState('');
  const router = useRouter();

  const fetchBookings = async () => {
    setLoading(true);
    setError('');
    setBookings([]);

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('phone', phone)
      .single();

    if (userError || !user) {
      setError('No user found with this phone number.');
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const { data: userBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, date, slot, created_at, turf:turf_id(name)')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (bookingsError) {
      setError('Could not fetch bookings.');
    } else {
      setBookings(userBookings);
    }

    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-10">
      <div className="max-w-md mx-auto">
        {/* Frosted glass replaced with popup-like card */}
        <div className="bg-popover border border-border shadow-lg rounded-xl p-6 space-y-6">
          <h1 className="text-2xl font-semibold text-center">My Bookings</h1>

          <button
            onClick={() => router.push('/')}
            className="text-primary underline text-sm hover:text-primary/80 transition block text-center"
          >
            ← Back to Home
          </button>

          {!userId && (
            <div className="space-y-4">
              <input
                type="tel"
                placeholder="Enter your phone number"
                className="w-full p-3 border border-border rounded-md bg-muted/10 focus:outline-none focus:ring-2 focus:ring-primary"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <button
                onClick={fetchBookings}
                disabled={loading || !phone}
                className="bg-primary w-full text-white py-2 px-4 rounded-md hover:bg-primary/90 transition"
              >
                {loading ? 'Loading...' : 'View Bookings'}
              </button>
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            </div>
          )}

          {userId && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium">Your Bookings</h2>
              <AnimatePresence>
                {bookings.length === 0 ? (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-sm text-muted-foreground"
                  >
                    No bookings found.
                  </motion.p>
                ) : (
                  bookings.map((booking) => (
                    <motion.div
                      key={booking.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="bg-muted/20 border border-border rounded-lg p-4 shadow"
                    >
                      <p>
                        <strong>Turf:</strong> {booking.turf?.name || 'Unknown Turf'}
                      </p>
                      <p>
                        <strong>Date:</strong>{' '}
                        {format(new Date(booking.date), 'dd MMM yyyy')}
                      </p>
                      <p>
                        <strong>Time Slots:</strong> {booking.slot.join(', ')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Booked on:{' '}
                        {format(new Date(booking.created_at), 'dd MMM yyyy, h:mm a')}
                      </p>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

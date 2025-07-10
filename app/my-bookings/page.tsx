'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export default function MyBookingsPage() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [cancelId, setCancelId] = useState<string | null>(null);
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
      .select('id, date, slot, created_at, amount, status, payment_status, turf:turf_id(name)')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (bookingsError) {
      setError('Could not fetch bookings.');
    } else {
      setBookings(userBookings);
    }

    setLoading(false);
  };

  const handleCancel = async (id: string) => {
    await supabase
      .from('bookings')
      .update({ status: 'cancelled', payment_status: 'refund initiated' })
      .eq('id', id);
    setCancelId(null);
    fetchBookings();
  };

  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-10">
      <div className="max-w-md mx-auto">
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
            <div className="space-y-6">
              {bookings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center">No bookings found.</p>
              ) : (
                <>
                  {/* Highlight latest booking */}
                  <div className="bg-primary/10 border border-primary rounded-xl p-5 shadow">
                    <h2 className="text-lg font-semibold mb-2 text-primary">Latest Booking</h2>
                    <p><strong>Turf:</strong> {bookings[0]?.turf?.name}</p>
                    <p><strong>Date:</strong> {format(new Date(bookings[0].date), 'dd MMM yyyy')}</p>
                    <p><strong>Time Slots:</strong> {bookings[0].slot.join(', ')}</p>
                    <p><strong>Amount:</strong> ₹{bookings[0].amount}</p>
                    <p><strong>Payment Status:</strong> {bookings[0].payment_status}</p>
                    <p><strong>Status:</strong> {bookings[0].status}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Booked on: {format(new Date(bookings[0].created_at), 'dd MMM yyyy, h:mm a')}
                    </p>
                    {bookings[0].status !== 'cancelled' && (
                      <button
                        onClick={() => setCancelId(bookings[0].id)}
                        className="mt-3 text-red-600 text-sm hover:underline"
                      >
                        Cancel Booking
                      </button>
                    )}
                  </div>

                  {/* Booking history */}
                  <div className="space-y-4">
                    <h2 className="text-lg font-medium mt-6">Previous Bookings</h2>
                    <AnimatePresence>
                      {bookings.slice(1).map((booking) => (
                        <motion.div
                          key={booking.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="bg-muted/20 border border-border rounded-lg p-4 shadow"
                        >
                          <p><strong>Turf:</strong> {booking.turf?.name}</p>
                          <p><strong>Date:</strong> {format(new Date(booking.date), 'dd MMM yyyy')}</p>
                          <p><strong>Time Slots:</strong> {booking.slot.join(', ')}</p>
                          <p><strong>Amount:</strong> ₹{booking.amount}</p>
                          <p><strong>Payment Status:</strong> {booking.payment_status}</p>
                          <p><strong>Status:</strong> {booking.status}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Booked on: {format(new Date(booking.created_at), 'dd MMM yyyy, h:mm a')}
                          </p>
                          {booking.status !== 'cancelled' && (
                            <button
                              onClick={() => setCancelId(booking.id)}
                              className="mt-2 text-red-600 text-sm hover:underline"
                            >
                              Cancel Booking
                            </button>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Cancel Confirmation Popup */}
          {cancelId && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-popover p-6 rounded-xl border border-border shadow-lg space-y-4 max-w-sm w-full">
                <p className="text-sm text-center">Are you sure you want to cancel this booking?</p>
                <div className="flex justify-between mt-4">
                  <button
                    onClick={() => setCancelId(null)}
                    className="px-4 py-2 text-sm rounded-md bg-muted hover:bg-muted/70 transition"
                  >
                    No, go back
                  </button>
                  <button
                    onClick={() => handleCancel(cancelId)}
                    className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 transition"
                  >
                    Yes, Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

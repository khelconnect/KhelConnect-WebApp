export default function QRCodePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-white dark:bg-gray-900 transition-colors">
      <h1 className="text-2xl font-semibold mb-4 text-center text-gray-800 dark:text-gray-100">
        Scan to Pay via UPI
      </h1>
      <img
        src="/assets/khelconnect_qr.jpeg"
        alt="UPI QR Code"
        className="w-64 h-64 border border-gray-300 dark:border-gray-600 rounded-lg shadow-md"
      />
      <p className="mt-4 text-gray-600 dark:text-gray-300 text-center">
        Open any UPI app like Google Pay, PhonePe, or Paytm and scan the code to send payment.
      </p>
    </main>
  );
}

"use client";

export default function QRCodePage() {
  const qrUrl = "/assets/khelconnect_qr.jpeg";
  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}${qrUrl}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "UPI QR Code",
          text: "Scan or share this UPI QR to pay.",
          url: shareUrl,
        });
      } catch (error) {
        console.error("Sharing failed:", error);
      }
    } else {
      alert("Sharing not supported on this browser.");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-white dark:bg-gray-900 transition-colors">
      <h1 className="text-2xl font-semibold mb-4 text-center text-gray-800 dark:text-gray-100">
        Scan to Pay via UPI
      </h1>

      <a
        href={qrUrl}
        target="_blank"
        rel="noopener noreferrer"
        download
        className="cursor-pointer"
      >
        <img
          src={qrUrl}
          alt="UPI QR Code"
          className="w-64 h-64 border border-gray-300 dark:border-gray-600 rounded-lg shadow-md hover:scale-105 active:scale-95 transition-transform"
        />
      </a>

      <p className="mt-4 text-gray-600 dark:text-gray-300 text-center max-w-sm">
        Tap or long-press the QR to open or share in any payment app. You can also use the button below.
      </p>

      <button
        onClick={handleShare}
        className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      >
        Share QR Code
      </button>
    </main>
  );
}

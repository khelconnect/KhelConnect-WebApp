import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-6 py-12 max-w-4xl">
      <Button variant="ghost" size="sm" asChild className="gap-2 mb-8">
        <Link href="/">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </Button>

      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <p className="text-muted-foreground mb-4">Last updated: {new Date().toLocaleDateString()}</p>

      <div className="space-y-6 text-foreground/80">
        <section>
          <h2 className="text-xl font-semibold mb-2 text-foreground">1. Introduction</h2>
          <p>
            Welcome to KhelConnect. We respect your privacy and are committed to protecting your personal data.
            This privacy policy will inform you as to how we look after your personal data when you visit our website
            and tell you about your privacy rights.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2 text-foreground">2. Data We Collect</h2>
          <p>We may collect, use, store and transfer the following kinds of personal data:</p>
          <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
            <li><strong>Identity Data:</strong> Name, username, or similar identifier.</li>
            <li><strong>Contact Data:</strong> Email address and telephone number.</li>
            <li><strong>Transaction Data:</strong> Details about payments to and from you and other details of services you have purchased from us.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2 text-foreground">3. How We Use Your Data</h2>
          <p>We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
          <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
            <li>To register you as a new customer.</li>
            <li>To process and deliver your booking.</li>
            <li>To manage our relationship with you.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2 text-foreground">4. Contact Us</h2>
          <p>
            If you have any questions about this privacy policy or our privacy practices, please contact us at:{" "}
            <a href="mailto:khelconnectindia@gmail.com" className="text-primary hover:underline">khelconnectindia@gmail.com</a>
          </p>
        </section>
      </div>
    </div>
  )
}
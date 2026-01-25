import Link from 'next/link';
import { CheckCircle } from 'lucide-react';

export default function SuccessMock() {
  return (
    <main className="min-h-screen bg-midnight text-white font-sans flex items-center justify-center text-center p-6">
      <div className="max-w-md">
        <div className="w-24 h-24 bg-lime/10 rounded-full flex items-center justify-center mx-auto mb-6 text-lime">
          <CheckCircle size={48} />
        </div>
        <h1 className="text-3xl font-bold mb-4">Payment Simulated</h1>
        <p className="text-dim mb-8">
          This is a mock checkout page. In production, this would be hosted by Stripe.
          <br />
          The funds have been (theoretically) moved to escrow.
        </p>
        <Link 
          href="/" 
          className="block w-full bg-lime text-midnight font-bold py-4 rounded-xl hover:bg-lime/90 transition"
        >
          Return to Dashboard
        </Link>
      </div>
    </main>
  );
}

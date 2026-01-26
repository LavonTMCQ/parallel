import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-midnight flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-mono text-2xl font-bold tracking-tighter">
            <span className="text-lime">//</span> PARALLEL
          </h1>
          <p className="text-dim mt-2">Sign in to your account</p>
        </div>
        <SignIn
          appearance={{
            elements: {
              rootBox: 'w-full',
              card: 'w-full bg-surface border border-white/10 rounded-2xl shadow-2xl',
            }
          }}
        />
      </div>
    </div>
  );
}

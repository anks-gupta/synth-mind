import { SignUp } from '@clerk/nextjs';
import { Brain } from 'lucide-react';
import Link from 'next/link';

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[#070b12] flex flex-col items-center justify-center p-4 selection:bg-violet-500/30 selection:text-violet-200">
      <Link href="/" className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-violet-500/20">
          <Brain className="w-6 h-6 text-white stroke-[2.5]" />
        </div>
        <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-violet-300 via-indigo-200 to-cyan-300 bg-clip-text text-transparent">
          SynthMind
        </span>
      </Link>

      <div className="w-full max-w-[95vw] sm:max-w-md flex justify-center px-2">
        <SignUp
          appearance={{
            elements: {
              card: 'bg-[#0f172a] border border-[#1e293b] backdrop-blur-md shadow-2xl text-slate-200 rounded-2xl',
              headerTitle: 'text-slate-100 font-bold',
              headerSubtitle: 'text-slate-400 text-xs',
              formButtonPrimary: 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-md shadow-violet-500/25',
              footerActionLink: 'text-violet-400 hover:text-violet-300 font-semibold',
            },
          }}
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          forceRedirectUrl="/dashboard"
        />
      </div>
    </div>
  );
}

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { JobsProvider } from '@/lib/JobsContext';
import { AdminResumeProvider } from '@/lib/AdminResumeContext';
import { AuthProvider } from '@/lib/AuthContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Training Job Portal — Resume Optimizer Simulator',
  description:
    'Practice applying to jobs with our AI-powered training portal. Upload your resume, simulate ATS optimization, and apply to matching job listings.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* suppressHydrationWarning fixes browser-extension attribute injection (e.g. bis_skin_checked) */}
      <body className={`${inter.className} app-body`} suppressHydrationWarning>
        <AuthProvider>
          <JobsProvider>
            <AdminResumeProvider>
              {children}
            </AdminResumeProvider>
          </JobsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

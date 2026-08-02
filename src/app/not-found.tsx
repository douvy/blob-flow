import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Blob Not Found',
};

// Themed 404 page. Without this, Next.js renders its default not-found UI,
// whose light-mode text is near-black and unreadable on the app's dark
// background.
export default function NotFound() {
  return (
    <div className="container mx-auto flex max-w-7xl flex-col items-center px-4 py-16 text-center md:py-24">
      <Image
        src="/images/favicon.png"
        alt="The BlobFlow blob, taking the news well"
        width={192}
        height={192}
        priority
        className="mb-8 h-40 w-40 md:h-48 md:w-48 animate-[blob-bob_3.5s_ease-in-out_infinite] motion-reduce:animate-none"
      />
      <p className="mb-3 text-xs uppercase tracking-wider text-secondaryText">
        Error 404: Blob Not Found
      </p>
      <h1 className="mb-8 text-4xl font-windsor-bold text-white md:text-5xl">
        This page got pruned
      </h1>
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-blue hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Home
      </Link>
    </div>
  );
}

'use client';
import { useSearchParams } from 'next/navigation';

export default function ProjectsContent() {
  const searchParams = useSearchParams();
  // ... all your existing logic that uses searchParams
  return <div>Your content here</div>;
}
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import apiClient from '@/lib/axios';
import { Check, X, Loader2 } from 'lucide-react';

interface Invitation {
  id: number;
  project: { id: number; name: string };
  invited_user: number;
  invited_by: number;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  created_at: string;
  expires_at: string;
}

const fetchInvitations = async (): Promise<Invitation[]> => {
  const { data } = await apiClient.get('/invitations/');
  return data;
};

const acceptInvitation = async (id: number) => {
  const { data } = await apiClient.post(`/invitations/${id}/accept/`);
  return data;
};

const declineInvitation = async (id: number) => {
  const { data } = await apiClient.post(`/invitations/${id}/decline/`);
  return data;
};

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { data: invitations, isLoading, refetch } = useQuery({
    queryKey: ['invitations'],
    queryFn: fetchInvitations,
  });

  const acceptMut = useMutation({
    mutationFn: acceptInvitation,
    onSuccess: () => {
      toast.success('Invitation accepted');
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: () => toast.error('Failed to accept'),
  });

  const declineMut = useMutation({
    mutationFn: declineInvitation,
    onSuccess: () => {
      toast.success('Invitation declined');
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
    onError: () => toast.error('Failed to decline'),
  });

  if (isLoading) return <div className="p-6">Loading...</div>;

  const pendingInvites = invitations?.filter((inv) => inv.status === 'pending') || [];
  const otherInvites = invitations?.filter((inv) => inv.status !== 'pending') || [];

  return (
    <div dir="rtl" className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">پروفایل کاربری</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">دعوت‌های در انتظار</h2>
        {pendingInvites.length === 0 ? (
          <p className="text-gray-500">هیچ دعوتی در انتظار نیست</p>
        ) : (
          <div className="space-y-3">
            {pendingInvites.map((inv) => (
              <div key={inv.id} className="flex justify-between items-center p-4 border rounded-xl shadow-sm">
                <div>
                  <p className="font-medium">پروژه: {inv.project.name}</p>
                  <p className="text-xs text-gray-500">
                    دعوت شده در: {new Date(inv.created_at).toLocaleDateString('fa-IR')}
                  </p>
                  {new Date(inv.expires_at) < new Date() && <p className="text-red-500 text-xs">منقضی شده</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => acceptMut.mutate(inv.id)}
                    disabled={acceptMut.isPending}
                    className="p-2 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition"
                  >
                    {acceptMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => declineMut.mutate(inv.id)}
                    disabled={declineMut.isPending}
                    className="p-2 bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* (Optional) Previous invitations list */}
      {otherInvites.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-3">تاریخچه دعوت‌ها</h2>
          <div className="space-y-2">
            {otherInvites.map((inv) => (
              <div key={inv.id} className="flex justify-between items-center p-3 border rounded-xl bg-gray-50">
                <div>
                  <p className="font-medium">{inv.project.name}</p>
                  <p className="text-xs text-gray-500">وضعیت: {inv.status === 'accepted' ? 'پذیرفته شده' : 'رد شده / منقضی'}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
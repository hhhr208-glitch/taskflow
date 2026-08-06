'use client';

import apiClient from '@/lib/axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, ChevronLeft, ChevronRight, Edit2, FolderOpen, LogOut, Plus, Search, Trash2, Users, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';

// ---------- Types ----------
interface Project {
  id: number;
  name: string;
  description: string;
  owner: number;
  members?: number[];
  image?: string | null;
  created_at: string;
  updated_at: string;
  total_tasks?: number;
  completed_tasks?: number;
}

interface PaginatedResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Project[];
}

// ---------- Helper functions ----------
const getImageUrl = (imagePath: string | null | undefined) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8000';
  const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
  return `${baseUrl}/media/${cleanPath}`;
};

const fetchProjects = async (searchTerm: string = '', page: number = 1): Promise<PaginatedResponse> => {
  const params: Record<string, any> = { page };
  if (searchTerm) params.search = searchTerm;
  const { data } = await apiClient.get('/projects/', { params });
  return data; // { count, next, previous, results }
};

const createProject = async (formData: FormData): Promise<Project> => {
  const { data } = await apiClient.post('/projects/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

const deleteProject = async (id: number): Promise<void> => {
  await apiClient.delete(`/projects/${id}/`);
};

const logout = async (): Promise<void> => {
  await apiClient.post('/logout/');
};

// ---------- Skeleton Component ----------
function ProjectsSkeleton() {
  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="flex justify-between items-start mb-8 md:mb-12">
          <div>
            <div className="h-9 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
            <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded mt-2 animate-pulse"></div>
          </div>
          <div className="flex gap-3">
            <div className="h-11 w-28 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
            <div className="h-11 w-20 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="h-44 bg-gray-200 dark:bg-gray-700 animate-pulse" />
              <div className="p-5">
                <div className="flex justify-between">
                  <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                </div>
                <div className="mt-2 space-y-2">
                  <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
                <div className="flex gap-3 mt-3">
                  <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
                <div className="mt-4 pt-3 border-t">
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Project Card Component ----------
function ProjectCard({ project, onDelete }: { project: Project; onDelete: () => void }) {
  const [showMenu, setShowMenu] = useState(false);
  const [imgError, setImgError] = useState(false);
  const memberCount = project.members?.length ?? 0;
  const imageUrl = getImageUrl(project.image);

  return (
    <div className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800">
      {/* Image area */}
      <div className="relative h-44 overflow-hidden bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30">
        {imageUrl && !imgError ? (
          <img
            src={imageUrl}
            alt={project.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FolderOpen className="w-12 h-12 text-indigo-400" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
      </div>

      <div className="p-5">
        <div className="flex justify-between items-start gap-2">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1">{project.name}</h3>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="1" fill="currentColor" />
                <circle cx="19" cy="12" r="1" fill="currentColor" />
                <circle cx="5" cy="12" r="1" fill="currentColor" />
              </svg>
            </button>
            {showMenu && (
              <div className="absolute left-0 mt-2 w-32 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 z-10 overflow-hidden">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    toast('ویرایش به زودی اضافه می‌شود');
                  }}
                  className="w-full text-right px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition"
                >
                  <Edit2 className="w-3.5 h-3.5" /> ویرایش
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    if (confirm('آیا از حذف این پروژه مطمئن هستید؟')) onDelete();
                  }}
                  className="w-full text-right px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" /> حذف
                </button>
              </div>
            )}
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{project.description || 'بدون توضیحات'}</p>
        <div className="flex items-center gap-3 mt-3 text-xs text-gray-400 dark:text-gray-500">
          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            <span>{memberCount} عضو</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>{new Date(project.created_at).toLocaleDateString('fa-IR')}</span>
          </div>
        </div>
        {project.total_tasks !== undefined && project.total_tasks > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>پیشرفت</span>
              <span>{Math.round((project.completed_tasks || 0) / project.total_tasks * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${(project.completed_tasks || 0) / project.total_tasks * 100}%` }}
              />
            </div>
          </div>
        )}
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={() => (window.location.href = `/projects/${project.id}`)}
            className="text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:underline flex items-center gap-1 transition"
          >
            مشاهده وظایف
            <svg className="w-3.5 h-3.5 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Main Content Component (uses useSearchParams) ----------
function ProjectsContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  // Read page from URL (default 1)
  const page = Number(searchParams.get('page')) || 1;
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectImage, setNewProjectImage] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update URL when page changes
  const setPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`?${params.toString()}`, { scroll: false });
  };

  // Handle search – reset page to 1 and update URL
  const handleSearchChange = (value: string) => {
    setSearch(value);
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1');
    router.push(`?${params.toString()}`, { scroll: false });
  };

  // Fetch projects (paginated + search)
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['projects', search, page],
    queryFn: () => fetchProjects(search, page),
    staleTime: 60 * 1000,
    placeholderData: (previous) => previous,
  });

  // If current page becomes empty (after delete) -> go to previous page
  useEffect(() => {
    if (data && data.results.length === 0 && page > 1) {
      setPage(page - 1);
    }
  }, [data, page]);

  const projects = data?.results || [];
  const totalCount = data?.count || 0;
  const hasNext = !!data?.next;
  const hasPrev = !!data?.previous;
  const pageSize = 10;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Create project mutation
  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      toast.success('پروژه با موفقیت ایجاد شد');
      setIsModalOpen(false);
      setNewProjectName('');
      setNewProjectDescription('');
      setNewProjectImage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'خطا در ایجاد پروژه');
    },
  });

  // Delete project mutation (optimistic)
  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['projects', search, page] });
      const previousData = queryClient.getQueryData<PaginatedResponse>(['projects', search, page]);
      if (previousData) {
        const newResults = previousData.results.filter((p) => p.id !== deletedId);
        queryClient.setQueryData(['projects', search, page], {
          ...previousData,
          results: newResults,
          count: previousData.count - 1,
        });
      }
      return { previousData };
    },
    onError: (err, deletedId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['projects', search, page], context.previousData);
      }
      toast.error('خطا در حذف');
    },
    onSuccess: () => toast.success('پروژه حذف شد'),
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => router.push('/auth'),
    onError: () => router.push('/auth'),
  });

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) {
      toast.error('نام پروژه الزامی است');
      return;
    }
    const formData = new FormData();
    formData.append('name', newProjectName);
    formData.append('description', newProjectDescription);
    if (newProjectImage) formData.append('image', newProjectImage);
    createMutation.mutate(formData);
  };

  // Authentication error
  if (error && (error as any)?.response?.status === 401) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center p-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl">
          <p className="text-red-500 mb-4">نشست شما منقضی شده است</p>
          <button onClick={() => router.push('/auth')} className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition">
            ورود مجدد
          </button>
        </div>
      </div>
    );
  }

  if (!data && isLoading) return <ProjectsSkeleton />;
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">خطا در بارگذاری پروژه‌ها</p>
          <button onClick={() => refetch()} className="px-6 py-2 bg-indigo-600 text-white rounded-xl">تلاش مجدد</button>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Header + Search */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 md:mb-12">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              پروژه‌ها
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm md:text-base">
              مدیریت همه پروژه‌های خود در یک نگاه
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search input */}
            <div className="relative">
              <div className="relative group">
                <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors duration-200" />
                <input
                  type="text"
                  placeholder="جستجوی پروژه..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full sm:w-72 pl-4 pr-10 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm focus:shadow-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-sm"
                />
                {search && (
                  <button
                    onClick={() => handleSearchChange('')}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>پروژه جدید</span>
            </button>
            <button
              onClick={() => logoutMutation.mutate()}
              className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>خروج</span>
            </button>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white/60 dark:bg-gray-800/40 backdrop-blur-sm rounded-3xl border border-gray-200 dark:border-gray-700 shadow-lg transition-all duration-300 hover:shadow-xl">
            <div className="relative w-24 h-24 mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-600 rounded-3xl opacity-10 animate-pulse"></div>
              <div className="relative flex items-center justify-center w-full h-full">
                <svg className="w-16 h-16 text-indigo-500 drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 11v4m-2-2h4" />
                </svg>
              </div>
            </div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {search ? 'پروژه‌ای یافت نشد' : 'هنوز پروژه‌ای وجود ندارد'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-sm">
              {search 
                ? 'هیچ پروژه‌ای با این عبارت پیدا نشد. عبارت دیگری را امتحان کنید.'
                : 'اولین پروژه خود را بسازید و همکاری را شروع کنید.'}
            </p>
            {!search && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
              >
                <Plus className="w-4 h-4" />
                <span>ساخت پروژه جدید</span>
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} onDelete={() => deleteMutation.mutate(project.id)} />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-3 mt-12">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={!hasPrev}
                  className={`flex items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                    hasPrev
                      ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                      : 'bg-gray-100 dark:bg-gray-800/50 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                  <span>قبلی</span>
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  صفحه {page} از {totalPages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={!hasNext}
                  className={`flex items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                    hasNext
                      ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                      : 'bg-gray-100 dark:bg-gray-800/50 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <span>بعدی</span>
                  <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                پروژه جدید
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreateProject}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نام پروژه *</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">توضیحات (اختیاری)</label>
                <textarea
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-1">عکس کاور (اختیاری)</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={(e) => setNewProjectImage(e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50">
                  انصراف
                </button>
                <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50">
                  {createMutation.isPending ? 'در حال ایجاد...' : 'ایجاد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Main Page Component (wrapped in Suspense) ----------
export default function ProjectsPage() {
  return (
    <Suspense fallback={<ProjectsSkeleton />}>
      <ProjectsContent />
    </Suspense>
  );
}
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import apiClient from '@/lib/axios';
import { Plus, Trash2, Edit2, ArrowLeft, X, CheckCircle, Circle, Clock, Users, UserPlus, Search } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useDebounce } from 'use-debounce';

// ---------- Types ----------
interface Task {
  id: number;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_date?: string | null;
  assignee?: number | null;
  created_at: string;
  updated_at: string;
}

interface Project {
  id: number;
  name: string;
  description: string;
  owner: number;
  members: number[];
  members_detail?: User[];
  image?: string | null;
  created_at: string;
  updated_at: string;
}

interface User {
  id: number;
  username: string;
  email: string;
}

interface Invitation {
  id: number;
  project: number;
  invited_user: number;
  invited_by: number;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  created_at: string;
  expires_at: string;
}

// ---------- API Calls ----------
const fetchProject = async (id: string): Promise<Project> => {
  const { data } = await apiClient.get(`/projects/${id}/`);
  return data;
};

const fetchTasks = async (
  projectId: string,
  search: string = '',
  status: string = '',
  priority: string = '',
  assignee: string = ''
): Promise<Task[]> => {
  const params: Record<string, any> = { project: projectId };
  if (search) params.search = search;
  if (status) params.status = status;
  if (priority) params.priority = priority;
  if (assignee) params.assignee = assignee;
  const { data } = await apiClient.get(`/tasks/`, { params });
  return data;
};

const createTask = async (task: Partial<Task> & { project: number }): Promise<Task> => {
  const { data } = await apiClient.post('/tasks/', task);
  return data;
};

const updateTaskStatus = async ({ id, status }: { id: number; status: string }): Promise<Task> => {
  const { data } = await apiClient.patch(`/tasks/${id}/`, { status });
  return data;
};

const deleteTask = async (id: number): Promise<void> => {
  await apiClient.delete(`/tasks/${id}/`);
};

const updateTask = async ({ id, ...data }: Partial<Task> & { id: number }): Promise<Task> => {
  const { data: updated } = await apiClient.patch(`/tasks/${id}/`, data);
  return updated;
};

const fetchUsers = async (search: string): Promise<User[]> => {
  const { data } = await apiClient.get('/users/', { params: { search } });
  if (Array.isArray(data)) return data;
  return data.results || [];
};

const createInvitation = async (projectId: number, userId: number): Promise<Invitation> => {
  const { data } = await apiClient.post('/invitations/', {
    project: projectId,
    invited_user: userId,
  });
  return data;
};

const fetchCurrentUser = async (): Promise<User> => {
  const { data } = await apiClient.get('/users/me/');
  return data;
};

// ---------- Skeleton Component ----------
function TasksSkeleton() {
  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
          <div className="flex-1">
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
            <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded mt-2 animate-pulse"></div>
          </div>
          <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-100 dark:bg-gray-800/40 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b">
                <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="bg-white dark:bg-gray-800 rounded-xl p-4 border">
                    <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                    <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded mt-2 animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Column Component ----------
function Column({
  id,
  title,
  icon,
  tasks,
  status,
  onStatusChange,
  onDelete,
  onEdit,
  isOwner,
  currentUser,
  membersDetail,
}: {
  id: string;
  title: string;
  icon: React.ReactNode;
  tasks: Task[];
  status: string;
  onStatusChange: (taskId: number, newStatus: string) => void;
  onDelete: (taskId: number) => void;
  onEdit: (task: Task) => void;
  isOwner: boolean;
  currentUser: User | undefined;
  membersDetail: User[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  const getNextStatus = (current: string) => {
    if (current === 'todo') return 'in_progress';
    if (current === 'in_progress') return 'done';
    return 'done';
  };

  const getNextLabel = (current: string) => {
    if (current === 'todo') return 'شروع';
    if (current === 'in_progress') return 'اتمام';
    return 'اتمام';
  };

  return (
    <div
      ref={setNodeRef}
      className={`bg-gray-100 dark:bg-gray-800/40 rounded-2xl p-5 border border-gray-200 dark:border-gray-300 shadow-lg hover:-translate-y-1 transition-transform duration-200 hover:border-indigo-300 dark:hover:border-indigo-600 ${
        isOver ? 'ring-2 ring-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' : ''
      }`}
    >
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
        {icon}
        <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{title}</h3>
        <span className="text-sm text-gray-500 dark:text-gray-400 mr-auto bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>
      <div className="space-y-3">
        {tasks.map((task) => (
          <DraggableTask
            key={task.id}
            task={task}
            status={status}
            onStatusChange={onStatusChange}
            onDelete={onDelete}
            onEdit={onEdit}
            getNextStatus={getNextStatus}
            getNextLabel={getNextLabel}
            isOwner={isOwner}
            currentUser={currentUser}
            membersDetail={membersDetail}
          />
        ))}
        {tasks.length === 0 && (
          <div className="text-center text-gray-400 dark:text-gray-500 py-8 text-sm">
            <div className="w-12 h-12 mx-auto bg-gray-200 dark:bg-gray-700 rounded-2xl flex items-center justify-center mb-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p>وظیفه‌ای وجود ندارد</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Draggable Task Card ----------
function DraggableTask({
  task,
  status,
  onStatusChange,
  onDelete,
  onEdit,
  getNextStatus,
  getNextLabel,
  isOwner,
  currentUser,
  membersDetail,
}: {
  task: Task;
  status: string;
  onStatusChange: (taskId: number, newStatus: string) => void;
  onDelete: (taskId: number) => void;
  onEdit: (task: Task) => void;
  getNextStatus: (current: string) => string;
  getNextLabel: (current: string) => string;
  isOwner: boolean;
  currentUser: User | undefined;
  membersDetail: User[];
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id.toString(),
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  const canDrag = isOwner || task.assignee === currentUser?.id;
  const assigneeUser = membersDetail.find((m) => m.id === task.assignee);
  const assigneeName = assigneeUser ? assigneeUser.username : (task.assignee?.toString() || '');

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(canDrag ? listeners : {})}
      {...attributes}
      className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-indigo-200 animate-fade-in-scale ${
        canDrag ? 'cursor-grab' : 'cursor-default'
      }`}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 dark:text-white line-clamp-1">{task.title}</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
            {task.description || 'بدون توضیحات'}
          </p>
          <div className="mt-2 flex flex-wrap gap-2 items-center">
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                task.priority === 'high'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  : task.priority === 'medium'
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
              }`}
            >
              {task.priority === 'high' ? 'بالا' : task.priority === 'medium' ? 'متوسط' : 'کم'}
            </span>
            {task.assignee && (
              <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                مسئول: {assigneeName}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {canDrag && status !== 'done' && (
            <button
              onClick={() => onStatusChange(task.id, getNextStatus(status))}
              className="text-xs bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-800/40 transition"
            >
              {getNextLabel(status)}
            </button>
          )}
          <button
            onClick={() => onEdit(task)}
            className="text-blue-500 hover:text-blue-700 p-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Main Component with URL Filters ----------
export default function ProjectTasksPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const queryClient = useQueryClient();

  // Read filters from URL
  const urlSearch = searchParams.get('search') || '';
  const urlStatus = searchParams.get('status') || '';
  const urlPriority = searchParams.get('priority') || '';
  const urlAssignee = searchParams.get('assignee') || '';

  // Local state for search input (for debounced typing)
  const [searchInput, setSearchInput] = useState(urlSearch);
  const [debouncedSearch] = useDebounce(searchInput, 300);

  // Sync local search input when URL changes (e.g., back/forward)
  useEffect(() => {
    setSearchInput(urlSearch);
  }, [urlSearch]);

  // Update URL when debounced search changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) params.set('search', debouncedSearch);
    else params.delete('search');
    router.push(`?${params.toString()}`, { scroll: false });
  }, [debouncedSearch]);

  // Helper to update immediate filters (status, priority, assignee)
  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchInput('');
    router.push(`?`, { scroll: false });
  };

  // Current user (for owner check and assignee comparison)
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: fetchCurrentUser,
    staleTime: 1000 * 60 * 10,
  });

  // State for modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newTaskAssignee, setNewTaskAssignee] = useState<number | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTaskAssignee, setEditTaskAssignee] = useState<number | null>(null);

  // Invitation modal state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Queries
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => fetchProject(projectId),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 10,
    placeholderData: (previous) => previous,
  });

  const { data: tasks, isLoading: tasksLoading, error } = useQuery({
    queryKey: ['tasks', projectId, urlSearch, urlStatus, urlPriority, urlAssignee],
    queryFn: () => fetchTasks(projectId, urlSearch, urlStatus, urlPriority, urlAssignee),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 10,
    placeholderData: (previous) => previous,
  });

  // Mutations (update query key to include all filters)
  const createMutation = useMutation({
    mutationFn: createTask,
    onSuccess: (newTask) => {
      queryClient.setQueryData<Task[]>(
        ['tasks', projectId, urlSearch, urlStatus, urlPriority, urlAssignee],
        (old) => (old ? [...old, newTask] : [newTask])
      );
      toast.success('وظیفه با موفقیت ایجاد شد');
      setIsModalOpen(false);
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskAssignee(null);
    },
    onError: () => toast.error('خطا در ایجاد وظیفه'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: updateTaskStatus,
    onSuccess: (updatedTask) => {
      queryClient.setQueryData<Task[]>(
        ['tasks', projectId, urlSearch, urlStatus, urlPriority, urlAssignee],
        (old) => old?.map((task) => (task.id === updatedTask.id ? updatedTask : task))
      );
      toast.success('وضعیت به‌روز شد');
    },
    onError: () => toast.error('خطا در به‌روزرسانی وضعیت'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onMutate: async (deletedId: number) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', projectId, urlSearch, urlStatus, urlPriority, urlAssignee] });
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks', projectId, urlSearch, urlStatus, urlPriority, urlAssignee]);
      queryClient.setQueryData<Task[]>(
        ['tasks', projectId, urlSearch, urlStatus, urlPriority, urlAssignee],
        (old) => old?.filter((t) => t.id !== deletedId)
      );
      return { previousTasks };
    },
    onError: (err, deletedId, context) => {
      queryClient.setQueryData(['tasks', projectId, urlSearch, urlStatus, urlPriority, urlAssignee], context?.previousTasks);
      toast.error('خطا در حذف وظیفه');
    },
    onSuccess: () => toast.success('وظیفه حذف شد'),
  });

  const updateTaskMutation = useMutation({
    mutationFn: updateTask,
    onSuccess: (updatedTask) => {
      queryClient.setQueryData<Task[]>(
        ['tasks', projectId, urlSearch, urlStatus, urlPriority, urlAssignee],
        (old) => old?.map((task) => (task.id === updatedTask.id ? updatedTask : task))
      );
      toast.success('وظیفه ویرایش شد');
      setIsEditModalOpen(false);
      setEditingTask(null);
      setEditTaskAssignee(null);
    },
    onError: () => toast.error('خطا در ویرایش وظیفه'),
  });

  const inviteMutation = useMutation({
    mutationFn: () => createInvitation(parseInt(projectId), selectedUser!.id),
    onSuccess: () => {
      toast.success('دعوت نامه ارسال شد');
      setIsInviteModalOpen(false);
      setInviteUsername('');
      setSelectedUser(null);
      setSearchResults([]);
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'خطا در ارسال دعوت'),
  });

  // Search users for invitation
  useEffect(() => {
    if (inviteUsername.length > 2) {
      const delayDebounce = setTimeout(() => {
        fetchUsers(inviteUsername).then(setSearchResults).catch(() => setSearchResults([]));
      }, 500);
      return () => clearTimeout(delayDebounce);
    } else {
      setSearchResults([]);
    }
  }, [inviteUsername]);

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) {
      toast.error('عنوان وظیفه الزامی است');
      return;
    }
    createMutation.mutate({
      title: newTaskTitle,
      description: newTaskDescription,
      priority: newTaskPriority,
      assignee: newTaskAssignee,
      project: parseInt(projectId),
      status: 'todo',
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const taskId = parseInt(active.id as string);
    const newStatus = over.id as string;
    updateStatusMutation.mutate({ id: taskId, status: newStatus });
  };

  const safeTasks = tasks ?? [];
  const todoTasks = safeTasks.filter((t) => t.status === 'todo');
  const inProgressTasks = safeTasks.filter((t) => t.status === 'in_progress');
  const doneTasks = safeTasks.filter((t) => t.status === 'done');

  if ((projectLoading || tasksLoading) && !project && safeTasks.length === 0) return <TasksSkeleton />;
  if (error) return <div className="p-6 text-center text-red-500">خطا در بارگذاری</div>;
  if (!project) return null;

  const isOwner = currentUser?.id === project.owner;
  const members = project.members_detail || [];

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Header with members and invite button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 md:mb-12">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition rotate-180"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                {project.name}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">{project.description || 'بدون توضیحات'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Users className="w-5 h-5 text-gray-500" />
              <div className="flex -space-x-2">
                {members.slice(0, 4).map((member) => (
                  <div
                    key={member.id}
                    className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-xs font-bold text-indigo-600 border-2 border-white dark:border-gray-800"
                    title={member.username}
                  >
                    {member.username.charAt(0).toUpperCase()}
                  </div>
                ))}
                {members.length > 4 && (
                  <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-600 border-2 border-white dark:border-gray-800">
                    +{members.length - 4}
                  </div>
                )}
              </div>
            </div>
            {isOwner && (
              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition"
              >
                <UserPlus className="w-4 h-4" />
                <span>دعوت عضو</span>
              </button>
            )}
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>وظیفه جدید</span>
            </button>
          </div>
        </div>

        {/* Search & Filters Bar */}
        <div className="mb-8 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">جستجو در عنوان</label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="عنوان وظیفه..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pr-9 pl-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-800"
              />
            </div>
          </div>

          <div className="w-36">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">وضعیت</label>
            <select
              value={urlStatus}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            >
              <option value="">همه</option>
              <option value="todo">انجام نشده</option>
              <option value="in_progress">در حال انجام</option>
              <option value="done">انجام شده</option>
            </select>
          </div>

          <div className="w-36">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اولویت</label>
            <select
              value={urlPriority}
              onChange={(e) => updateFilter('priority', e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            >
              <option value="">همه</option>
              <option value="low">کم</option>
              <option value="medium">متوسط</option>
              <option value="high">بالا</option>
            </select>
          </div>

          <div className="w-44">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">مسئول</label>
            <select
              value={urlAssignee}
              onChange={(e) => updateFilter('assignee', e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            >
              <option value="">همه</option>
              {members.map((member) => (
                <option key={member.id} value={member.id.toString()}>
                  {member.username}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={clearFilters}
            className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            پاک کردن فیلترها
          </button>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <Column
              id="todo"
              title="انجام نشده"
              icon={<Circle className="w-4 h-4 text-gray-400" />}
              tasks={todoTasks}
              status="todo"
              onStatusChange={(id, newStatus) => updateStatusMutation.mutate({ id, status: newStatus })}
              onDelete={(id) => deleteMutation.mutate(id)}
              onEdit={(task) => {
                setEditingTask(task);
                setEditTaskAssignee(task.assignee ?? null);
                setIsEditModalOpen(true);
              }}
              isOwner={isOwner}
              currentUser={currentUser}
              membersDetail={members}
            />
            <Column
              id="in_progress"
              title="در حال انجام"
              icon={<Clock className="w-4 h-4 text-amber-500" />}
              tasks={inProgressTasks}
              status="in_progress"
              onStatusChange={(id, newStatus) => updateStatusMutation.mutate({ id, status: newStatus })}
              onDelete={(id) => deleteMutation.mutate(id)}
              onEdit={(task) => {
                setEditingTask(task);
                setEditTaskAssignee(task.assignee ?? null);
                setIsEditModalOpen(true);
              }}
              isOwner={isOwner}
              currentUser={currentUser}
              membersDetail={members}
            />
            <Column
              id="done"
              title="انجام شده"
              icon={<CheckCircle className="w-4 h-4 text-green-500" />}
              tasks={doneTasks}
              status="done"
              onStatusChange={(id, newStatus) => updateStatusMutation.mutate({ id, status: newStatus })}
              onDelete={(id) => deleteMutation.mutate(id)}
              onEdit={(task) => {
                setEditingTask(task);
                setEditTaskAssignee(task.assignee ?? null);
                setIsEditModalOpen(true);
              }}
              isOwner={isOwner}
              currentUser={currentUser}
              membersDetail={members}
            />
          </div>
        </DndContext>

        {/* Create Task Modal  */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">وظیفه جدید</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleCreateTask}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">عنوان *</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">توضیحات (اختیاری)</label>
                  <textarea
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    rows={3}
                    value={newTaskDescription}
                    onChange={(e) => setNewTaskDescription(e.target.value)}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">اولویت</label>
                  <select
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                  >
                    <option value="low">کم</option>
                    <option value="medium">متوسط</option>
                    <option value="high">بالا</option>
                  </select>
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-1">مسئول</label>
                  <select
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    value={newTaskAssignee ?? ''}
                    onChange={(e) => setNewTaskAssignee(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">بدون مسئول</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.username}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-xl hover:bg-gray-50">
                    انصراف
                  </button>
                  <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 bg-indigo-600 text-white rounded-xl">
                    {createMutation.isPending ? 'در حال ایجاد...' : 'ایجاد'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Task Modal  */}
        {isEditModalOpen && editingTask && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">ویرایش وظیفه</h2>
                <button onClick={() => setIsEditModalOpen(false)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const title = formData.get('title') as string;
                  const description = formData.get('description') as string;
                  const priority = formData.get('priority') as 'low' | 'medium' | 'high';
                  const assignee = formData.get('assignee') ? Number(formData.get('assignee')) : null;
                  if (!title.trim()) {
                    toast.error('عنوان الزامی است');
                    return;
                  }
                  updateTaskMutation.mutate({ id: editingTask.id, title, description, priority, assignee });
                }}
              >
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">عنوان *</label>
                  <input
                    type="text"
                    name="title"
                    defaultValue={editingTask.title}
                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">توضیحات</label>
                  <textarea
                    name="description"
                    defaultValue={editingTask.description || ''}
                    rows={3}
                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">اولویت</label>
                  <select
                    name="priority"
                    defaultValue={editingTask.priority}
                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="low">کم</option>
                    <option value="medium">متوسط</option>
                    <option value="high">بالا</option>
                  </select>
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-1">مسئول</label>
                  <select
                    name="assignee"
                    defaultValue={editingTask.assignee ?? ''}
                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">بدون مسئول</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.username}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 border rounded-xl hover:bg-gray-50">
                    انصراف
                  </button>
                  <button type="submit" disabled={updateTaskMutation.isPending} className="px-4 py-2 bg-indigo-600 text-white rounded-xl">
                    {updateTaskMutation.isPending ? 'در حال ذخیره...' : 'ذخیره'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Invite Member Modal (unchanged) */}
        {isInviteModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">دعوت کاربر جدید</h2>
                <button onClick={() => setIsInviteModalOpen(false)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">نام کاربری یا ایمیل</label>
                  <input
                    type="text"
                    placeholder="نام کاربری را وارد کنید"
                    value={inviteUsername}
                    onChange={(e) => setInviteUsername(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                  {searchResults.length > 0 && (
                    <ul className="mt-2 border rounded-xl overflow-hidden divide-y">
                      {searchResults.map((user) => (
                        <li
                          key={user.id}
                          onClick={() => {
                            setSelectedUser(user);
                            setInviteUsername(user.username);
                            setSearchResults([]);
                          }}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                        >
                          {user.username} {user.email && `(${user.email})`}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {selectedUser && (
                  <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-xl flex justify-between items-center">
                    <span>
                      کاربر انتخاب شده: <strong>{selectedUser.username}</strong>
                    </span>
                    <button onClick={() => setSelectedUser(null)} className="text-red-500 hover:text-red-700 transition">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {inviteUsername.length > 2 && searchResults.length === 0 && !selectedUser && (
                  <p className="text-red-500 text-sm">کاربری یافت نشد</p>
                )}
                <div className="flex justify-end gap-3">
                  <button onClick={() => setIsInviteModalOpen(false)} className="px-4 py-2 border rounded-xl hover:bg-gray-50">
                    انصراف
                  </button>
                  <button
                    onClick={() => inviteMutation.mutate()}
                    disabled={!selectedUser || inviteMutation.isPending}
                    className={`px-4 py-2 rounded-xl transition ${
                      selectedUser && !inviteMutation.isPending
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {inviteMutation.isPending ? 'در حال ارسال...' : 'ارسال دعوت'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
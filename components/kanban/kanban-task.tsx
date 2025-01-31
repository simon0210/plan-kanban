"use client"

import { Draggable } from "@hello-pangea/dnd"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatDistanceToNow } from "date-fns"
import { zhCN, enUS, zhTW } from "date-fns/locale"
import { useState, useRef, useCallback } from "react"
import { EditTaskDialog } from "./edit-task-dialog"
import { toast } from "@/lib/toast"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ToastAction } from "@/components/ui/toast"
import { useTranslation } from "react-i18next"

interface Task {
  id: string
  title: string
  description: string | null
  status: "TODO" | "IN_PROGRESS" | "DONE"
  priority: "LOW" | "MEDIUM" | "HIGH"
  order: number
  projectId: string
  createdAt: string
  updatedAt: string
}

interface KanbanTaskProps {
  task: Task
  index: number
  onUpdate: () => void
}

export function KanbanTask({ task, index, onUpdate }: KanbanTaskProps) {
  const { t, i18n } = useTranslation()
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [deletedTask, setDeletedTask] = useState<Task | null>(null)
  const deleteTimeoutRef = useRef<number>()
  const taskRef = useRef<Task | null>(null)

  const priorityConfig = {
    LOW: {
      label: t('common.lowPriority'),
      color: "bg-green-800",
    },
    MEDIUM: {
      label: t('common.mediumPriority'),
      color: "bg-yellow-500",
    },
    HIGH: {
      label: t('common.highPriority'),
      color: "bg-red-800",
    },
  } as const

  const getDateLocale = () => {
    switch (i18n.language) {
      case 'zh':
      case 'zh-CN':
        return zhCN
      case 'zh-TW':
        return zhTW
      default:
        return enUS
    }
  }

  const handleRestore = useCallback(() => {
    console.log('Restore clicked', { taskRef: taskRef.current, timeoutRef: deleteTimeoutRef.current })
    
    // 使用 taskRef 而不是 deletedTask
    if (!taskRef.current) return

    // 清除删除定时器
    if (deleteTimeoutRef.current) {
      window.clearTimeout(deleteTimeoutRef.current)
      deleteTimeoutRef.current = undefined
    }

    // 恢复 UI
    setDeletedTask(null)
    onUpdate()
    
    toast.success({
      title: t('common.success'),
      description: t('common.taskRestored'),
    })
  }, [onUpdate]) // 移除 deletedTask 依赖

  const handleDelete = async () => {
    try {
      console.log('Delete clicked', { task })
      // 保存任务到 ref 中
      taskRef.current = task
      // 先从 UI 移除
      setDeletedTask(task)
      onUpdate()

      // 显示 toast 并设置延迟删除
      toast.success({
        title: t('common.success'),
        description: t('common.taskDeleted'),
        duration: 5000,
        action: (
          <ToastAction altText={t('common.undo')} onClick={handleRestore}>
            {t('common.undo')}
          </ToastAction>
        ),
      })

      // 设置定时器，5秒后真正从数据库删除
      deleteTimeoutRef.current = window.setTimeout(async () => {
        console.log('Executing delete from database', { taskId: task.id, taskRef: taskRef.current })
        try {
          const response = await fetch(`/api/tasks/${task.id}`, {
            method: "DELETE",
          })
          if (!response.ok) throw new Error(t('common.deleteFailed'))
          
          // 删除成功后清除引用
          deleteTimeoutRef.current = undefined
          taskRef.current = null
        } catch (error) {
          console.error('Delete from database failed', error)
          toast.error({
            title: t('common.error'),
            description: t('common.deleteFailed'),
          })
          // 如果删除失败，恢复 UI
          setDeletedTask(null)
          taskRef.current = null
          onUpdate()
        }
      }, 5000)

    } catch (error) {
      console.error('Delete operation failed', error)
      toast.error({
        title: t('common.error'),
        description: t('common.deleteFailed'),
      })
      taskRef.current = null
    }
  }

  // 如果任务已被删除（在 UI 中隐藏），不渲染任何内容
  if (deletedTask?.id === task.id) {
    return null
  }

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            "touch-none select-none",
            snapshot.isDragging && "rotate-2"
          )}
        >
          <Card 
            className={cn(
              "border border-gray-600/60 shadow-sm transition-all cursor-pointer hover:shadow-md",
              snapshot.isDragging && "shadow-lg opacity-60"
            )}
            onClick={() => setIsViewDialogOpen(true)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h4 className="font-semibold">{task.title}</h4>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">{t('common.openMenu')}</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation()
                    setIsEditDialogOpen(true)
                  }}>
                    {t('common.editTask')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete()
                    }}
                  >
                    {t('common.deleteTask')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {task.description || t('common.noDescription')}
              </p>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <div className="flex items-center justify-between w-full">
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-white",
                    priorityConfig[task.priority].color
                  )}
                >
                  {priorityConfig[task.priority].label}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {t('common.updatedAt')} {" "}
                  {formatDistanceToNow(new Date(task.updatedAt), {
                    addSuffix: true,
                    locale: getDateLocale(),
                  })}
                </span>
              </div>
            </CardFooter>
          </Card>
          <EditTaskDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            task={task}
            onTaskUpdated={onUpdate}
          />
          <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{task.title}</DialogTitle>
                <DialogDescription>
                  {t('common.createdAt')} {" "}
                  {formatDistanceToNow(new Date(task.createdAt), {
                    addSuffix: true,
                    locale: getDateLocale(),
                  })}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">{t('common.taskDescription')}</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {task.description || t('common.noDescription')}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "text-white",
                      priorityConfig[task.priority].color
                    )}
                  >
                    {priorityConfig[task.priority].label}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {t('common.updatedAt')} {" "}
                    {formatDistanceToNow(new Date(task.updatedAt), {
                      addSuffix: true,
                      locale: getDateLocale(),
                    })}
                  </span>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </Draggable>
  )
} 
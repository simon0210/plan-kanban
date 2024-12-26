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
import { zhCN } from "date-fns/locale"
import { useState } from "react"
import { EditTaskDialog } from "./edit-task-dialog"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Task {
  id: number
  title: string
  description: string
  status: "todo" | "in_progress" | "done"
  priority?: "low" | "medium" | "high"
  projectId: string
  createdAt: string
  updatedAt: string
}

const priorityConfig = {
  low: {
    label: "低优先级",
    color: "bg-green-800",
  },
  medium: {
    label: "中优先级",
    color: "bg-yellow-500",
  },
  high: {
    label: "高优先级",
    color: "bg-red-800",
  },
} as const

interface KanbanTaskProps {
  task: Task
  index: number
  onUpdate: () => void
}

export function KanbanTask({ task, index, onUpdate }: KanbanTaskProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const { toast } = useToast()

  const handleDelete = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/tasks/${task.id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("删除失败")

      onUpdate()
      toast({
        title: "成功",
        description: "任务已删除",
      })
    } catch (error) {
      toast({
        title: "错误",
        description: "删除任务失败",
        variant: "destructive",
      })
    }
  }

  const priority = task.priority || "low"

  return (
    <Draggable draggableId={String(task.id)} index={index}>
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
          <Card className={cn(
            "border shadow-sm transition-all",
            snapshot.isDragging && "shadow-lg"
          )}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h4 className="font-semibold">{task.title}</h4>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">打开菜单</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                    编辑任务
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={handleDelete}
                  >
                    删除任务
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {task.description || "暂无描述"}
              </p>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <div className="flex items-center justify-between w-full">
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-white",
                    priorityConfig[priority].color
                  )}
                >
                  {priorityConfig[priority].label}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  更新于{" "}
                  {formatDistanceToNow(new Date(task.updatedAt), {
                    addSuffix: true,
                    locale: zhCN,
                  })}
                </span>
              </div>
            </CardFooter>
          </Card>
          <EditTaskDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            task={{
              ...task,
              priority: priority,
            }}
            onTaskUpdated={onUpdate}
          />
        </div>
      )}
    </Draggable>
  )
} 
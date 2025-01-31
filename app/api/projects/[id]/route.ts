import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { z } from 'zod'
import {
  canViewProject,
  canEditProject,
  canDeleteProject,
  PermissionError,
} from '@/lib/permissions'

const updateProjectSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']).optional(),
})

// 获取单个项目
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return requireAuth(request, async (userId) => {
    const { id } = params

    // 检查权限
    if (!(await canViewProject(userId, id))) {
      throw new PermissionError()
    }

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        members: {
          select: {
            role: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        tasks: {
          orderBy: {
            order: 'asc',
          },
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    if (!project) {
      return new NextResponse(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new NextResponse(JSON.stringify(project), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  })
}

// 更新项目
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return requireAuth(request, async (userId) => {
    try {
      const { id } = params
      const body = await request.json()
      const data = updateProjectSchema.parse(body)

      // 检查权限
      if (!(await canEditProject(userId, id))) {
        throw new PermissionError()
      }

      const project = await prisma.project.update({
        where: { id },
        data,
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          members: {
            select: {
              role: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      })

      return new NextResponse(JSON.stringify(project), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return new NextResponse(JSON.stringify({ error: error.errors }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (error instanceof PermissionError) {
        return new NextResponse(JSON.stringify({ error: error.message }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return new NextResponse(
        JSON.stringify({ error: 'Internal server error' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  })
}

// 删除项目
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return requireAuth(request, async (userId) => {
    try {
      const { id } = params

      // 检查权限
      if (!(await canDeleteProject(userId, id))) {
        throw new PermissionError()
      }

      await prisma.project.delete({
        where: { id },
      })

      return new NextResponse(null, { status: 204 })
    } catch (error) {
      if (error instanceof PermissionError) {
        return new NextResponse(JSON.stringify({ error: error.message }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return new NextResponse(
        JSON.stringify({ error: 'Internal server error' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  })
} 
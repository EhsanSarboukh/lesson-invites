import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';

@Injectable()
export class InvitesService {
  constructor(private prisma: PrismaService) {}

  private logAction(action: string) {
    fs.appendFileSync('log.txt', `${new Date().toISOString()} - ${action}\n`);
  }

  async createInvite(teacherId: number, studentId: number, scheduledAt: Date) {
    // prevent duplicate invites
    const existing = await this.prisma.lessonInvite.findFirst({
      where: { teacherId, studentId, scheduledAt },
    });
    if (existing) throw new Error('Invite already exists for this student and time.');

    const invite = await this.prisma.lessonInvite.create({
      data: { teacherId, studentId, scheduledAt },
    });

    this.logAction(`Teacher ${teacherId} invited Student ${studentId}`);
    return invite;
  }

  async respondToInvite(inviteId: number, status: 'accepted' | 'rejected') {
    const invite = await this.prisma.lessonInvite.update({
      where: { id: inviteId },
      data: { status },
    });

    this.logAction(`Student ${invite.studentId} ${status} invite ${inviteId}`);

    if (status === 'accepted') {
      // auto-reject other invites for same time
      await this.prisma.lessonInvite.updateMany({
        where: {
          studentId: invite.studentId,
          scheduledAt: invite.scheduledAt,
          NOT: { id: inviteId },
        },
        data: { status: 'rejected' },
      });
    }

    return invite;
  }

  async getAllInvites() {
    return this.prisma.lessonInvite.findMany({
      include: { teacher: true, student: true },
    });
  }

  async getStudentInvites(studentId: number) {
    return this.prisma.lessonInvite.findMany({
      where: { studentId, status: 'pending' },
      include: { teacher: true },
    });
  }
}

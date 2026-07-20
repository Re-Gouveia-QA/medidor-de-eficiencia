import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config/database', () => ({
  prisma: {
    activity: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '../../src/config/database';
import { ReportService } from '../../src/services/ReportService';

const USER_ID = 'user-1';
const PERIODO = { inicio: new Date('2026-07-01T00:00:00.000Z'), fim: new Date('2026-07-31T00:00:00.000Z') };

describe('ReportService (BaseModel — escopo por usuário, RF12)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('build inclui userId no where junto com o filtro de período', async () => {
    vi.mocked(prisma.activity.findMany).mockResolvedValue([]);
    await ReportService.build(USER_ID, PERIODO);
    const call = vi.mocked(prisma.activity.findMany).mock.calls[0][0];
    expect(call.where).toEqual({
      userId: USER_ID,
      data: { gte: PERIODO.inicio, lte: PERIODO.fim },
    });
  });
});

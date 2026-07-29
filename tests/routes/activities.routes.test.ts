import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app';
import { ActivityModel } from '../../src/models/ActivityModel';
import { CategoryModel } from '../../src/models/CategoryModel';
import { loginAgent, TEST_USER } from '../helpers/auth';

vi.mock('../../src/models/UserModel');
vi.mock('../../src/models/CategoryModel');
vi.mock('../../src/models/ActivityModel');

const CATEGORY_ID = '22222222-2222-2222-2222-222222222222';

function fakeCategoria(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: CATEGORY_ID,
    userId: TEST_USER.id,
    nome: 'Deslocamento',
    descricao: null,
    cor: '#9333EA',
    tempoDesejadoMin: null,
    possuiValor: false,
    valorLabel: null,
    valorPadrao: null,
    duracaoPadraoMin: null,
    criadoEm: new Date(),
    _count: { atividades: 0 },
    ...overrides,
  };
}

const atividadeInput = {
  nome: 'Ônibus para o trabalho',
  categoryId: CATEGORY_ID,
  data: '2026-07-15',
  horaInicio: '08:00',
  horaFim: '08:30',
};

describe('Rotas de atividades', () => {
  const app = createApp();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('Dado um usuário autenticado sem categorias cadastradas', () => {
    it('Quando acessa GET /activities/new, então redireciona para /categories/new', async () => {
      vi.mocked(CategoryModel.listByUser).mockResolvedValue([] as never);

      const agent = await loginAgent(app);
      const res = await agent.get('/activities/new');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/categories/new');
    });
  });

  describe('Dado um usuário autenticado com categorias cadastradas', () => {
    it('Quando acessa GET /activities/new, então retorna 200', async () => {
      vi.mocked(CategoryModel.listByUser).mockResolvedValue([fakeCategoria()] as never);

      const agent = await loginAgent(app);
      const res = await agent.get('/activities/new');
      expect(res.status).toBe(200);
    });

    it('Quando o cookie "tz" tem percent-encoding malformado, então GET /activities não derruba a requisição', async () => {
      vi.mocked(ActivityModel.listByUser).mockResolvedValue([] as never);
      vi.mocked(CategoryModel.listByUser).mockResolvedValue([] as never);

      const agent = await loginAgent(app);
      const res = await agent.get('/activities').set('Cookie', 'tz=%');
      expect(res.status).toBe(200);
    });

    describe('Quando envia POST /activities', () => {
      it('Então dados inválidos redirecionam para /activities/new sem criar', async () => {
        const agent = await loginAgent(app);
        const res = await agent
          .post('/activities')
          .type('form')
          .send({ ...atividadeInput, categoryId: 'nao-e-uuid' });
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/activities/new');
        expect(ActivityModel.create).not.toHaveBeenCalled();
      });

      it('Então categoria de outro usuário é rejeitada (RF12)', async () => {
        vi.mocked(CategoryModel.findById).mockResolvedValue(null);

        const agent = await loginAgent(app);
        const res = await agent
          .post('/activities')
          .type('form')
          .send({ ...atividadeInput, categoryId: '11111111-1111-1111-1111-111111111111' });
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/activities/new');
        expect(ActivityModel.create).not.toHaveBeenCalled();
      });

      it('Então cria a atividade sem valor quando a categoria não possui valor habilitado', async () => {
        vi.mocked(CategoryModel.findById).mockResolvedValue(fakeCategoria({ possuiValor: false }) as never);
        vi.mocked(ActivityModel.create).mockResolvedValue({} as never);

        const agent = await loginAgent(app);
        const res = await agent.post('/activities').type('form').send(atividadeInput);
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/activities');
        expect(ActivityModel.create).toHaveBeenCalledWith(
          TEST_USER.id,
          expect.objectContaining({ valor: undefined }),
        );
      });

      it('Então repassa o fuso do cookie "tz" para o model (RNF05)', async () => {
        vi.mocked(CategoryModel.findById).mockResolvedValue(fakeCategoria({ possuiValor: false }) as never);
        vi.mocked(ActivityModel.create).mockResolvedValue({} as never);

        const agent = await loginAgent(app);
        const res = await agent
          .post('/activities')
          .set('Cookie', 'tz=America/Sao_Paulo')
          .type('form')
          .send(atividadeInput);
        expect(res.status).toBe(302);
        expect(ActivityModel.create).toHaveBeenCalledWith(
          TEST_USER.id,
          expect.objectContaining({ timezone: 'America/Sao_Paulo' }),
        );
      });

      it('Então cai para UTC quando o cookie "tz" é inválido (cookie não é httpOnly, pode ser adulterado)', async () => {
        vi.mocked(CategoryModel.findById).mockResolvedValue(fakeCategoria({ possuiValor: false }) as never);
        vi.mocked(ActivityModel.create).mockResolvedValue({} as never);

        const agent = await loginAgent(app);
        const res = await agent
          .post('/activities')
          .set('Cookie', 'tz=not-a-real-timezone')
          .type('form')
          .send(atividadeInput);
        expect(res.status).toBe(302);
        expect(ActivityModel.create).toHaveBeenCalledWith(
          TEST_USER.id,
          expect.objectContaining({ timezone: 'UTC' }),
        );
      });

      it('Então usa o valor padrão da categoria quando o campo valor fica em branco (regra 9)', async () => {
        vi.mocked(CategoryModel.findById).mockResolvedValue(
          fakeCategoria({ possuiValor: true, valorPadrao: { toNumber: () => 4.4 } }) as never,
        );
        vi.mocked(ActivityModel.create).mockResolvedValue({} as never);

        const agent = await loginAgent(app);
        const res = await agent.post('/activities').type('form').send(atividadeInput);
        expect(res.status).toBe(302);
        expect(ActivityModel.create).toHaveBeenCalledWith(TEST_USER.id, expect.objectContaining({ valor: 4.4 }));
      });

      it('Então respeita o valor informado manualmente mesmo havendo valor padrão (regra 9)', async () => {
        vi.mocked(CategoryModel.findById).mockResolvedValue(
          fakeCategoria({ possuiValor: true, valorPadrao: { toNumber: () => 4.4 } }) as never,
        );
        vi.mocked(ActivityModel.create).mockResolvedValue({} as never);

        const agent = await loginAgent(app);
        const res = await agent.post('/activities').type('form').send({ ...atividadeInput, valor: '7.5' });
        expect(res.status).toBe(302);
        expect(ActivityModel.create).toHaveBeenCalledWith(TEST_USER.id, expect.objectContaining({ valor: 7.5 }));
      });

      it('Então mantém a mensagem de erro quando hora de fim não é posterior à hora de início (regra 4)', async () => {
        vi.mocked(CategoryModel.findById).mockResolvedValue(fakeCategoria() as never);
        vi.mocked(ActivityModel.create).mockRejectedValue(
          new Error('A hora de fim deve ser posterior à hora de início.'),
        );

        const agent = await loginAgent(app);
        const res = await agent
          .post('/activities')
          .type('form')
          .send({ ...atividadeInput, horaInicio: '10:00', horaFim: '09:00' });
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/activities/new');
      });
    });

    describe('Quando acessa GET /activities/:id/edit', () => {
      it('Então redireciona quando a atividade não existe ou não pertence ao usuário', async () => {
        vi.mocked(ActivityModel.findById).mockResolvedValue(null);
        vi.mocked(CategoryModel.listByUser).mockResolvedValue([fakeCategoria()] as never);

        const agent = await loginAgent(app);
        const res = await agent.get('/activities/inexistente/edit');
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/activities');
      });
    });

    describe('Quando envia PUT /activities/:id', () => {
      it('Então atualiza a atividade e limpa o valor quando enviado em branco', async () => {
        vi.mocked(CategoryModel.findById).mockResolvedValue(fakeCategoria() as never);
        vi.mocked(ActivityModel.update).mockResolvedValue({ count: 1 } as never);

        const agent = await loginAgent(app);
        const res = await agent.put('/activities/act-1').type('form').send(atividadeInput);
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/activities');
        expect(ActivityModel.update).toHaveBeenCalledWith(
          'act-1',
          TEST_USER.id,
          expect.objectContaining({ valor: null }),
        );
      });

      it('Então categoria de outro usuário é rejeitada (RF12)', async () => {
        vi.mocked(CategoryModel.findById).mockResolvedValue(null);

        const agent = await loginAgent(app);
        const res = await agent.put('/activities/act-1').type('form').send(atividadeInput);
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/activities/act-1/edit');
        expect(ActivityModel.update).not.toHaveBeenCalled();
      });
    });

    describe('Quando envia DELETE /activities/:id', () => {
      it('Então exclui a atividade do usuário autenticado', async () => {
        vi.mocked(ActivityModel.destroy).mockResolvedValue({ count: 1 } as never);

        const agent = await loginAgent(app);
        const res = await agent.delete('/activities/act-1');
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/activities');
        expect(ActivityModel.destroy).toHaveBeenCalledWith('act-1', TEST_USER.id);
      });

      it('Então redireciona com erro quando nada é excluído (id inexistente ou de outro usuário)', async () => {
        vi.mocked(ActivityModel.destroy).mockResolvedValue({ count: 0 } as never);

        const agent = await loginAgent(app);
        const res = await agent.delete('/activities/inexistente');
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/activities');
      });
    });

    describe('Quando envia POST /activities/start', () => {
      it('Então inicia a atividade e redireciona pra home', async () => {
        vi.mocked(CategoryModel.findById).mockResolvedValue(fakeCategoria() as never);
        vi.mocked(ActivityModel.startInProgress).mockResolvedValue({} as never);

        const agent = await loginAgent(app);
        const res = await agent
          .post('/activities/start')
          .type('form')
          .send({ nome: 'Reunião', categoryId: CATEGORY_ID });
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/');
        expect(ActivityModel.startInProgress).toHaveBeenCalledWith(
          TEST_USER.id,
          expect.objectContaining({ nome: 'Reunião', categoryId: CATEGORY_ID }),
        );
      });

      it('Então categoria de outro usuário é rejeitada (RF12) e não chama o model', async () => {
        vi.mocked(CategoryModel.findById).mockResolvedValue(null);

        const agent = await loginAgent(app);
        const res = await agent
          .post('/activities/start')
          .type('form')
          .send({ nome: 'Reunião', categoryId: '11111111-1111-1111-1111-111111111111' });
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/');
        expect(ActivityModel.startInProgress).not.toHaveBeenCalled();
      });

      it('Então redireciona com erro quando já existe uma atividade em andamento', async () => {
        vi.mocked(CategoryModel.findById).mockResolvedValue(fakeCategoria() as never);
        vi.mocked(ActivityModel.startInProgress).mockRejectedValue(
          new Error('Você já tem uma atividade em andamento. Finalize-a antes de iniciar outra.'),
        );

        const agent = await loginAgent(app);
        const res = await agent
          .post('/activities/start')
          .type('form')
          .send({ nome: 'Reunião', categoryId: CATEGORY_ID });
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/');
      });
    });

    describe('Quando envia POST /activities/:id/finish', () => {
      it('Então finaliza a atividade e redireciona pra home', async () => {
        vi.mocked(ActivityModel.finish).mockResolvedValue({ count: 1 } as never);

        const agent = await loginAgent(app);
        const res = await agent.post('/activities/act-1/finish');
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/');
        expect(ActivityModel.finish).toHaveBeenCalledWith('act-1', TEST_USER.id, {
          descricao: undefined,
          valor: undefined,
        });
      });

      it('Então redireciona com erro quando não encontra a atividade em andamento', async () => {
        vi.mocked(ActivityModel.finish).mockResolvedValue({ count: 0 } as never);

        const agent = await loginAgent(app);
        const res = await agent.post('/activities/inexistente/finish');
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/');
      });

      it('Então (com detalhes) repassa descricao/valor pro Model', async () => {
        vi.mocked(ActivityModel.finish).mockResolvedValue({ count: 1 } as never);

        const agent = await loginAgent(app);
        const res = await agent
          .post('/activities/act-1/finish')
          .type('form')
          .send({ descricao: 'Reunião de alinhamento', valor: '50' });
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/');
        expect(ActivityModel.finish).toHaveBeenCalledWith('act-1', TEST_USER.id, {
          descricao: 'Reunião de alinhamento',
          valor: 50,
        });
      });

      it('Então valor inválido redireciona com flash de erro sem chamar o Model', async () => {
        const agent = await loginAgent(app);
        const res = await agent.post('/activities/act-1/finish').type('form').send({ valor: '-10' });
        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/');
        expect(ActivityModel.finish).not.toHaveBeenCalled();
      });
    });
  });
});

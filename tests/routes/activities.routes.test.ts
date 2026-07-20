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

  it('GET /activities/new redireciona para /categories/new quando o usuário não tem categorias', async () => {
    vi.mocked(CategoryModel.listByUser).mockResolvedValue([] as never);

    const agent = await loginAgent(app);
    const res = await agent.get('/activities/new');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/categories/new');
  });

  it('GET /activities/new retorna 200 quando há categorias cadastradas', async () => {
    vi.mocked(CategoryModel.listByUser).mockResolvedValue([fakeCategoria()] as never);

    const agent = await loginAgent(app);
    const res = await agent.get('/activities/new');
    expect(res.status).toBe(200);
  });

  it('POST /activities com dados inválidos redireciona para /activities/new', async () => {
    const agent = await loginAgent(app);
    const res = await agent.post('/activities').type('form').send({ ...atividadeInput, categoryId: 'nao-e-uuid' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/activities/new');
    expect(ActivityModel.create).not.toHaveBeenCalled();
  });

  it('POST /activities com categoria de outro usuário é rejeitado (RF12)', async () => {
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

  it('POST /activities cria atividade sem valor quando a categoria não possui valor habilitado', async () => {
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

  it('POST /activities repassa o fuso do cookie "tz" para o model (RNF05)', async () => {
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

  it('POST /activities cai para UTC quando o cookie "tz" é inválido (cookie não é httpOnly, pode ser adulterado)', async () => {
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

  it('GET /activities não derruba a requisição quando o cookie "tz" tem um percent-encoding malformado', async () => {
    vi.mocked(ActivityModel.listByUser).mockResolvedValue([] as never);
    vi.mocked(CategoryModel.listByUser).mockResolvedValue([] as never);

    const agent = await loginAgent(app);
    const res = await agent.get('/activities').set('Cookie', 'tz=%');
    expect(res.status).toBe(200);
  });

  it('POST /activities usa o valor padrão da categoria quando o campo valor fica em branco (regra 9)', async () => {
    vi.mocked(CategoryModel.findById).mockResolvedValue(
      fakeCategoria({ possuiValor: true, valorPadrao: { toNumber: () => 4.4 } }) as never,
    );
    vi.mocked(ActivityModel.create).mockResolvedValue({} as never);

    const agent = await loginAgent(app);
    const res = await agent.post('/activities').type('form').send(atividadeInput);
    expect(res.status).toBe(302);
    expect(ActivityModel.create).toHaveBeenCalledWith(TEST_USER.id, expect.objectContaining({ valor: 4.4 }));
  });

  it('POST /activities respeita o valor informado manualmente mesmo havendo valor padrão (regra 9)', async () => {
    vi.mocked(CategoryModel.findById).mockResolvedValue(
      fakeCategoria({ possuiValor: true, valorPadrao: { toNumber: () => 4.4 } }) as never,
    );
    vi.mocked(ActivityModel.create).mockResolvedValue({} as never);

    const agent = await loginAgent(app);
    const res = await agent.post('/activities').type('form').send({ ...atividadeInput, valor: '7.5' });
    expect(res.status).toBe(302);
    expect(ActivityModel.create).toHaveBeenCalledWith(TEST_USER.id, expect.objectContaining({ valor: 7.5 }));
  });

  it('POST /activities mantém a mensagem de erro quando hora de fim não é posterior à hora de início (regra 4)', async () => {
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

  it('GET /activities/:id/edit redireciona quando a atividade não existe ou não pertence ao usuário', async () => {
    vi.mocked(ActivityModel.findById).mockResolvedValue(null);
    vi.mocked(CategoryModel.listByUser).mockResolvedValue([fakeCategoria()] as never);

    const agent = await loginAgent(app);
    const res = await agent.get('/activities/inexistente/edit');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/activities');
  });

  it('PUT /activities/:id atualiza a atividade e limpa o valor quando enviado em branco', async () => {
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

  it('PUT /activities/:id com categoria de outro usuário é rejeitado (RF12)', async () => {
    vi.mocked(CategoryModel.findById).mockResolvedValue(null);

    const agent = await loginAgent(app);
    const res = await agent.put('/activities/act-1').type('form').send(atividadeInput);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/activities/act-1/edit');
    expect(ActivityModel.update).not.toHaveBeenCalled();
  });

  it('DELETE /activities/:id exclui a atividade do usuário autenticado', async () => {
    vi.mocked(ActivityModel.destroy).mockResolvedValue({ count: 1 } as never);

    const agent = await loginAgent(app);
    const res = await agent.delete('/activities/act-1');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/activities');
    expect(ActivityModel.destroy).toHaveBeenCalledWith('act-1', TEST_USER.id);
  });

  it('DELETE /activities/:id redireciona com erro quando nada é excluído (id inexistente ou de outro usuário)', async () => {
    vi.mocked(ActivityModel.destroy).mockResolvedValue({ count: 0 } as never);

    const agent = await loginAgent(app);
    const res = await agent.delete('/activities/inexistente');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/activities');
  });
});

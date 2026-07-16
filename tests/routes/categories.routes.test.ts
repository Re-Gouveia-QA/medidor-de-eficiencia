import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { CategoryModel } from '../../src/models/CategoryModel';
import { loginAgent, TEST_USER } from '../helpers/auth';

vi.mock('../../src/models/UserModel');
vi.mock('../../src/models/CategoryModel');

function fakeCategoria(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'cat-1',
    userId: TEST_USER.id,
    nome: 'Trabalho',
    descricao: null,
    cor: '#2563EB',
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

describe('Rotas de categorias', () => {
  const app = createApp();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('GET /categories lista as categorias do usuário autenticado', async () => {
    vi.mocked(CategoryModel.listByUser).mockResolvedValue([fakeCategoria()] as never);

    const agent = await loginAgent(app);
    const res = await agent.get('/categories');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Trabalho');
    expect(CategoryModel.listByUser).toHaveBeenCalledWith(TEST_USER.id);
  });

  it('GET /categories/new retorna 200', async () => {
    const agent = await loginAgent(app);
    const res = await agent.get('/categories/new');
    expect(res.status).toBe(200);
  });

  it('POST /categories com cor fora do formato hexadecimal redireciona com erro (regra 6)', async () => {
    const agent = await loginAgent(app);
    const res = await agent.post('/categories').type('form').send({ nome: 'Lazer', cor: 'azul' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/categories/new');
    expect(CategoryModel.create).not.toHaveBeenCalled();
  });

  it('POST /categories com dados válidos cria a categoria e redireciona com sucesso', async () => {
    vi.mocked(CategoryModel.create).mockResolvedValue(fakeCategoria() as never);

    const agent = await loginAgent(app);
    const res = await agent.post('/categories').type('form').send({ nome: 'Lazer', cor: '#F59E0B' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/categories');
    expect(CategoryModel.create).toHaveBeenCalledWith(
      TEST_USER.id,
      expect.objectContaining({ nome: 'Lazer', cor: '#F59E0B' }),
    );
  });

  it('POST /categories com nome duplicado mantém o usuário na tela de criação (regra 6)', async () => {
    vi.mocked(CategoryModel.create).mockRejectedValue(new Error('unique constraint'));

    const agent = await loginAgent(app);
    const res = await agent.post('/categories').type('form').send({ nome: 'Trabalho', cor: '#2563EB' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/categories/new');
  });

  it('POST /categories habilita valor numérico com rótulo e valor padrão (regra 9)', async () => {
    vi.mocked(CategoryModel.create).mockResolvedValue(fakeCategoria() as never);

    const agent = await loginAgent(app);
    const res = await agent.post('/categories').type('form').send({
      nome: 'Deslocamento',
      cor: '#9333EA',
      possuiValor: 'on',
      valorLabel: 'Custo da passagem (R$)',
      valorPadrao: '4.4',
    });
    expect(res.status).toBe(302);
    expect(CategoryModel.create).toHaveBeenCalledWith(
      TEST_USER.id,
      expect.objectContaining({
        possuiValor: true,
        valorLabel: 'Custo da passagem (R$)',
        valorPadrao: 4.4,
      }),
    );
  });

  it('POST /categories com duração padrão define duracaoPadraoMin (regra 10)', async () => {
    vi.mocked(CategoryModel.create).mockResolvedValue(fakeCategoria() as never);

    const agent = await loginAgent(app);
    const res = await agent
      .post('/categories')
      .type('form')
      .send({ nome: 'Lazer', cor: '#F59E0B', duracaoPadraoMin: '60' });
    expect(res.status).toBe(302);
    expect(CategoryModel.create).toHaveBeenCalledWith(
      TEST_USER.id,
      expect.objectContaining({ duracaoPadraoMin: 60 }),
    );
  });

  it('GET /categories/:id/edit redireciona quando a categoria não existe ou não pertence ao usuário', async () => {
    vi.mocked(CategoryModel.findById).mockResolvedValue(null);

    const agent = await loginAgent(app);
    const res = await agent.get('/categories/inexistente/edit');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/categories');
  });

  it('PUT /categories/:id atualiza e limpa campos opcionais quando enviados em branco', async () => {
    vi.mocked(CategoryModel.update).mockResolvedValue({ count: 1 } as never);

    const agent = await loginAgent(app);
    const res = await agent.put('/categories/cat-1').type('form').send({ nome: 'Trabalho', cor: '#2563EB' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/categories');
    expect(CategoryModel.update).toHaveBeenCalledWith(
      'cat-1',
      TEST_USER.id,
      expect.objectContaining({
        tempoDesejadoMin: null,
        valorLabel: null,
        valorPadrao: null,
        duracaoPadraoMin: null,
      }),
    );
  });

  it('DELETE /categories/:id bloqueia exclusão quando há atividades vinculadas (regra 7)', async () => {
    vi.mocked(CategoryModel.findById).mockResolvedValue(fakeCategoria() as never);
    vi.mocked(CategoryModel.countActivities).mockResolvedValue(3);

    const agent = await loginAgent(app);
    const res = await agent.delete('/categories/cat-1');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/categories');
    expect(CategoryModel.destroy).not.toHaveBeenCalled();
  });

  it('DELETE /categories/:id exclui quando não há atividades vinculadas', async () => {
    vi.mocked(CategoryModel.findById).mockResolvedValue(fakeCategoria() as never);
    vi.mocked(CategoryModel.countActivities).mockResolvedValue(0);
    vi.mocked(CategoryModel.destroy).mockResolvedValue(fakeCategoria() as never);

    const agent = await loginAgent(app);
    const res = await agent.delete('/categories/cat-1');
    expect(res.status).toBe(302);
    expect(CategoryModel.destroy).toHaveBeenCalledWith('cat-1', TEST_USER.id);
  });

  it('DELETE /categories/:id redireciona quando a categoria não existe ou não pertence ao usuário', async () => {
    vi.mocked(CategoryModel.findById).mockResolvedValue(null);

    const agent = await loginAgent(app);
    const res = await agent.delete('/categories/inexistente');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/categories');
    expect(CategoryModel.countActivities).not.toHaveBeenCalled();
    expect(CategoryModel.destroy).not.toHaveBeenCalled();
  });
});

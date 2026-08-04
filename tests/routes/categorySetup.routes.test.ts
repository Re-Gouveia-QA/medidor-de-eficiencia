import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app';
import { CategoryModel } from '../../src/models/CategoryModel';
import { loginAgent, TEST_USER } from '../helpers/auth';

vi.mock('../../src/models/UserModel');
vi.mock('../../src/models/CategoryModel');

describe('Dado um usuário autenticado', () => {
  const app = createApp();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('Quando acessa GET /categories/setup', () => {
    it('Então lista os 5 presets disponíveis', async () => {
      const agent = await loginAgent(app);
      const res = await agent.get('/categories/setup');
      expect(res.status).toBe(200);
      expect(res.text).toContain('/categories/setup/estudante');
      expect(res.text).toContain('/categories/setup/concurseiro');
      expect(res.text).toContain('/categories/setup/financas-pessoais');
      expect(res.text).toContain('/categories/setup/academia');
      expect(res.text).toContain('/categories/setup/diario-pessoal');
    });
  });

  describe('Quando acessa GET /categories/setup/:presetId com id existente', () => {
    it('Então renderiza a prévia com as categorias do preset', async () => {
      const agent = await loginAgent(app);
      const res = await agent.get('/categories/setup/academia');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Musculação');
      expect(res.text).toContain('Cardio');
    });
  });

  describe('Quando acessa GET /categories/setup/:presetId com id inexistente', () => {
    it('Então redireciona pra lista de presets com flash de erro', async () => {
      const agent = await loginAgent(app);
      const res = await agent.get('/categories/setup/nao-existe');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/categories/setup');
    });
  });

  describe('Quando envia POST /categories/setup/:presetId com id inexistente', () => {
    it('Então redireciona sem chamar CategoryModel.create', async () => {
      const agent = await loginAgent(app);
      const res = await agent.post('/categories/setup/nao-existe');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/categories/setup');
      expect(CategoryModel.create).not.toHaveBeenCalled();
    });
  });

  describe('Quando envia POST /categories/setup/:presetId válido e todos os nomes estão livres', () => {
    it('Então cria uma categoria por item do preset e redireciona pra /categories', async () => {
      vi.mocked(CategoryModel.create).mockResolvedValue({} as never);

      const agent = await loginAgent(app);
      const res = await agent.post('/categories/setup/academia');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/categories');
      expect(CategoryModel.create).toHaveBeenCalledTimes(4);
      expect(CategoryModel.create).toHaveBeenCalledWith(TEST_USER.id, expect.objectContaining({ nome: 'Musculação' }));
    });
  });

  describe('Quando envia POST /categories/setup/:presetId e uma categoria já existe (nome duplicado, regra 6)', () => {
    it('Então pula só aquela categoria e continua criando as demais, sem quebrar a request', async () => {
      vi.mocked(CategoryModel.create)
        .mockResolvedValueOnce({} as never)
        .mockRejectedValueOnce(new Error('nome duplicado'))
        .mockResolvedValueOnce({} as never)
        .mockResolvedValueOnce({} as never);

      const agent = await loginAgent(app);
      const res = await agent.post('/categories/setup/academia');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/categories');
      expect(CategoryModel.create).toHaveBeenCalledTimes(4);
    });
  });
});

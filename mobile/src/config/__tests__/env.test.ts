// O env.ts é lido uma vez por carregamento; cada teste carrega o módulo de novo
function carregarEnv(variaveis: Record<string, string | undefined>) {
  const original = { ...process.env };
  Object.assign(process.env, variaveis);
  for (const [nome, valor] of Object.entries(variaveis)) {
    if (valor === undefined) delete process.env[nome];
  }
  let env: typeof import('../env') | undefined;
  jest.isolateModules(() => {
    env = require('../env');
  });
  process.env = original;
  return env!;
}

describe('config/env', () => {
  it('usa a API real do emulador Android por padrão', () => {
    const env = carregarEnv({ EXPO_PUBLIC_API_URL: undefined, EXPO_PUBLIC_USE_MOCK: undefined });

    expect(env.API_URL).toBe('http://10.0.2.2:8080');
    expect(env.USE_MOCK_API).toBe(false);
  });

  it('aceita outra URL e remove a barra do final', () => {
    const env = carregarEnv({ EXPO_PUBLIC_API_URL: 'http://192.168.0.10:8080/' });

    expect(env.API_URL).toBe('http://192.168.0.10:8080');
  });

  it('só liga o modo simulado com EXPO_PUBLIC_USE_MOCK=true', () => {
    expect(carregarEnv({ EXPO_PUBLIC_USE_MOCK: 'true' }).USE_MOCK_API).toBe(true);
    expect(carregarEnv({ EXPO_PUBLIC_USE_MOCK: 'false' }).USE_MOCK_API).toBe(false);
  });
});

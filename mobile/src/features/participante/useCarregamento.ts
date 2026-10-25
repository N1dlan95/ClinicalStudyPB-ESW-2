import { useCallback, useEffect, useState } from 'react';

/** Busca dados assíncronos expondo carregando/erro/recarregar para as telas. */
export function useCarregamento<T>(buscar: () => Promise<T>) {
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setDados(await buscar());
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar os dados.');
    } finally {
      setCarregando(false);
    }
  }, [buscar]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { dados, setDados, erro, carregando, recarregar };
}

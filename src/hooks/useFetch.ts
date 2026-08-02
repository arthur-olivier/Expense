import { useState, useEffect, useRef, type DependencyList } from "react";

//hook maison qui regroupe la logique répétitive de fetch
export function useFetch<T>(fn: () => Promise<T>, deps: DependencyList = []) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  // id de la requête : seule la dernière lancée écrit le résultat, pour qu'une lente en retard n'écrase pas une plus récente
  const reqId = useRef(0);

  async function refetch() {
    const id = ++reqId.current;
    setIsLoading(true);
    setError(null);
    try {
      const result = await fn();
      if (id === reqId.current) setData(result);
    } catch (err) {
      if (id === reqId.current) setError(err);
    } finally {
      if (id === reqId.current) setIsLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // renvoie data, isLoading, error, refetch et setData
  return { data, setData, isLoading, error, refetch };
}

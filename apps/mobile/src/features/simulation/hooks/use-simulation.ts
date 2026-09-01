import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';

import {
  usePlatformApi,
  type CreateSimulationInput,
} from '../../../shared/api';

export function useSimulation() {
  const api = usePlatformApi();
  const [simulationId, setSimulationId] = useState<string>();
  const create = useMutation({
    mutationFn: (input: CreateSimulationInput) => api.createSimulation(input),
    onSuccess: (simulation) => setSimulationId(simulation.simulationId),
  });
  const result = useQuery({
    enabled: simulationId !== undefined,
    queryKey: ['simulation', simulationId],
    queryFn: ({ signal }) => api.getSimulation(simulationId!, { signal }),
  });
  return { create, result, simulationId };
}

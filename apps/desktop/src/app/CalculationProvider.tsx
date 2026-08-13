import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  CalculationCapabilityPort,
  CapabilityId,
  CapabilityState,
} from './contracts.js';
import { unavailableCalculations } from './adapters/unavailableCalculations.js';

const CalculationContext = createContext<CalculationCapabilityPort | null>(null);

export function CalculationProvider({
  children,
  service = unavailableCalculations,
}: {
  readonly children: ReactNode;
  readonly service?: CalculationCapabilityPort;
}) {
  return (
    <CalculationContext.Provider value={service}>
      {children}
    </CalculationContext.Provider>
  );
}

export function useCalculationState<Output>(
  projectId: string,
  capability: CapabilityId,
  inputRevision?: string,
): CapabilityState<Output> {
  const service = useContext(CalculationContext);
  if (service === null) throw new Error('CalculationProvider is required');
  const loading = useMemo<CapabilityState<Output>>(
    () => ({ status: 'loading', messageKey: 'state.loading' }),
    [],
  );
  const [state, setState] = useState<CapabilityState<Output>>(loading);

  useEffect(() => {
    let active = true;
    setState(loading);
    void service
      .read<Output>(projectId, capability)
      .then((next) => {
        if (active) setState(next);
      })
      .catch(() => {
        if (active) {
          setState({
            status: 'error',
            code: 'CAPABILITY_READ_FAILED',
            messageKey: 'state.error',
            retryable: true,
          });
        }
      });
    return () => {
      active = false;
    };
  }, [capability, inputRevision, loading, projectId, service]);

  return state;
}

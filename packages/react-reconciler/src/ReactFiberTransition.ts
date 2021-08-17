import ReactSharedInternals from '../../shared/ReactSharedInternals'

const {ReactCurrentBatchConfig} = ReactSharedInternals;


export const NoTransition = 0;

export function requestCurrentTransition(): number {
  return ReactCurrentBatchConfig.transition;
}

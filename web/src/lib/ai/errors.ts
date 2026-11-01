import { AiError } from './types';

/** Never surface arbitrary exception text: it could contain credentials or device output. */
export function describeAiError(error: unknown, fallback: string): string {
  return error instanceof AiError ? error.message : fallback;
}

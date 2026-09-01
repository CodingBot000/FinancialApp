export function simulatorProblem(status: number, code: string, detail: string) {
  return {
    type: `https://wealth-sandbox.local/problems/${code.toLowerCase().replaceAll('_', '-')}`,
    title: code
      .toLowerCase()
      .split('_')
      .map((part) => part[0]?.toUpperCase() + part.slice(1))
      .join(' '),
    status,
    code,
    detail,
    traceId: 'unavailable',
    retryable: status >= 500,
    fieldErrors: [],
  };
}

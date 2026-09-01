export interface OpenApiResponseValidator {
  validate(operationId: string, status: number, body: unknown): void;
}

export function createOpenApiResponseValidator(
  contractUrl: URL,
): Promise<OpenApiResponseValidator>;

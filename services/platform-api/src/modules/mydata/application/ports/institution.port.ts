import type { InstitutionDataset } from '../../domain/institution-data.js';

export const INSTITUTION_PORT = Symbol('INSTITUTION_PORT');

export interface InstitutionPort {
  fetchDataset(externalCustomerId: string): Promise<InstitutionDataset>;
}

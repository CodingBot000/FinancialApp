import { Inject, Injectable } from '@nestjs/common';

import type { AuthenticatedPrincipal } from '../../../core/auth/authenticated-principal.js';
import {
  IDENTITY_REPOSITORY,
  type IdentityRepository,
} from '../../identity/application/ports/identity-repository.port.js';
import type { ConnectionView, SyncView } from '../domain/institution-data.js';
import { MyDataResourceNotFoundError } from '../domain/mydata-errors.js';
import {
  INSTITUTION_PORT,
  type InstitutionPort,
} from './ports/institution.port.js';
import {
  MYDATA_REPOSITORY,
  type MyDataRepository,
} from './ports/mydata-repository.port.js';
import {
  SENSITIVE_DATA_PORT,
  type SensitiveDataPort,
} from './ports/sensitive-data.port.js';

const SYNTHETIC_INSTITUTION = 'SYNTH_WEALTH_001';
const SYNTHETIC_CUSTOMER = 'SYNTH-CUSTOMER-A';

export class MyDataInputError extends Error {}

@Injectable()
export class MyDataService {
  constructor(
    @Inject(IDENTITY_REPOSITORY)
    private readonly identityRepository: IdentityRepository,
    @Inject(MYDATA_REPOSITORY)
    private readonly repository: MyDataRepository,
    @Inject(INSTITUTION_PORT)
    private readonly institution: InstitutionPort,
    @Inject(SENSITIVE_DATA_PORT)
    private readonly sensitiveData: SensitiveDataPort,
  ) {}

  async createConnection(
    principal: AuthenticatedPrincipal,
    institutionCode: string,
    consentExpiresAtText: string,
  ): Promise<ConnectionView> {
    if (institutionCode !== SYNTHETIC_INSTITUTION) {
      throw new MyDataInputError('Unsupported institution code.');
    }
    const consentExpiresAt = new Date(consentExpiresAtText);
    if (
      Number.isNaN(consentExpiresAt.getTime()) ||
      consentExpiresAt <= new Date()
    ) {
      throw new MyDataInputError('Consent expiration must be in the future.');
    }
    const user = await this.identityRepository.provisionFromOidc(
      principal.issuer,
      principal.subject,
    );
    const encrypted = this.sensitiveData.encrypt(SYNTHETIC_CUSTOMER);
    return this.repository.createConnection({
      userId: user.userId,
      institutionCode,
      externalCustomerIdHash: this.sensitiveData.lookupHash(SYNTHETIC_CUSTOMER),
      externalCustomerIdCiphertext: encrypted.ciphertext,
      encryptionKeyVersion: encrypted.keyVersion,
      maskedExternalCustomerId: 'SYNTH-****-A',
      consentExpiresAt,
    });
  }

  async listConnections(
    principal: AuthenticatedPrincipal,
  ): Promise<readonly ConnectionView[]> {
    const user = await this.identityRepository.provisionFromOidc(
      principal.issuer,
      principal.subject,
    );
    return this.repository.listConnections(user.userId);
  }

  async createSync(
    principal: AuthenticatedPrincipal,
    connectionId: string,
  ): Promise<{ readonly sync: SyncView; readonly created: boolean }> {
    const user = await this.identityRepository.provisionFromOidc(
      principal.issuer,
      principal.subject,
    );
    const result = await this.repository.createSync(user.userId, connectionId);
    if (result.created) {
      setImmediate(() => {
        void this.runSync(result.sync.syncId);
      });
    }
    return result;
  }

  async getSync(
    principal: AuthenticatedPrincipal,
    syncId: string,
  ): Promise<SyncView> {
    const user = await this.identityRepository.provisionFromOidc(
      principal.issuer,
      principal.subject,
    );
    const sync = await this.repository.getSync(user.userId, syncId);
    if (sync === undefined) throw new MyDataResourceNotFoundError();
    return sync;
  }

  async runSync(syncId: string): Promise<void> {
    const connection = await this.repository.beginSync(syncId);
    if (connection === undefined) return;

    try {
      const customerId = this.sensitiveData.decrypt(
        connection.ciphertext,
        connection.encryptionKeyVersion,
      );
      const dataset = await this.institution.fetchDataset(customerId);
      await this.repository.completeSync(syncId, dataset);
    } catch {
      await this.repository.rescheduleOrFailSync(
        syncId,
        'MYDATA_INSTITUTION_SYNC_FAILED',
        Number.parseInt(process.env.MYDATA_SYNC_MAX_ATTEMPTS ?? '3', 10),
        new Date(
          Date.now() +
            Number.parseInt(
              process.env.MYDATA_SYNC_RETRY_BACKOFF_MS ?? '5000',
              10,
            ),
        ),
      );
    }
  }
}

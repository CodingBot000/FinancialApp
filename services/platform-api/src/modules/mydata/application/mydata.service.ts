import { Inject, Injectable, Optional } from '@nestjs/common';

import type { AuthenticatedPrincipal } from '../../../core/auth/authenticated-principal.js';
import {
  IDENTITY_REPOSITORY,
  type IdentityRepository,
} from '../../identity/application/ports/identity-repository.port.js';
import { AuditService } from '../../audit/audit.service.js';
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
    @Optional()
    @Inject(AuditService)
    private readonly audit?: AuditService,
  ) {}

  async createConnection(
    principal: AuthenticatedPrincipal,
    institutionCode: string,
    consentExpiresAtText: string,
    traceId = 'unavailable',
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
    const connection = await this.repository.createConnection({
      userId: user.userId,
      institutionCode,
      externalCustomerIdHash: this.sensitiveData.lookupHash(SYNTHETIC_CUSTOMER),
      externalCustomerIdCiphertext: encrypted.ciphertext,
      encryptionKeyVersion: encrypted.keyVersion,
      maskedExternalCustomerId: 'SYNTH-****-A',
      consentExpiresAt,
    });
    await this.audit?.record({
      userId: user.userId,
      action: 'MYDATA_CONNECTION_CREATED',
      resourceType: 'MYDATA_CONNECTION',
      resourceId: connection.connectionId,
      traceId,
      metadata: { institutionCode, syntheticData: true },
    });
    return connection;
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
    traceId = 'unavailable',
  ): Promise<{ readonly sync: SyncView; readonly created: boolean }> {
    const user = await this.identityRepository.provisionFromOidc(
      principal.issuer,
      principal.subject,
    );
    const result = await this.repository.createSync(user.userId, connectionId);
    if (result.created) {
      setImmediate(() => {
        void this.runSync(result.sync.syncId, traceId);
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

  async runSync(syncId: string, traceId = `sync:${syncId}`): Promise<void> {
    const connection = await this.repository.beginSync(syncId);
    if (connection === undefined) return;

    try {
      await this.audit?.record({
        userId: connection.userId,
        action: 'MYDATA_SYNC_STARTED',
        resourceType: 'MYDATA_SYNC',
        resourceId: syncId,
        traceId,
        metadata: { status: 'FETCHING', syntheticData: true },
      });
      const customerId = this.sensitiveData.decrypt(
        connection.ciphertext,
        connection.encryptionKeyVersion,
      );
      const dataset = await this.institution.fetchDataset(customerId);
      await this.repository.completeSync(syncId, dataset);
      await this.audit?.record({
        userId: connection.userId,
        action: 'MYDATA_SYNC_COMPLETED',
        resourceType: 'MYDATA_SYNC',
        resourceId: syncId,
        traceId,
        metadata: { status: 'COMPLETED', syntheticData: true },
      });
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

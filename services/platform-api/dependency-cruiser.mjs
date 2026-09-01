/** @type {import('dependency-cruiser').IConfiguration} */
export default {
  forbidden: [
    {
      name: 'finapp-no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'finapp-domain-is-framework-free',
      severity: 'error',
      from: { path: '/domain/' },
      to: {
        path: '(^@nestjs/|^@fastify/|^fastify$|^drizzle-orm|/api/|/infrastructure/)',
      },
    },
    {
      name: 'finapp-application-does-not-import-adapters',
      severity: 'error',
      from: { path: '/application/' },
      to: { path: '(/api/|/infrastructure/)' },
    },
    {
      name: 'finapp-api-does-not-import-infrastructure',
      severity: 'error',
      from: { path: '/api/' },
      to: { path: '/infrastructure/' },
    },
    {
      name: 'finapp-platform-does-not-import-simulator-source',
      severity: 'error',
      from: {},
      to: { path: 'services/institution-simulator' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      mainFields: ['module', 'main', 'types', 'typings'],
    },
    tsConfig: { fileName: 'tsconfig.json' },
  },
};

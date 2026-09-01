const baseUrl = (
  process.env.INSTITUTION_SIMULATOR_BASE_URL ?? 'http://127.0.0.1:8082'
).replace(/\/$/, '');
const response = await fetch(`${baseUrl}/sim/v1/admin/reset`, {
  method: 'POST',
});
const body = await response.json();
if (
  !response.ok ||
  body.scenarioMode !== 'NORMAL' ||
  body.syntheticData !== true
) {
  throw new Error(`Local simulator reset failed with HTTP ${response.status}.`);
}
process.stdout.write(
  `${JSON.stringify({ datasetVersion: body.datasetVersion, localReset: true, scenarioMode: body.scenarioMode, syntheticData: true })}\n`,
);

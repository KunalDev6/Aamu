/** One demo flag; CLINIC_DEMO is retired and intentionally ignored. */
export function clinicDemoMode(environment = process.env) {
  if (environment.DEMO_MODE === undefined) return true;
  if (environment.DEMO_MODE === 'true') return true;
  if (environment.DEMO_MODE === 'false') return false;
  throw Error('DEMO_MODE must be true or false');
}

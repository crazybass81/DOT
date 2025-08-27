#!/usr/bin/env node
const { CMAXCoordinator } = require('cmax/lib/coordinator');
const coordinator = new CMAXCoordinator();

async function main() {
  const filePath = process.env.FILE_PATH || process.argv[2];
  await coordinator.afterFileEdit(filePath);
}

main().catch(console.error);
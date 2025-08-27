#!/usr/bin/env node
const { CMAXCoordinator } = require('cmax/lib/coordinator');
const coordinator = new CMAXCoordinator();

async function main() {
  const taskId = process.env.TASK_ID || process.argv[2];
  await coordinator.afterTask(taskId);
}

main().catch(console.error);
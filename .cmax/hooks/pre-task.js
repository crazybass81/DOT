#!/usr/bin/env node
const { CMAXCoordinator } = require('cmax/lib/coordinator');
const coordinator = new CMAXCoordinator();

async function main() {
  const taskDescription = process.env.TASK_DESCRIPTION || process.argv.slice(2).join(' ');
  await coordinator.beforeTask(taskDescription);
}

main().catch(console.error);
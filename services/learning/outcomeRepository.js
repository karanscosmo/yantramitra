const feedbackEngine = require('./feedbackEngine');

function queryOutcomes(filters = {}) {
  const results = feedbackEngine.getAllFeedback(filters);

  const aggregated = {
    totalOutcomes: results.length,
    outcomes: results,
    successCount: results.filter(r => r.outcome === 'success').length,
    failureCount: results.filter(r => r.outcome === 'failure').length,
    averageRating: results.length > 0
      ? Math.round((results.reduce((s, r) => s + (r.operatorRating || 0), 0) / results.length) * 10) / 10
      : 0,
    averageDowntimeHours: results.length > 0
      ? Math.round((results.reduce((s, r) => s + (r.actualDowntimeHours || 0), 0) / results.length) * 10) / 10
      : 0,
    averageRepairDurationHours: results.length > 0
      ? Math.round((results.reduce((s, r) => s + (r.actualRepairDurationHours || 0), 0) / results.length) * 10) / 10
      : 0,
    averageCost: results.length > 0
      ? Math.round(results.reduce((s, r) => s + (r.actualCost || 0), 0) / results.length)
      : 0,
    sparePartsUsed: [...new Set(results.flatMap(r => r.sparePartsUsed))]
  };

  return aggregated;
}

function getMachineOutcomeSummary(machineId) {
  const machineFeedbacks = feedbackEngine.getAllFeedback({ machineId });
  if (machineFeedbacks.length === 0) return null;

  const successCount = machineFeedbacks.filter(f => f.outcome === 'success').length;
  const failureCount = machineFeedbacks.filter(f => f.outcome === 'failure').length;

  return {
    machineId,
    machineName: machineFeedbacks[0].machineName,
    totalWorkflows: machineFeedbacks.length,
    successCount,
    failureCount,
    successRate: Math.round((successCount / machineFeedbacks.length) * 1000) / 10,
    averageDowntimeHours: Math.round((machineFeedbacks.reduce((s, f) => s + (f.actualDowntimeHours || 0), 0) / machineFeedbacks.length) * 10) / 10,
    averageRepairDurationHours: Math.round((machineFeedbacks.reduce((s, f) => s + (f.actualRepairDurationHours || 0), 0) / machineFeedbacks.length) * 10) / 10,
    averageCost: Math.round(machineFeedbacks.reduce((s, f) => s + (f.actualCost || 0), 0) / machineFeedbacks.length),
    averageRating: Math.round((machineFeedbacks.reduce((s, f) => s + (f.operatorRating || 0), 0) / machineFeedbacks.length) * 10) / 10,
    repeatedSpareParts: aggregateRepeatedSpareParts(machineFeedbacks),
    feedbackHistory: machineFeedbacks
  };
}

function getWorkflowOutcomeSummary(workflowId) {
  const workflowFeedbacks = feedbackEngine.getAllFeedback({ workflowId });
  if (workflowFeedbacks.length === 0) return null;

  return {
    workflowId,
    totalExecutions: workflowFeedbacks.length,
    successCount: workflowFeedbacks.filter(f => f.outcome === 'success').length,
    failureCount: workflowFeedbacks.filter(f => f.outcome === 'failure').length,
    successRate: Math.round((workflowFeedbacks.filter(f => f.outcome === 'success').length / workflowFeedbacks.length) * 1000) / 10,
    averageDuration: Math.round((workflowFeedbacks.reduce((s, f) => s + (f.actualRepairDurationHours || 0), 0) / workflowFeedbacks.length) * 10) / 10,
    feedbackHistory: workflowFeedbacks
  };
}

function getPlantOutcomeSummary(plantId) {
  const plantFeedbacks = feedbackEngine.getAllFeedback({ plantId });
  if (plantFeedbacks.length === 0) return null;

  const machines = [...new Set(plantFeedbacks.map(f => f.machineId).filter(Boolean))];

  return {
    plantId,
    plantName: plantFeedbacks[0].plantName,
    totalWorkflows: plantFeedbacks.length,
    machineCount: machines.length,
    successCount: plantFeedbacks.filter(f => f.outcome === 'success').length,
    failureCount: plantFeedbacks.filter(f => f.outcome === 'failure').length,
    successRate: Math.round((plantFeedbacks.filter(f => f.outcome === 'success').length / plantFeedbacks.length) * 1000) / 10,
    averageDowntimeHours: Math.round((plantFeedbacks.reduce((s, f) => s + (f.actualDowntimeHours || 0), 0) / plantFeedbacks.length) * 10) / 10,
    averageCost: Math.round(plantFeedbacks.reduce((s, f) => s + (f.actualCost || 0), 0) / plantFeedbacks.length)
  };
}

function aggregateRepeatedSpareParts(feedbacks) {
  const partCount = {};
  feedbacks.forEach(f => {
    (f.sparePartsUsed || []).forEach(part => {
      partCount[part] = (partCount[part] || 0) + 1;
    });
  });
  return Object.entries(partCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

module.exports = {
  queryOutcomes,
  getMachineOutcomeSummary,
  getWorkflowOutcomeSummary,
  getPlantOutcomeSummary
};

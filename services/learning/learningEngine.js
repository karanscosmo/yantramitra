const feedbackEngine = require('./feedbackEngine');
const outcomeRepository = require('./outcomeRepository');

function analyzeRecurringFailures() {
  const allFeedback = feedbackEngine.getAllFeedback();
  const failures = allFeedback.filter(f => f.outcome === 'failure');

  const machineFailureCount = {};
  failures.forEach(f => {
    if (f.machineId) {
      machineFailureCount[f.machineId] = machineFailureCount[f.machineId] || { count: 0, name: f.machineName, failures: [] };
      machineFailureCount[f.machineId].count++;
      machineFailureCount[f.machineId].failures.push({
        workflowId: f.workflowId,
        actualFailure: f.actualFailure,
        date: f.createdAt
      });
    }
  });

  return Object.entries(machineFailureCount)
    .map(([machineId, data]) => ({
      machineId,
      machineName: data.name,
      failureCount: data.count,
      failureRate: allFeedback.filter(f => f.machineId === machineId).length > 0
        ? Math.round((data.count / allFeedback.filter(f => f.machineId === machineId).length) * 1000) / 10
        : 0,
      failures: data.failures.sort((a, b) => new Date(b.date) - new Date(a.date))
    }))
    .sort((a, b) => b.failureCount - a.failureCount);
}

function analyzeIneffectiveProcedures() {
  const allFeedback = feedbackEngine.getAllFeedback();

  const workflowStats = {};
  allFeedback.forEach(f => {
    const key = f.workflowTemplateId || f.workflowId;
    if (!key) return;
    workflowStats[key] = workflowStats[key] || { workflowId: key, total: 0, successes: 0, failures: 0, avgDuration: 0, totalDuration: 0, avgCost: 0, totalCost: 0, avgRating: 0, totalRating: 0 };
    workflowStats[key].total++;
    if (f.outcome === 'success') workflowStats[key].successes++;
    else workflowStats[key].failures++;
    workflowStats[key].totalDuration += f.actualRepairDurationHours || 0;
    workflowStats[key].totalCost += f.actualCost || 0;
    workflowStats[key].totalRating += f.operatorRating || 0;
  });

  return Object.values(workflowStats)
    .map(w => ({
      workflowId: w.workflowId,
      totalExecutions: w.total,
      successRate: Math.round((w.successes / w.total) * 1000) / 10,
      failureRate: Math.round((w.failures / w.total) * 1000) / 10,
      averageDurationHours: Math.round((w.totalDuration / w.total) * 10) / 10,
      averageCost: Math.round(w.totalCost / w.total),
      averageRating: Math.round((w.totalRating / w.total) * 10) / 10,
      effectiveness: w.successes / w.total > 0.8 ? 'HIGH' : w.successes / w.total > 0.5 ? 'MEDIUM' : 'LOW'
    }))
    .sort((a, b) => a.successRate - b.successRate);
}

function analyzeRepeatedSparePartFailures() {
  const allFeedback = feedbackEngine.getAllFeedback();

  const partStats = {};
  allFeedback.forEach(f => {
    (f.sparePartsUsed || []).forEach(part => {
      partStats[part] = partStats[part] || { partName: part, usedCount: 0, failureCount: 0 };
      partStats[part].usedCount++;
      if (f.outcome === 'failure') partStats[part].failureCount++;
    });
  });

  return Object.values(partStats)
    .map(p => ({
      partName: p.partName,
      usedCount: p.usedCount,
      failureCount: p.failureCount,
      failureRate: p.usedCount > 0 ? Math.round((p.failureCount / p.usedCount) * 1000) / 10 : 0,
      reliability: p.failureCount === 0 ? 'HIGH' : p.failureRate < 25 ? 'MEDIUM' : 'LOW'
    }))
    .filter(p => p.usedCount > 0)
    .sort((a, b) => b.failureRate - a.failureRate);
}

function analyzeMTBFImprovement() {
  const allFeedback = feedbackEngine.getAllFeedback();

  const machineMTBF = {};
  allFeedback.forEach(f => {
    if (!f.machineId) return;
    machineMTBF[f.machineId] = machineMTBF[f.machineId] || { machineId: f.machineId, machineName: f.machineName, events: [] };
    machineMTBF[f.machineId].events.push({
      date: f.createdAt,
      outcome: f.outcome,
      downtime: f.actualDowntimeHours || 0
    });
  });

  return Object.values(machineMTBF).map(m => {
    m.events.sort((a, b) => new Date(a.date) - new Date(b.date));
    const totalOperatingHours = m.events.reduce((s, e) => s + (e.downtime || 0), 0);
    const mtbf = m.events.length > 0
      ? Math.round((totalOperatingHours / m.events.length) * 10) / 10
      : 0;
    return {
      machineId: m.machineId,
      machineName: m.machineName,
      totalEvents: m.events.length,
      estimatedMTBFHours: mtbf,
      failureEvents: m.events.filter(e => e.outcome === 'failure').length,
      improvementPotential: mtbf > 0 ? Math.round((1 - (m.events.filter(e => e.outcome === 'failure').length / m.events.length)) * 100) : 0
    };
  }).sort((a, b) => a.estimatedMTBFHours - b.estimatedMTBFHours);
}

function generateMaintenanceIntervalRecommendations() {
  const allFeedback = feedbackEngine.getAllFeedback();

  const machineIntervals = {};
  allFeedback.forEach(f => {
    if (!f.machineId) return;
    machineIntervals[f.machineId] = machineIntervals[f.machineId] || { machineId: f.machineId, machineName: f.machineName, events: [] };
    machineIntervals[f.machineId].events.push({
      date: f.createdAt,
      outcome: f.outcome,
      downtime: f.actualDowntimeHours || 0,
      repairDuration: f.actualRepairDurationHours || 0
    });
  });

  return Object.values(machineIntervals).map(m => {
    m.events.sort((a, b) => new Date(a.date) - new Date(b.date));
    const avgInterval = calculateAvgInterval(m.events);
    const failureEvents = m.events.filter(e => e.outcome === 'failure');
    const avgDowntimeOnFailure = failureEvents.length > 0
      ? Math.round((failureEvents.reduce((s, e) => s + e.downtime, 0) / failureEvents.length) * 10) / 10
      : 0;

    let recommendedIntervalDays = 90;
    if (avgInterval > 0) {
      if (failureEvents.length > 0 && avgDowntimeOnFailure > 4) {
        recommendedIntervalDays = Math.max(30, Math.round(avgInterval * 0.7));
      } else if (failureEvents.length === 0) {
        recommendedIntervalDays = Math.round(avgInterval * 1.2);
      }
    }

    return {
      machineId: m.machineId,
      machineName: m.machineName,
      currentEstimatedIntervalDays: avgInterval > 0 ? Math.round(avgInterval) : 90,
      recommendedIntervalDays,
      reason: failureEvents.length > 0 && avgDowntimeOnFailure > 4
        ? 'Reduce interval due to recurring failures with high downtime impact'
        : failureEvents.length === 0
          ? 'Extend interval — no failures recorded in observation period'
          : 'Maintain current interval — moderate performance observed',
      failureEventCount: failureEvents.length,
      avgDowntimeOnFailureHours: avgDowntimeOnFailure
    };
  });
}

function calculateAvgInterval(events) {
  if (events.length < 2) return 0;
  let totalDays = 0;
  let intervals = 0;
  for (let i = 1; i < events.length; i++) {
    const d1 = new Date(events[i - 1].date);
    const d2 = new Date(events[i].date);
    const days = (d2.getTime() - d1.getTime()) / (1000 * 3600 * 24);
    if (days > 0 && days < 365) {
      totalDays += days;
      intervals++;
    }
  }
  return intervals > 0 ? totalDays / intervals : 0;
}

function generateLearningInsights() {
  return {
    recurringFailures: analyzeRecurringFailures(),
    ineffectiveProcedures: analyzeIneffectiveProcedures(),
    repeatedSparePartFailures: analyzeRepeatedSparePartFailures(),
    mtbfImprovement: analyzeMTBFImprovement(),
    maintenanceIntervalRecommendations: generateMaintenanceIntervalRecommendations(),
    analyzedAt: new Date().toISOString()
  };
}

module.exports = {
  analyzeRecurringFailures,
  analyzeIneffectiveProcedures,
  analyzeRepeatedSparePartFailures,
  analyzeMTBFImprovement,
  generateMaintenanceIntervalRecommendations,
  generateLearningInsights
};

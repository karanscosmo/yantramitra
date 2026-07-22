const feedbackEngine = require('./feedbackEngine');

function evaluateRecommendationAccuracy() {
  const allFeedback = feedbackEngine.getAllFeedback();
  const withPredictions = allFeedback.filter(f =>
    f.predictedDowntimeHours != null && f.actualDowntimeHours != null &&
    f.predictedCost != null && f.actualCost != null
  );

  if (withPredictions.length === 0) {
    return { accuracy: 0, drift: 0, samples: 0 };
  }

  let totalAccuracy = 0;
  let totalDowntimeDrift = 0;
  let totalCostDrift = 0;
  let totalDurationDrift = 0;

  withPredictions.forEach(f => {
    const downtimeAccuracy = 1 - Math.min(1, Math.abs(f.predictedDowntimeHours - f.actualDowntimeHours) / Math.max(f.predictedDowntimeHours, 0.1));
    const costAccuracy = 1 - Math.min(1, Math.abs(f.predictedCost - f.actualCost) / Math.max(f.predictedCost, 0.1));
    const durationAccuracy = 1 - Math.min(1, Math.abs((f.predictedRepairDurationHours || 0) - (f.actualRepairDurationHours || 0)) / Math.max(f.predictedRepairDurationHours || 0.1, 0.1));

    totalAccuracy += (downtimeAccuracy + costAccuracy + durationAccuracy) / 3;
    totalDowntimeDrift += f.actualDowntimeHours - f.predictedDowntimeHours;
    totalCostDrift += f.actualCost - f.predictedCost;
    totalDurationDrift += (f.actualRepairDurationHours || 0) - (f.predictedRepairDurationHours || 0);
  });

  const n = withPredictions.length;
  return {
    accuracy: Math.round((totalAccuracy / n) * 1000) / 10,
    predictionDrift: {
      downtimeHours: Math.round((totalDowntimeDrift / n) * 10) / 10,
      cost: Math.round(totalCostDrift / n),
      repairDurationHours: Math.round((totalDurationDrift / n) * 10) / 10
    },
    samples: n,
    assessedAt: new Date().toISOString()
  };
}

function evaluateWorkflowEffectiveness() {
  const allFeedback = feedbackEngine.getAllFeedback();

  const workflowGroups = {};
  allFeedback.forEach(f => {
    const key = f.workflowTemplateId || f.workflowId;
    if (!key) return;
    workflowGroups[key] = workflowGroups[key] || [];
    workflowGroups[key].push(f);
  });

  const results = Object.entries(workflowGroups).map(([workflowId, entries]) => {
    const successes = entries.filter(e => e.outcome === 'success').length;
    const accepted = entries.filter(e => e.recommendationAccepted).length;
    return {
      workflowId,
      totalExecutions: entries.length,
      successRate: Math.round((successes / entries.length) * 1000) / 10,
      recommendationAcceptanceRate: Math.round((accepted / entries.length) * 1000) / 10,
      averageRating: Math.round((entries.reduce((s, e) => s + (e.operatorRating || 0), 0) / entries.length) * 10) / 10,
      averageDurationHours: Math.round((entries.reduce((s, e) => s + (e.actualRepairDurationHours || 0), 0) / entries.length) * 10) / 10,
      effectiveness: successes / entries.length > 0.8 ? 'HIGH' : successes / entries.length > 0.5 ? 'MEDIUM' : 'LOW'
    };
  });

  const overallSuccesses = allFeedback.filter(f => f.outcome === 'success').length;
  const overallAccepted = allFeedback.filter(f => f.recommendationAccepted).length;

  return {
    workflows: results.sort((a, b) => a.successRate - b.successRate),
    overall: {
      totalWorkflows: allFeedback.length,
      overallSuccessRate: allFeedback.length > 0 ? Math.round((overallSuccesses / allFeedback.length) * 1000) / 10 : 0,
      overallAcceptanceRate: allFeedback.length > 0 ? Math.round((overallAccepted / allFeedback.length) * 1000) / 10 : 0,
      averageRating: allFeedback.length > 0
        ? Math.round((allFeedback.reduce((s, f) => s + (f.operatorRating || 0), 0) / allFeedback.length) * 10) / 10
        : 0
    }
  };
}

function evaluateMaintenanceEffectiveness() {
  const allFeedback = feedbackEngine.getAllFeedback();
  const withPredictions = allFeedback.filter(f => f.predictedDowntimeHours != null);

  if (allFeedback.length === 0) {
    return { effectiveness: 0, samples: 0 };
  }

  const successes = allFeedback.filter(f => f.outcome === 'success').length;
  const withCostData = allFeedback.filter(f => f.predictedCost != null && f.actualCost != null);

  let costEfficiency = 0;
  if (withCostData.length > 0) {
    const costRatios = withCostData.map(f => f.actualCost / Math.max(f.predictedCost, 0.01));
    costEfficiency = Math.round((1 - (costRatios.reduce((s, r) => s + r, 0) / costRatios.length - 1)) * 100);
  }

  const downtimeAccuracy = withPredictions.length > 0
    ? withPredictions.reduce((s, f) => s + (1 - Math.min(1, Math.abs(f.predictedDowntimeHours - f.actualDowntimeHours) / Math.max(f.predictedDowntimeHours, 0.1))), 0) / withPredictions.length
    : 0;

  const effectiveness = Math.round(((successes / allFeedback.length) * 0.5 + Math.max(0, costEfficiency * 0.01) * 0.3 + downtimeAccuracy * 0.2) * 1000) / 10;

  return {
    maintenanceEffectiveness: effectiveness,
    overallSuccessRate: Math.round((successes / allFeedback.length) * 1000) / 10,
    costEfficiency: Math.round(costEfficiency * 10) / 10,
    predictionDowntimeAccuracy: Math.round(downtimeAccuracy * 1000) / 10,
    samples: allFeedback.length
  };
}

module.exports = {
  evaluateRecommendationAccuracy,
  evaluateWorkflowEffectiveness,
  evaluateMaintenanceEffectiveness
};

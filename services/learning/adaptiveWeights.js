const feedbackEngine = require('./feedbackEngine');
const recommendationEvaluator = require('./recommendationEvaluator');

const DEFAULT_WEIGHTS = {
  safety: 0.35,
  reliability: 0.25,
  cost: 0.15,
  downtime: 0.12,
  productionImpact: 0.08,
  energyImpact: 0.05
};

let tunedWeights = { ...DEFAULT_WEIGHTS };
let lastTunedAt = null;

function tuneWeightsFromOutcomes() {
  const allFeedback = feedbackEngine.getAllFeedback();
  const withCostData = allFeedback.filter(f => f.actualCost != null && f.predictedCost != null);

  if (allFeedback.length < 3) {
    return { tuned: false, reason: 'Insufficient feedback data (< 3 samples)', weights: tunedWeights };
  }

  const failures = allFeedback.filter(f => f.outcome === 'failure');
  const costOverruns = withCostData.filter(f => f.actualCost > f.predictedCost * 1.2);
  const durationOverruns = allFeedback.filter(f =>
    f.actualRepairDurationHours != null && f.predictedRepairDurationHours != null &&
    f.actualRepairDurationHours > f.predictedRepairDurationHours * 1.3
  );
  const safetyIssues = allFeedback.filter(f =>
    f.technicianNotes && /safety|risk|hazard|danger/i.test(f.technicianNotes)
  );

  const failureRate = allFeedback.length > 0 ? failures.length / allFeedback.length : 0;
  const costOverrunRate = withCostData.length > 0 ? costOverruns.length / withCostData.length : 0;
  const durationOverrunRate = allFeedback.length > 0 ? durationOverruns.length / allFeedback.length : 0;
  const safetyIncidentRate = allFeedback.length > 0 ? safetyIssues.length / allFeedback.length : 0;

  const newWeights = { ...DEFAULT_WEIGHTS };

  if (failureRate > 0.3) {
    newWeights.reliability = Math.min(0.45, DEFAULT_WEIGHTS.reliability + 0.10);
    newWeights.safety = Math.max(0.25, DEFAULT_WEIGHTS.safety - 0.05);
  }

  if (costOverrunRate > 0.3) {
    newWeights.cost = Math.min(0.30, DEFAULT_WEIGHTS.cost + 0.10);
    newWeights.downtime = Math.max(0.08, DEFAULT_WEIGHTS.downtime - 0.03);
  }

  if (durationOverrunRate > 0.3) {
    newWeights.downtime = Math.min(0.25, newWeights.downtime + 0.08);
    newWeights.productionImpact = Math.max(0.05, DEFAULT_WEIGHTS.productionImpact + 0.02);
  }

  if (safetyIncidentRate > 0.1) {
    newWeights.safety = Math.min(0.50, newWeights.safety + 0.10);
    newWeights.cost = Math.max(0.08, newWeights.cost - 0.03);
  }

  const total = Object.values(newWeights).reduce((s, v) => s + v, 0);
  if (Math.abs(total - 1.0) > 0.01) {
    const scale = 1.0 / total;
    Object.keys(newWeights).forEach(k => { newWeights[k] = Math.round(newWeights[k] * scale * 100) / 100; });
  }

  Object.keys(newWeights).forEach(k => {
    newWeights[k] = Math.round(newWeights[k] * 100) / 100;
  });

  tunedWeights = newWeights;
  lastTunedAt = new Date().toISOString();

  return {
    tuned: true,
    previousWeights: { ...DEFAULT_WEIGHTS },
    tunedWeights,
    tuningRationale: {
      failureRate: Math.round(failureRate * 1000) / 10 + '%',
      costOverrunRate: Math.round(costOverrunRate * 1000) / 10 + '%',
      durationOverrunRate: Math.round(durationOverrunRate * 1000) / 10 + '%',
      safetyIncidentRate: Math.round(safetyIncidentRate * 1000) / 10 + '%',
      adjustments: buildAdjustmentDescriptions(newWeights, DEFAULT_WEIGHTS)
    },
    lastTunedAt
  };
}

function buildAdjustmentDescriptions(newW, defaultW) {
  const descs = [];
  Object.keys(newW).forEach(k => {
    const diff = Math.round((newW[k] - defaultW[k]) * 100);
    if (diff > 0) descs.push(`Increased ${k} weight by ${diff}% based on outcome evidence`);
    else if (diff < 0) descs.push(`Decreased ${k} weight by ${Math.abs(diff)}% based on outcome evidence`);
  });
  return descs;
}

function getTunedWeights() {
  return {
    weights: tunedWeights,
    usesDefault: JSON.stringify(tunedWeights) === JSON.stringify(DEFAULT_WEIGHTS),
    lastTunedAt
  };
}

function resetWeights() {
  tunedWeights = { ...DEFAULT_WEIGHTS };
  lastTunedAt = null;
  return { message: 'Decision weights reset to defaults', weights: tunedWeights };
}

module.exports = {
  tuneWeightsFromOutcomes,
  getTunedWeights,
  resetWeights,
  DEFAULT_WEIGHTS
};

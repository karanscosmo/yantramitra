const feedbackEngine = require('./feedbackEngine');
const learningEngine = require('./learningEngine');
const recommendationEvaluator = require('./recommendationEvaluator');

function generateImprovementKPIs() {
  const allFeedback = feedbackEngine.getAllFeedback();
  const recAccuracy = recommendationEvaluator.evaluateRecommendationAccuracy();
  const workflowEffectiveness = recommendationEvaluator.evaluateWorkflowEffectiveness();
  const maintEffectiveness = recommendationEvaluator.evaluateMaintenanceEffectiveness();
  const recurringFailures = learningEngine.analyzeRecurringFailures();
  const mtbfAnalysis = learningEngine.analyzeMTBFImprovement();

  const previousFeedback = allFeedback.slice(0, Math.ceil(allFeedback.length / 2));
  const recentFeedback = allFeedback.slice(Math.ceil(allFeedback.length / 2));

  function calcSuccessRate(arr) {
    return arr.length > 0 ? Math.round((arr.filter(f => f.outcome === 'success').length / arr.length) * 1000) / 10 : 0;
  }

  const previousSuccessRate = calcSuccessRate(previousFeedback);
  const recentSuccessRate = calcSuccessRate(recentFeedback);
  const improvementTrend = previousSuccessRate > 0
    ? Math.round((recentSuccessRate - previousSuccessRate) * 10) / 10
    : 0;

  function calcAvgDowntime(arr) {
    return arr.length > 0 ? Math.round(arr.reduce((s, f) => s + (f.actualDowntimeHours || 0), 0) / arr.length * 10) / 10 : 0;
  }

  const prevDowntime = calcAvgDowntime(previousFeedback);
  const recentDowntime = calcAvgDowntime(recentFeedback);
  const downtimeReduction = prevDowntime > 0
    ? Math.round(((prevDowntime - recentDowntime) / prevDowntime) * 1000) / 10
    : 0;

  const avgMTBFBefore = mtbfAnalysis.length > 0
    ? Math.round(mtbfAnalysis.reduce((s, m) => s + m.estimatedMTBFHours, 0) / mtbfAnalysis.length)
    : 0;

  const totalFeedbackCount = allFeedback.length;

  const learningConfidence = Math.min(100, Math.round(
    (totalFeedbackCount / 50) * 40 +
    (recAccuracy.accuracy / 100) * 30 +
    (maintEffectiveness.maintenanceEffectiveness / 100) * 30
  ));

  return {
    generatedAt: new Date().toISOString(),
    kpis: {
      recommendationAccuracy: {
        value: recAccuracy.accuracy,
        unit: '%',
        trend: recAccuracy.accuracy > 70 ? 'IMPROVING' : recAccuracy.accuracy > 50 ? 'STABLE' : 'DECLINING',
        description: 'Accuracy of predicted vs actual downtime, cost, and duration'
      },
      workflowSuccessRate: {
        value: workflowEffectiveness.overall.overallSuccessRate,
        unit: '%',
        trend: workflowEffectiveness.overall.overallSuccessRate > 80 ? 'IMPROVING' : 'STABLE',
        description: 'Percentage of workflows completed successfully'
      },
      downtimeReduction: {
        value: downtimeReduction,
        unit: '%',
        trend: downtimeReduction > 0 ? 'IMPROVING' : downtimeReduction < 0 ? 'DECLINING' : 'STABLE',
        description: 'Change in average downtime between earlier and recent outcomes'
      },
      mtbfImprovement: {
        value: avgMTBFBefore,
        unit: 'hours',
        trend: avgMTBFBefore > 400 ? 'IMPROVING' : 'STABLE',
        description: 'Estimated Mean Time Between Failures across all machines'
      },
      mttrImprovement: {
        value: maintEffectiveness.predictionDowntimeAccuracy,
        unit: '%',
        trend: maintEffectiveness.predictionDowntimeAccuracy > 60 ? 'IMPROVING' : 'STABLE',
        description: 'Mean Time To Repair accuracy — how well predicted duration matches actual'
      },
      maintenanceEffectiveness: {
        value: maintEffectiveness.maintenanceEffectiveness,
        unit: '%',
        trend: maintEffectiveness.maintenanceEffectiveness > 70 ? 'IMPROVING' : 'STABLE',
        description: 'Composite score of success rate, cost efficiency, and prediction accuracy'
      },
      fleetImprovementTrend: {
        value: improvementTrend,
        unit: 'pp',
        trend: improvementTrend > 0 ? 'IMPROVING' : improvementTrend < 0 ? 'DECLINING' : 'STABLE',
        description: 'Success rate change between first half and second half of outcomes'
      },
      learningConfidence: {
        value: learningConfidence,
        unit: '%',
        trend: learningConfidence > 70 ? 'HIGH' : learningConfidence > 40 ? 'MEDIUM' : 'LOW',
        description: 'Confidence in learning insights based on sample size, accuracy, and effectiveness'
      }
    },
    totalFeedbackSamples: totalFeedbackCount,
    trending: Object.entries({
      recommendationAccuracy: recAccuracy.accuracy,
      workflowSuccessRate: workflowEffectiveness.overall.overallSuccessRate,
      downtimeReduction,
      maintenanceEffectiveness: maintEffectiveness.maintenanceEffectiveness,
      learningConfidence
    }).reduce((acc, [key, val]) => {
      acc[key] = val;
      return acc;
    }, {})
  };
}

module.exports = {
  generateImprovementKPIs
};

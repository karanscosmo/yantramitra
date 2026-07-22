const feedbackEngine = require('./feedbackEngine');
const outcomeRepository = require('./outcomeRepository');
const learningEngine = require('./learningEngine');
const recommendationEvaluator = require('./recommendationEvaluator');
const continuousImprovement = require('./continuousImprovement');
const adaptiveWeights = require('./adaptiveWeights');

function getLearningSystemStatus() {
  const feedbackStats = feedbackEngine.getFeedbackStats();
  return {
    systemStatus: 'ACTIVE_READY',
    learningMode: 'CONTINUOUS_IMPROVEMENT',
    feedbackEntries: feedbackStats.totalFeedbackEntries,
    successfulOutcomes: feedbackStats.successfulOutcomes,
    failedOutcomes: feedbackStats.failedOutcomes,
    insightsGenerated: true,
    weightTuningEnabled: true,
    capabilities: [
      'Post-Workflow Feedback Capture',
      'Historical Outcome Repository',
      'Recurring Failure Analysis',
      'Ineffective Procedure Detection',
      'Spare Part Reliability Tracking',
      'MTBF Improvement Analysis',
      'Maintenance Interval Recommendations',
      'Recommendation Accuracy Evaluation',
      'Workflow Effectiveness Assessment',
      'Continuous Improvement KPIs',
      'Adaptive Decision Weight Tuning'
    ]
  };
}

module.exports = {
  feedbackEngine,
  outcomeRepository,
  learningEngine,
  recommendationEvaluator,
  continuousImprovement,
  adaptiveWeights,
  getLearningSystemStatus
};

const assert = require('assert');
const learningService = require('../services/learning');

async function runLearningTests() {
  console.log('==================================================');
  console.log('YantraMitra Continuous Learning Test Suite');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${name}`);
      console.error(`         Error: ${err.message}`);
      failed++;
    }
  }

  await test('1. Learning System Status & Capability Check', () => {
    const status = learningService.getLearningSystemStatus();
    assert.strictEqual(status.systemStatus, 'ACTIVE_READY');
    assert(status.feedbackEntries > 0, 'Must have seed feedback entries');
    assert(status.capabilities.length >= 10, 'Must expose ≥ 10 capabilities');
  });

  await test('2. Feedback Engine Captures and Retrieves Feedback', () => {
    const allFeedback = learningService.feedbackEngine.getAllFeedback();
    assert(allFeedback.length >= 5, 'Must have at least 5 seed feedback entries');
    assert(allFeedback[0].id, 'Feedback must have an ID');
    assert(allFeedback[0].createdAt, 'Feedback must have createdAt');

    const byId = learningService.feedbackEngine.getFeedbackById(allFeedback[0].id);
    assert(byId, 'Must retrieve feedback by ID');
    assert.strictEqual(byId.id, allFeedback[0].id);
  });

  await test('3. Feedback Engine Filtering by Machine and Plant', () => {
    const machineFilter = learningService.feedbackEngine.getAllFeedback({ machineId: 'mach-vmc-01' });
    assert(machineFilter.length > 0, 'Must find feedback for mach-vmc-01');
    machineFilter.forEach(f => assert.strictEqual(f.machineId, 'mach-vmc-01'));

    const plantFilter = learningService.feedbackEngine.getAllFeedback({ plantId: 'plant-ahm-01' });
    assert(plantFilter.length > 0, 'Must find feedback for plant-ahm-01');
    plantFilter.forEach(f => assert.strictEqual(f.plantId, 'plant-ahm-01'));
  });

  await test('4. Feedback Engine Filters by Outcome (success/failure)', () => {
    const successes = learningService.feedbackEngine.getAllFeedback({ outcome: 'success' });
    assert(successes.length > 0, 'Must find successful outcomes');
    successes.forEach(f => assert.strictEqual(f.outcome, 'success'));

    const failures = learningService.feedbackEngine.getAllFeedback({ outcome: 'failure' });
    assert(failures.length > 0, 'Must find failed outcomes');
    failures.forEach(f => assert.strictEqual(f.outcome, 'failure'));
  });

  await test('5. Feedback Stats Correctly Counted', () => {
    const stats = learningService.feedbackEngine.getFeedbackStats();
    assert(stats.totalFeedbackEntries >= 5, 'Must count total entries');
    assert(stats.successRate > 0, 'Must calculate success rate');
    assert(stats.successfulOutcomes + stats.failedOutcomes === stats.totalFeedbackEntries, 'Success + failure must equal total');
  });

  await test('6. Outcome Repository Queries Return Aggregated Results', () => {
    const outcomes = learningService.outcomeRepository.queryOutcomes({});
    assert(outcomes.totalOutcomes >= 5, 'Must return at least 5 outcomes');
    assert(typeof outcomes.averageRating === 'number', 'Must calculate average rating');
    assert(typeof outcomes.averageDowntimeHours === 'number', 'Must calculate average downtime');
    assert(typeof outcomes.averageCost === 'number', 'Must calculate average cost');
    assert(Array.isArray(outcomes.sparePartsUsed), 'Must list spare parts used');
  });

  await test('7. Machine Outcome Summary Returns Correct Data', () => {
    const summary = learningService.outcomeRepository.getMachineOutcomeSummary('mach-vmc-01');
    assert(summary, 'Must return summary for mach-vmc-01');
    assert.strictEqual(summary.machineId, 'mach-vmc-01');
    assert(summary.totalWorkflows > 0, 'Must have workflow count');
    assert(summary.successRate >= 0, 'Must have success rate');
    assert(Array.isArray(summary.repeatedSpareParts), 'Must aggregate spare parts');
  });

  await test('8. Workflow Outcome Summary Returns Correct Data', () => {
    const summary = learningService.outcomeRepository.getWorkflowOutcomeSummary('wf-bearing-replacement-001');
    assert(summary, 'Must return summary for workflow');
    assert(summary.totalExecutions > 0, 'Must have execution count');
    assert(summary.successRate >= 0, 'Must have success rate');
  });

  await test('9. Plant Outcome Summary Returns Correct Data', () => {
    const summary = learningService.outcomeRepository.getPlantOutcomeSummary('plant-pune-01');
    assert(summary, 'Must return summary for plant-pune-01');
    assert.strictEqual(summary.plantName, 'Pune Manufacturing Plant');
    assert(summary.machineCount > 0, 'Must count machines');
  });

  await test('10. Learning Engine Identifies Recurring Failures', () => {
    const recurring = learningService.learningEngine.analyzeRecurringFailures();
    assert(Array.isArray(recurring), 'Must return array');
    if (recurring.length > 0) {
      assert(recurring[0].machineId, 'Must identify machine');
      assert(typeof recurring[0].failureCount === 'number', 'Must count failures');
    }
  });

  await test('11. Learning Engine Analyzes Ineffective Procedures', () => {
    const procedures = learningService.learningEngine.analyzeIneffectiveProcedures();
    assert(Array.isArray(procedures), 'Must return array');
    if (procedures.length > 0) {
      assert(procedures[0].workflowId, 'Must identify workflow');
      assert(['HIGH', 'MEDIUM', 'LOW'].includes(procedures[0].effectiveness), 'Must classify effectiveness');
    }
  });

  await test('12. Learning Engine Analyzes Repeated Spare Part Failures', () => {
    const parts = learningService.learningEngine.analyzeRepeatedSparePartFailures();
    assert(Array.isArray(parts), 'Must return array');
    if (parts.length > 0) {
      assert(parts[0].partName, 'Must name the part');
      assert(typeof parts[0].failureRate === 'number', 'Must calculate failure rate');
    }
  });

  await test('13. Learning Engine Estimates MTBF Improvement', () => {
    const mtbf = learningService.learningEngine.analyzeMTBFImprovement();
    assert(Array.isArray(mtbf), 'Must return array');
  });

  await test('14. Learning Engine Generates Maintenance Interval Recommendations', () => {
    const intervals = learningService.learningEngine.generateMaintenanceIntervalRecommendations();
    assert(Array.isArray(intervals), 'Must return array');
    if (intervals.length > 0) {
      assert(typeof intervals[0].recommendedIntervalDays === 'number', 'Must recommend interval');
      assert(intervals[0].reason, 'Must provide reason');
    }
  });

  await test('15. Learning Engine Generates Full Insights', () => {
    const insights = learningService.learningEngine.generateLearningInsights();
    assert(insights.recurringFailures, 'Must include recurring failures');
    assert(insights.ineffectiveProcedures, 'Must include ineffective procedures');
    assert(insights.repeatedSparePartFailures, 'Must include spare part failures');
    assert(insights.mtbfImprovement, 'Must include MTBF analysis');
    assert(insights.maintenanceIntervalRecommendations, 'Must include interval recommendations');
    assert(insights.analyzedAt, 'Must include timestamp');
  });

  await test('16. Recommendation Evaluator Calculates Accuracy', () => {
    const accuracy = learningService.recommendationEvaluator.evaluateRecommendationAccuracy();
    assert(typeof accuracy.accuracy === 'number', 'Must return accuracy percentage');
    assert(accuracy.predictionDrift, 'Must include drift metrics');
    assert(accuracy.samples > 0, 'Must have samples');
  });

  await test('17. Recommendation Evaluator Assesses Workflow Effectiveness', () => {
    const effectiveness = learningService.recommendationEvaluator.evaluateWorkflowEffectiveness();
    assert(effectiveness.overall, 'Must include overall metrics');
    assert(typeof effectiveness.overall.overallSuccessRate === 'number', 'Must calculate overall success rate');
    assert(Array.isArray(effectiveness.workflows), 'Must list per-workflow effectiveness');
  });

  await test('18. Recommendation Evaluator Assesses Maintenance Effectiveness', () => {
    const effectiveness = learningService.recommendationEvaluator.evaluateMaintenanceEffectiveness();
    assert(typeof effectiveness.maintenanceEffectiveness === 'number', 'Must calculate maintenance effectiveness');
    assert(typeof effectiveness.overallSuccessRate === 'number', 'Must calculate overall success rate');
    assert(typeof effectiveness.costEfficiency === 'number', 'Must calculate cost efficiency');
  });

  await test('19. Continuous Improvement Generates All KPIs', () => {
    const kpis = learningService.continuousImprovement.generateImprovementKPIs();
    assert(kpis.kpis, 'Must include KPIs object');
    assert(kpis.kpis.recommendationAccuracy, 'Must include recommendation accuracy');
    assert(kpis.kpis.workflowSuccessRate, 'Must include workflow success rate');
    assert(kpis.kpis.downtimeReduction, 'Must include downtime reduction');
    assert(kpis.kpis.mtbfImprovement, 'Must include MTBF improvement');
    assert(kpis.kpis.mttrImprovement, 'Must include MTTR improvement');
    assert(kpis.kpis.maintenanceEffectiveness, 'Must include maintenance effectiveness');
    assert(kpis.kpis.fleetImprovementTrend, 'Must include fleet improvement trend');
    assert(kpis.kpis.learningConfidence, 'Must include learning confidence');

    Object.entries(kpis.kpis).forEach(([key, kpi]) => {
      assert(typeof kpi.value === 'number', `${key} must have numeric value`);
      assert(kpi.unit, `${key} must have unit`);
      assert(kpi.trend, `${key} must have trend`);
      assert(kpi.description, `${key} must have description`);
    });
  });

  await test('20. Adaptive Decision Weights Tune From Outcomes', () => {
    const result = learningService.adaptiveWeights.tuneWeightsFromOutcomes();
    if (result.tuned) {
      assert(result.tunedWeights, 'Must return tuned weights when tuned');
      assert(result.tuningRationale, 'Must include tuning rationale');
    }
  });

  await test('21. Tuned Weights Are Retrieveable', () => {
    const weights = learningService.adaptiveWeights.getTunedWeights();
    assert(weights.weights, 'Must return weights object');
    const dimensions = ['safety', 'reliability', 'cost', 'downtime', 'productionImpact', 'energyImpact'];
    dimensions.forEach(d => {
      assert(typeof weights.weights[d] === 'number', `${d} must be a number`);
      assert(weights.weights[d] > 0 && weights.weights[d] < 1, `${d} must be between 0 and 1`);
    });
  });

  await test('22. Adaptive Weights Can Be Reset', () => {
    const reset = learningService.adaptiveWeights.resetWeights();
    assert(reset.weights, 'Must return default weights');
    assert.strictEqual(reset.weights.safety, 0.35, 'Safety weight must default to 0.35');
  });

  await test('23. Feedback Engine Captures New Custom Feedback', () => {
    const newFb = learningService.feedbackEngine.captureFeedback({
      workflowId: 'wf-test-999',
      machineId: 'mach-test-01',
      machineName: 'Test Machine',
      plantId: 'plant-test-01',
      plantName: 'Test Plant',
      predictedFailure: 'Test failure mode',
      actualFailure: 'Test actual failure',
      predictedDowntimeHours: 5.0,
      actualDowntimeHours: 4.5,
      predictedCost: 10000,
      actualCost: 8500,
      sparePartsUsed: ['Test Part A', 'Test Part B'],
      operatorRating: 4,
      technicianNotes: 'Test repair completed successfully',
      outcome: 'success',
      recommendationAccepted: true
    });
    assert(newFb.id, 'New feedback must have ID');
    assert.strictEqual(newFb.machineId, 'mach-test-01');
    assert.strictEqual(newFb.outcome, 'success');

    const retrieved = learningService.feedbackEngine.getFeedbackById(newFb.id);
    assert(retrieved, 'Must retrieve newly created feedback');
    assert.strictEqual(retrieved.actualCost, 8500);
  });

  await test('24. Outcomes Filtered by Date Range', () => {
    const startDate = new Date(Date.now() - 86400000 * 30).toISOString();
    const endDate = new Date().toISOString();
    const filtered = learningService.feedbackEngine.getAllFeedback({ startDate, endDate });
    assert(filtered.length > 0, 'Must find feedback in date range');
  });

  await test('25. Spare Parts Are Properly Aggregated in Machine Summary', () => {
    const summary = learningService.outcomeRepository.getMachineOutcomeSummary('mach-vmc-01');
    if (summary && summary.repeatedSpareParts.length > 0) {
      assert(summary.repeatedSpareParts[0].name, 'Part must have name');
      assert(summary.repeatedSpareParts[0].count > 0, 'Part must have count');
    }
  });

  console.log(`\n==================================================`);
  console.log(`  Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log(`==================================================`);
  if (failed > 0) process.exit(1);
}

runLearningTests();

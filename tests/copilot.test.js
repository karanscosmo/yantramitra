const assert = require('assert');
const copilotService = require('../services/copilot');

async function runCopilotTests() {
  console.log('==================================================');
  console.log('YantraMitra Executive AI Copilot Test Suite');
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

  // ─── Executive Dashboard ─────────────────────────────────────

  await test('1. Copilot System Status Returns Correct Shape', () => {
    const status = copilotService.getCopilotSystemStatus();
    assert.strictEqual(status.systemStatus, 'ACTIVE_READY');
    assert(status.capabilities.length >= 6);
  });

  await test('2. Executive Dashboard Plant Health', () => {
    const plants = copilotService.executiveDashboard.generatePlantHealth();
    assert(plants.length === 5);
    plants.forEach(p => {
      assert(p.plantId);
      assert(p.plantName);
      assert(typeof p.healthScore === 'number');
      assert(p.healthScore >= 0 && p.healthScore <= 100);
      assert(['LOW', 'MEDIUM', 'HIGH'].includes(p.riskLevel));
    });
  });

  await test('3. Executive Dashboard Fleet Health', () => {
    const fleet = copilotService.executiveDashboard.generateFleetHealth();
    assert(typeof fleet.fleetHealthScore === 'number');
    assert(fleet.totalMachines > 0);
    assert(typeof fleet.avgUptime === 'number');
    assert(typeof fleet.avgReliability === 'number');
  });

  await test('4. Executive Dashboard Top Critical Assets', () => {
    const assets = copilotService.executiveDashboard.generateTopCriticalAssets();
    assert(assets.length === 8);
    assets.forEach((a, i) => {
      assert(a.rank === i + 1);
      assert(a.assetId);
      assert(a.riskScore >= 0);
    });
  });

  await test('5. Executive Dashboard Active Incidents', () => {
    const incidents = copilotService.executiveDashboard.generateActiveIncidents();
    assert(incidents.length >= 3);
    incidents.forEach(i => {
      assert(i.incidentId);
      assert(i.type);
      assert(i.severity);
    });
  });

  await test('6. Executive Dashboard Downtime Summary', () => {
    const dt = copilotService.executiveDashboard.generateDowntimeSummary();
    assert(typeof dt.totalDowntimeHours === 'number');
    assert(dt.topCauses.length === 5);
    assert(typeof dt.downtimeCostEstimate === 'number');
  });

  await test('7. Executive Dashboard Production Risk', () => {
    const risk = copilotService.executiveDashboard.generateProductionRisk();
    assert(risk.overallRiskLevel);
    assert(typeof risk.riskScore === 'number');
    assert(risk.topRisks.length === 4);
  });

  await test('8. Executive Dashboard Maintenance Backlog', () => {
    const backlog = copilotService.executiveDashboard.generateMaintenanceBacklog();
    assert(typeof backlog.totalWorkOrders === 'number');
    assert(backlog.byPlant.length === 5);
  });

  await test('9. Executive Dashboard Cost Impact', () => {
    const cost = copilotService.executiveDashboard.generateCostImpact();
    assert(typeof cost.totalMonthlyCost === 'number');
    assert(cost.topCostDrivers.length === 5);
    assert(['improving', 'stable', 'declining'].includes(cost.costTrend));
  });

  await test('10. Executive Dashboard Full Dashboard', () => {
    const dash = copilotService.executiveDashboard.getFullDashboard();
    assert(dash.executiveSummary);
    assert(dash.plantHealth.length === 5);
    assert(dash.fleetHealth);
    assert(dash.topCriticalAssets.length === 8);
    assert(dash.activeIncidents.length >= 3);
    assert(dash.downtimeSummary);
    assert(dash.productionRisk);
    assert(dash.maintenanceBacklog);
    assert(dash.costImpact);
    assert(dash.plantNeedingAttention.plantId);
    assert(dash.generatedAt);
  });

  // ─── Executive Briefing ──────────────────────────────────────

  await test('11. Executive Briefing Daily Summary', () => {
    const daily = copilotService.executiveBriefing.generateDailySummary();
    assert(daily.type === 'DAILY');
    assert(daily.title);
    assert(daily.highlights.length > 0);
    assert(daily.kpiChanges.length > 0);
    assert(daily.recommendations.length > 0);
  });

  await test('12. Executive Briefing Weekly Summary', () => {
    const weekly = copilotService.executiveBriefing.generateWeeklySummary();
    assert(weekly.type === 'WEEKLY');
    assert(weekly.overview);
    assert(weekly.majorFailures.length > 0);
    assert(weekly.risks.length > 0);
    assert(weekly.kpiSummary.length === 4);
    assert(weekly.costSummary);
    assert(weekly.learningHighlights.length > 0);
  });

  await test('13. Executive Briefing Monthly Summary', () => {
    const monthly = copilotService.executiveBriefing.generateMonthlySummary();
    assert(monthly.type === 'MONTHLY');
    assert(monthly.executiveOverview);
    assert(monthly.trendAnalysis);
    assert(monthly.plantRanking.length === 5);
    assert(monthly.strategicRecommendations.length > 0);
    assert(monthly.costAnalysis);
  });

  await test('14. Executive Briefing Get By Type', () => {
    const daily = copilotService.executiveBriefing.getBriefing('daily');
    assert(daily.type === 'DAILY');

    const weekly = copilotService.executiveBriefing.getBriefing('weekly');
    assert(weekly.type === 'WEEKLY');

    const monthly = copilotService.executiveBriefing.getBriefing('monthly');
    assert(monthly.type === 'MONTHLY');
  });

  // ─── Business Intelligence ───────────────────────────────────

  await test('15. Business Intelligence Maintenance Costs', () => {
    const costs = copilotService.businessIntelligence.analyzeMaintenanceCosts();
    assert(typeof costs.totalMaintenanceCost === 'number');
    assert(costs.costBreakdown.corrective);
    assert(costs.costBreakdown.preventive);
    assert(costs.costPerPlant.length === 5);
    assert(costs.costSavingOpportunities.length === 4);
  });

  await test('16. Business Intelligence Downtime Trends', () => {
    const trends = copilotService.businessIntelligence.analyzeDowntimeTrends();
    assert(typeof trends.totalDowntimeHours === 'number');
    assert(trends.monthlyComparison.length === 6);
    assert(trends.byCause.length === 6);
    assert(trends.topLossEvents.length === 5);
  });

  await test('17. Business Intelligence Asset Utilization', () => {
    const util = copilotService.businessIntelligence.analyzeAssetUtilization();
    assert(util.overallUtilization);
    assert(util.byPlant.length === 5);
    assert(util.underutilizedAssets.length === 4);
  });

  await test('18. Business Intelligence Reliability Trends', () => {
    const rel = copilotService.businessIntelligence.analyzeReliabilityTrends();
    assert(typeof rel.overallReliability === 'number');
    assert(rel.mtbf);
    assert(rel.mtbf.byAssetClass.length === 5);
    assert(rel.mttr);
  });

  await test('19. Business Intelligence Spare Part Consumption', () => {
    const sp = copilotService.businessIntelligence.analyzeSparePartConsumption();
    assert(typeof sp.totalSpend === 'number');
    assert(sp.topParts.length === 8);
    assert(sp.criticalShortages.length > 0);
  });

  await test('20. Business Intelligence Technician Productivity', () => {
    const tp = copilotService.businessIntelligence.analyzeTechnicianProductivity();
    assert(typeof tp.totalTechnicians === 'number');
    assert(tp.byPlant.length === 5);
    assert(tp.productivityGaps.length > 0);
  });

  await test('21. Business Intelligence Plant Comparisons', () => {
    const comparisons = copilotService.businessIntelligence.generatePlantComparisons();
    assert(comparisons.length === 5);
    comparisons.forEach((c, i) => {
      assert(c.rank === i + 1);
      assert(c.composite > 0);
    });
  });

  await test('22. Business Intelligence Full Analysis', () => {
    const analysis = copilotService.businessIntelligence.getFullAnalysis();
    assert(analysis.maintenanceCosts);
    assert(analysis.downtimeTrends);
    assert(analysis.assetUtilization);
    assert(analysis.reliabilityTrends);
    assert(analysis.sparePartConsumption);
    assert(analysis.technicianProductivity);
    assert(analysis.plantComparisons);
  });

  // ─── What-If Simulation ──────────────────────────────────────

  await test('23. What-If Simulation Delayed Maintenance', () => {
    const sim = copilotService.whatIfSimulation.runSimulation('delayed_maintenance', { delayDays: 30, affectedMachines: 10 });
    assert(sim.scenario === 'Delayed Maintenance');
    assert(sim.impacts.cost);
    assert(sim.impacts.downtime);
    assert(sim.impacts.mtbf);
    assert(sim.impacts.risk);
    assert(sim.recommendations.length > 0);
  });

  await test('24. What-If Simulation Increased Frequency', () => {
    const sim = copilotService.whatIfSimulation.runSimulation('increased_frequency', { reductionPercent: 20, currentIntervalDays: 90 });
    assert(sim.scenario === 'Increased Maintenance Frequency');
    assert(sim.impacts.cost);
    assert(sim.impacts.mtbf);
    assert(sim.impacts.mttr);
  });

  await test('25. What-If Simulation Spare Part Shortage', () => {
    const sim = copilotService.whatIfSimulation.runSimulation('spare_part_shortage', { shortagePercent: 30, durationDays: 14 });
    assert(sim.scenario === 'Spare Part Shortage');
    assert(sim.impacts.downtime);
    assert(sim.impacts.risk);
  });

  await test('26. What-If Simulation Equipment Replacement', () => {
    const sim = copilotService.whatIfSimulation.runSimulation('equipment_replacement', { assetCount: 3, avgAssetCost: 2500000 });
    assert(sim.scenario === 'Equipment Replacement');
    assert(sim.impacts.cost);
    assert(sim.impacts.savings);
    assert(sim.impacts.payback);
  });

  await test('27. What-If Simulation Additional Technicians', () => {
    const sim = copilotService.whatIfSimulation.runSimulation('additional_technicians', { additionalCount: 3 });
    assert(sim.scenario === 'Additional Technicians');
    assert(sim.impacts.cost);
    assert(sim.impacts.backlog);
    assert(sim.impacts.mttr);
  });

  await test('28. What-If Simulation Production Demand Increase', () => {
    const sim = copilotService.whatIfSimulation.runSimulation('production_demand_increase', { demandIncrease: 20, currentUtilization: 75 });
    assert(sim.scenario === 'Production Demand Increase');
    assert(sim.impacts.utilization);
    assert(sim.impacts.maintenanceCost);
  });

  await test('29. What-If Simulation List Types', () => {
    const types = copilotService.whatIfSimulation.listSimulationTypes();
    assert(types.length === 6);
    types.forEach(t => {
      assert(t.id);
      assert(t.name);
      assert(t.defaultParams);
    });
  });

  await test('30. What-If Simulation Throws on Invalid Type', () => {
    assert.throws(() => copilotService.whatIfSimulation.runSimulation('invalid_type'));
  });

  // ─── Executive Copilot ───────────────────────────────────────

  await test('31. Executive Copilot Answers "Which plant needs attention today?"', () => {
    const data = {
      plantHealth: copilotService.executiveDashboard.generatePlantHealth(),
      activeIncidents: copilotService.executiveDashboard.generateActiveIncidents()
    };
    const result = copilotService.executiveCopilot.answer('Which plant needs attention today?', data);
    assert(result.answered === true);
    assert(result.answer);
    assert(result.answer.includes('**'));
  });

  await test('32. Executive Copilot Answers "Why is Plant A underperforming?"', () => {
    const data = { plantHealth: copilotService.executiveDashboard.generatePlantHealth() };
    const result = copilotService.executiveCopilot.answer('Why is Plant A underperforming?', data);
    assert(result.answered === true);
    assert(typeof result.answer === 'string');
  });

  await test('33. Executive Copilot Answers "What will happen if we postpone maintenance?"', () => {
    const result = copilotService.executiveCopilot.answer('What will happen if we postpone maintenance?');
    assert(result.answered === true);
    assert(result.answer.includes('Cost Impact'));
  });

  await test('34. Executive Copilot Answers "Which assets should we replace first?"', () => {
    const data = { criticalAssets: copilotService.executiveDashboard.generateTopCriticalAssets() };
    const result = copilotService.executiveCopilot.answer('Which assets should we replace first?', data);
    assert(result.answered === true);
    assert(result.answer.includes('**'));
  });

  await test('35. Executive Copilot Answers "Where are we losing the most money?"', () => {
    const data = { costImpact: copilotService.executiveDashboard.generateCostImpact() };
    const result = copilotService.executiveCopilot.answer('Where are we losing the most money?', data);
    assert(result.answered === true);
  });

  await test('36. Executive Copilot Answers "What changed this week?"', () => {
    const data = { briefing: copilotService.executiveBriefing.generateWeeklySummary() };
    const result = copilotService.executiveCopilot.answer('What changed this week?', data);
    assert(result.answered === true);
  });

  await test('37. Executive Copilot Handles Unknown Questions', () => {
    const result = copilotService.executiveCopilot.answer('How is the weather today?');
    assert(result.answered === false);
    assert(result.suggestions.length > 0);
  });

  await test('38. Executive Copilot Case-Insensitive Matching', () => {
    const result = copilotService.executiveCopilot.answer('WHICH PLANT NEEDS ATTENTION');
    assert(result.answered === true);
  });

  await test('39. Executive Copilot Partial Match Returns Answer', () => {
    const result = copilotService.executiveCopilot.answer('money');
    assert(result.answered === true);
  });

  await test('40. Executive Copilot Suggested Questions', () => {
    const suggestions = copilotService.executiveCopilot.getSuggestedQuestions();
    assert(suggestions.length >= 6);
    suggestions.forEach(s => {
      assert(s.question);
      assert(s.category);
    });
  });

  // ─── Enterprise KPI Aggregator ───────────────────────────────

  await test('41. Enterprise KPI Aggregator Definitions', () => {
    const defs = copilotService.enterpriseKpis.getKpiDefinitions();
    assert(defs.length === 14);
    const subsystems = new Set(defs.map(d => d.subsystem));
    assert(subsystems.has('ML'));
    assert(subsystems.has('RAG'));
    assert(subsystems.has('Fleet'));
    assert(subsystems.has('Learning'));
    assert(subsystems.has('Integrations'));
    assert(subsystems.has('Security'));
    assert(subsystems.has('Production'));
    assert(subsystems.has('Decisions'));
    assert(subsystems.size === 8);
  });

  await test('42. Enterprise KPI Aggregator Scorecard', () => {
    const scorecard = copilotService.enterpriseKpis.generateScorecard();
    assert(scorecard.overallScore > 0);
    assert(scorecard.totalKpis === 14);
    assert(scorecard.subsystems === 8);
    assert(scorecard.bySubsystem.length === 8);
    assert(scorecard.allKpis.length === 14);
    assert(Array.isArray(scorecard.topPerformers));
    assert(Array.isArray(scorecard.needsAttention));
  });

  await test('43. Enterprise KPI Scorecard Has All Subsystems', () => {
    const scorecard = copilotService.enterpriseKpis.generateScorecard();
    const subsystems = scorecard.bySubsystem.map(s => s.subsystem);
    assert(subsystems.includes('ML'));
    assert(subsystems.includes('RAG'));
    assert(subsystems.includes('Fleet'));
    assert(subsystems.includes('Learning'));
    assert(subsystems.includes('Integrations'));
    assert(subsystems.includes('Security'));
    assert(subsystems.includes('Production'));
    assert(subsystems.includes('Decisions'));
  });

  await test('44. Enterprise KPI Scorecard Has Per-KPI Details', () => {
    const scorecard = copilotService.enterpriseKpis.generateScorecard();
    scorecard.allKpis.forEach(kpi => {
      assert(kpi.id);
      assert(kpi.subsystem);
      assert(typeof kpi.value === 'number');
      assert(kpi.trend);
      assert(kpi.status);
      assert(kpi.updatedAt);
    });
  });

  await test('45. Enterprise KPI Scorecard Status Values', () => {
    const scorecard = copilotService.enterpriseKpis.generateScorecard();
    const valid = ['EXCELLENT', 'GOOD', 'ATTENTION', 'CRITICAL'];
    scorecard.allKpis.forEach(kpi => {
      assert(valid.includes(kpi.status), `${kpi.id} has invalid status: ${kpi.status}`);
    });
  });

  // ─── End-to-End ──────────────────────────────────────────────

  await test('46. End-to-End: Dashboard + Briefing + Simulation + Copilot', () => {
    const dashboard = copilotService.executiveDashboard.getFullDashboard();
    assert(dashboard.executiveSummary.overallHealthScore > 0);

    const briefing = copilotService.executiveBriefing.generateDailySummary();
    assert(briefing.highlights.length > 0);

    const sim = copilotService.whatIfSimulation.runSimulation('equipment_replacement');
    assert(sim.impacts.payback);

    const copilotResult = copilotService.executiveCopilot.answer('Which plant needs attention today?', {
      plantHealth: dashboard.plantHealth,
      activeIncidents: dashboard.activeIncidents
    });
    assert(copilotResult.answered === true);
  });

  await test('47. End-to-End: Business Intelligence + KPI Scorecard', () => {
    const bi = copilotService.businessIntelligence.getFullAnalysis();
    assert(bi.maintenanceCosts.totalMaintenanceCost > 0);

    const scorecard = copilotService.enterpriseKpis.generateScorecard();
    assert(scorecard.overallScore > 0);

    const worstSubsystem = scorecard.bySubsystem.reduce((worst, s) => s.score < worst.score ? s : worst);
    assert(worstSubsystem.subsystem);
  });

  await test('48. End-to-End: All Simulation Types Produce Expected Shapes', () => {
    const types = copilotService.whatIfSimulation.listSimulationTypes();
    types.forEach(t => {
      const sim = copilotService.whatIfSimulation.runSimulation(t.id, t.defaultParams);
      assert(sim.simulationId);
      assert(sim.impacts);
      assert(sim.recommendations.length > 0);
      assert(typeof sim.confidence === 'number');
    });
  });

  await test('49. End-to-End: Full System Status', () => {
    const status = copilotService.getCopilotSystemStatus();
    assert(status.kpisAvailable === 14);
    assert(status.simulationTypes === 6);
    assert(status.copilotQuestions >= 6);
  });

  await test('50. End-to-End: Enterprise KPIs Across Subsystems Are Consistent', () => {
    const scorecard = copilotService.enterpriseKpis.generateScorecard();
    assert(scorecard.overallScore > 0 && scorecard.overallScore <= 100);
    scorecard.bySubsystem.forEach(sub => {
      assert(sub.score > 0 && sub.score <= 100);
    });
    assert(scorecard.allKpis.length === 14);
  });

  console.log(`\n==================================================`);
  console.log(`  Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log(`==================================================`);
  if (failed > 0) process.exit(1);
}

runCopilotTests();

const kpiDefinitions = [
  { id: 'ml_accuracy', subsystem: 'ML', name: 'Prediction Accuracy', unit: '%', description: 'ML model prediction accuracy across all models' },
  { id: 'rag_relevance', subsystem: 'RAG', name: 'Response Relevance', unit: '%', description: 'RAG response relevance score' },
  { id: 'fleet_health', subsystem: 'Fleet', name: 'Fleet Health Score', unit: '%', description: 'Aggregate fleet health' },
  { id: 'fleet_reliability', subsystem: 'Fleet', name: 'Fleet Reliability', unit: '%', description: 'Overall fleet reliability' },
  { id: 'learning_confidence', subsystem: 'Learning', name: 'Learning Confidence', unit: '%', description: 'Continuous learning confidence level' },
  { id: 'workflow_success', subsystem: 'Learning', name: 'Workflow Success Rate', unit: '%', description: 'Workflow execution success rate' },
  { id: 'integrations_active', subsystem: 'Integrations', name: 'Active Integrations', unit: 'count', description: 'Active connector count' },
  { id: 'integrations_health', subsystem: 'Integrations', name: 'Integration Health', unit: '%', description: 'Integration health percentage' },
  { id: 'security_compliance', subsystem: 'Security', name: 'Compliance Score', unit: '%', description: 'Security compliance score' },
  { id: 'security_alerts', subsystem: 'Security', name: 'Unresolved Alerts', unit: 'count', description: 'Unresolved security alerts' },
  { id: 'production_cache_hit', subsystem: 'Production', name: 'Cache Hit Ratio', unit: '%', description: 'Distributed cache hit ratio' },
  { id: 'production_queue_depth', subsystem: 'Production', name: 'Queue Depth', unit: 'count', description: 'Total queued jobs' },
  { id: 'decision_accuracy', subsystem: 'Decisions', name: 'Decision Accuracy', unit: '%', description: 'Decision intelligence accuracy' },
  { id: 'decision_confidence', subsystem: 'Decisions', name: 'Decision Confidence', unit: '%', description: 'Average decision confidence score' }
];

function generateKPIValue(kpi) {
  switch (kpi.subsystem) {
    case 'ML': return Math.round((80 + Math.random() * 18) * 100) / 100;
    case 'RAG': return Math.round((75 + Math.random() * 20) * 100) / 100;
    case 'Fleet': return Math.round((78 + Math.random() * 20) * 100) / 100;
    case 'Learning': return Math.round((65 + Math.random() * 30) * 100) / 100;
    case 'Integrations': return kpi.id === 'integrations_active' ? Math.floor(Math.random() * 8) + 2 : Math.round((80 + Math.random() * 18) * 100) / 100;
    case 'Security': return kpi.id === 'security_alerts' ? Math.floor(Math.random() * 5) : Math.round((75 + Math.random() * 22) * 100) / 100;
    case 'Production': return kpi.id === 'production_cache_hit' ? Math.round((75 + Math.random() * 22) * 100) / 100 : Math.floor(Math.random() * 20) + 2;
    case 'Decisions': return Math.round((72 + Math.random() * 25) * 100) / 100;
    default: return Math.round((70 + Math.random() * 28) * 100) / 100;
  }
}

function generateTrend() {
  const r = Math.random();
  if (r > 0.6) return 'IMPROVING';
  if (r > 0.3) return 'STABLE';
  return 'DECLINING';
}

function generateChange() {
  return `${(Math.random() * 10 - 3).toFixed(1)}%`;
}

function generateScorecard() {
  const kpis = kpiDefinitions.map(kpi => {
    const value = generateKPIValue(kpi);
    return {
      ...kpi,
      value,
      previousValue: Math.round(value * (0.9 + Math.random() * 0.2) * 100) / 100,
      change: generateChange(),
      trend: generateTrend(),
      status: value >= 85 ? 'EXCELLENT' : value >= 70 ? 'GOOD' : value >= 50 ? 'ATTENTION' : 'CRITICAL',
      updatedAt: new Date().toISOString()
    };
  });

  const bySubsystem = {};
  kpis.forEach(kpi => {
    if (!bySubsystem[kpi.subsystem]) bySubsystem[kpi.subsystem] = [];
    bySubsystem[kpi.subsystem].push(kpi);
  });

  const subsystemScores = Object.entries(bySubsystem).map(([subsystem, subsystemKpis]) => {
    const avg = subsystemKpis.reduce((s, k) => s + k.value, 0) / subsystemKpis.length;
    return {
      subsystem,
      score: Math.round(avg * 100) / 100,
      kpiCount: subsystemKpis.length,
      status: avg >= 85 ? 'EXCELLENT' : avg >= 70 ? 'GOOD' : 'ATTENTION',
      kpis: subsystemKpis
    };
  });

  const overallScore = Math.round(kpis.reduce((s, k) => s + k.value, 0) / kpis.length * 100) / 100;

  return {
    generatedAt: new Date().toISOString(),
    overallScore,
    overallStatus: overallScore >= 85 ? 'EXCELLENT' : overallScore >= 70 ? 'GOOD' : overallScore >= 50 ? 'ATTENTION' : 'CRITICAL',
    totalKpis: kpis.length,
    subsystems: 8,
    bySubsystem: subsystemScores,
    allKpis: kpis,
    topPerformers: subsystemScores.filter(s => s.score >= 80).map(s => s.subsystem),
    needsAttention: subsystemScores.filter(s => s.score < 70).map(s => s.subsystem)
  };
}

function getKpiDefinitions() {
  return kpiDefinitions.map(k => ({ id: k.id, subsystem: k.subsystem, name: k.name, unit: k.unit }));
}

module.exports = {
  kpiDefinitions,
  generateScorecard,
  getKpiDefinitions
};

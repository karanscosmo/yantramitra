function generateDailySummary() {
  const date = new Date();
  return {
    type: 'DAILY',
    title: `Executive Daily Briefing — ${date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
    generatedAt: date.toISOString(),
    period: { start: new Date(date.getTime() - 86400000).toISOString(), end: date.toISOString() },
    highlights: [
      `${Math.floor(Math.random() * 3) + 1} incidents resolved since yesterday`,
      `${Math.floor(Math.random() * 5) + 1} machines completed scheduled maintenance`,
      `Overall plant health ${Math.random() > 0.5 ? 'improved' : 'remained stable'}`
    ],
    majorEvents: [
      { type: 'INCIDENT', severity: 'HIGH', summary: 'Cooling tower vibration exceeded threshold at Pune plant', status: 'UNDER_CONTROL', impact: 'Production line 3 reduced to 70% capacity' },
      { type: 'COMPLETION', summary: 'Chennai compressor overhaul completed ahead of schedule', impact: 'Estimated 2 days downtime avoided' },
      { type: 'RISK', severity: 'MEDIUM', summary: 'Hydraulic press #2 showing early wear patterns', status: 'MONITORING', impact: 'Scheduling inspection within 48 hours' }
    ].slice(0, Math.floor(Math.random() * 3) + 1),
    kpiChanges: [
      { metric: 'Fleet Health', previous: '84.2%', current: `${Math.round((82 + Math.random() * 8) * 100) / 100}%`, change: `${(Math.random() * 3 - 1.5).toFixed(1)}%`, direction: Math.random() > 0.5 ? 'UP' : 'DOWN' },
      { metric: 'Avg Downtime', previous: '3.2h', current: `${(Math.random() * 3 + 1.5).toFixed(1)}h`, change: `${(Math.random() * 20 - 10).toFixed(1)}%`, direction: Math.random() > 0.5 ? 'DOWN' : 'UP' }
    ],
    recommendations: [
      'Review Pune cooling tower repair plan — escalating to critical within 24h if unresolved',
      'Approve overtime for Chennai shift B to clear maintenance backlog of 4 overdue orders',
      'Expedite spare part order for Ahmedabad press brake — current stock covers 2 more cycles'
    ],
    costImpact: { estimatedDailyLoss: Math.floor(Math.random() * 200000) + 50000, avoidableCost: Math.floor(Math.random() * 80000) + 10000 }
  };
}

function generateWeeklySummary() {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 86400000 * 7);
  const failures = Math.floor(Math.random() * 8) + 2;
  return {
    type: 'WEEKLY',
    title: `Executive Weekly Briefing — ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
    generatedAt: endDate.toISOString(),
    period: { start: startDate.toISOString(), end: endDate.toISOString() },
    overview: {
      plantsReporting: 5,
      machinesMonitored: 138,
      totalWorkOrders: Math.floor(Math.random() * 50) + 30,
      completedWorkOrders: Math.floor(Math.random() * 30) + 20,
      criticalIncidents: Math.floor(Math.random() * 5) + 1,
      totalDowntimeHours: Math.round((Math.random() * 60 + 15) * 100) / 100
    },
    majorFailures: Array.from({ length: Math.min(failures, 4) }, (_, i) => ({
      asset: ['VMC-01', 'Hydraulic Press #3', 'Conveyor L2', 'Cooling Tower CT-2'][i],
      plant: ['Pune', 'Ahmedabad', 'Chennai', 'Pune'][i],
      failure: ['Bearing failure', 'Hydraulic leak', 'Motor burnout', 'Vibration exceedance'][i],
      downtimeHours: Math.round((Math.random() * 12 + 2) * 100) / 100,
      costImpact: Math.floor(Math.random() * 150000) + 20000,
      rootCause: ['Wear and tear', 'Seal degradation', 'Electrical surge', 'Imbalance'][i]
    })),
    risks: [
      { risk: 'Pune VMC-03 approaching end of service life', probability: 'HIGH', impact: 'CRITICAL', timeframe: '2-4 weeks' },
      { risk: 'Ahmedabad spare part inventory below reorder point for 6 critical SKUs', probability: 'MEDIUM', impact: 'HIGH', timeframe: '1 week' },
      { risk: 'Chennai technician certification expiring for 3 operators', probability: 'LOW', impact: 'MEDIUM', timeframe: '4 weeks' }
    ],
    kpiSummary: [
      { metric: 'Avg MTBF', value: `${Math.round((180 + Math.random() * 60) * 100) / 100}h`, change: `${(Math.random() * 15 - 5).toFixed(1)}%`, trend: Math.random() > 0.4 ? 'IMPROVING' : 'DECLINING' },
      { metric: 'Avg MTTR', value: `${(Math.random() * 4 + 2).toFixed(1)}h`, change: `${(Math.random() * 15 - 10).toFixed(1)}%`, trend: Math.random() > 0.5 ? 'IMPROVING' : 'STABLE' },
      { metric: 'Maintenance Cost', value: `₹${Math.floor(Math.random() * 20 + 10)}L`, change: `${(Math.random() * 10 - 5).toFixed(1)}%`, trend: Math.random() > 0.5 ? 'STABLE' : 'INCREASING' },
      { metric: 'Fleet Reliability', value: `${Math.round((88 + Math.random() * 8) * 100) / 100}%`, change: `${(Math.random() * 5 - 2).toFixed(1)}%`, trend: 'IMPROVING' }
    ],
    recommendations: [
      'Schedule Pune VMC-03 replacement planning meeting this week',
      'Approve emergency procurement for 6 critical Ahmedabad spare parts',
      'Initiate cross-training program for Chennai shift B technicians',
      'Deploy additional predictive monitoring on aging hydraulic fleet'
    ],
    costSummary: {
      totalMaintenanceSpend: Math.floor(Math.random() * 3000000) + 500000,
      unplannedDowntimeCost: Math.floor(Math.random() * 1500000) + 200000,
      savingsFromPredictive: Math.floor(Math.random() * 500000) + 100000,
      roiOnMaintenance: `${Math.round((12 + Math.random() * 8) * 100) / 100}%`
    },
    learningHighlights: [
      'Bearing failure pattern detected across 3 Pune CNC machines — root cause identified as lubricant contamination',
      'Hydraulic seal replacement procedure updated based on technician feedback — estimated 15% MTTR improvement',
      'Spare part consumption analysis shows 20% reduction after implementing predictive replacement schedule'
    ]
  };
}

function generateMonthlySummary() {
  const endDate = new Date();
  const startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 1, endDate.getDate());
  return {
    type: 'MONTHLY',
    title: `Executive Monthly Briefing — ${startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
    generatedAt: endDate.toISOString(),
    period: { start: startDate.toISOString(), end: endDate.toISOString() },
    executiveOverview: {
      plants: 5,
      totalAssets: 138,
      assetUtilization: `${Math.round((72 + Math.random() * 18) * 100) / 100}%`,
      overallEquipmentEffectiveness: `${Math.round((68 + Math.random() * 18) * 100) / 100}%`,
      totalWorkOrdersCompleted: Math.floor(Math.random() * 150) + 80,
      avgCompletionTime: `${(Math.random() * 3 + 1.5).toFixed(1)} days`,
      totalMaintenanceCost: Math.floor(Math.random() * 8000000) + 2000000,
      costPerAsset: Math.floor(Math.random() * 50000) + 15000
    },
    trendAnalysis: {
      mtbfTrend: `${(Math.random() * 10 + 2).toFixed(1)}% ${Math.random() > 0.3 ? 'improvement' : 'decline'}`,
      mttrTrend: `${(Math.random() * 8 + 2).toFixed(1)}% ${Math.random() > 0.4 ? 'reduction' : 'increase'}`,
      downtimeTrend: `${(Math.random() * 15 + 5).toFixed(1)}% ${Math.random() > 0.4 ? 'reduction vs last month' : 'increase vs last month'}`,
      costTrend: `${(Math.random() * 10 + 3).toFixed(1)}% ${Math.random() > 0.5 ? 'under budget' : 'over budget'}`,
      reliabilityTrend: Math.random() > 0.3 ? 'IMPROVING' : 'DECLINING'
    },
    plantRanking: [
      { plant: 'Pune', performance: Math.round((75 + Math.random() * 20) * 100) / 100, rank: 1, trend: 'STABLE' },
      { plant: 'Chennai', performance: Math.round((75 + Math.random() * 20) * 100) / 100, rank: 2, trend: 'IMPROVING' },
      { plant: 'Ahmedabad', performance: Math.round((75 + Math.random() * 20) * 100) / 100, rank: 3, trend: 'DECLINING' },
      { plant: 'Bengaluru', performance: Math.round((75 + Math.random() * 20) * 100) / 100, rank: 4, trend: 'IMPROVING' },
      { plant: 'Nagpur', performance: Math.round((75 + Math.random() * 20) * 100) / 100, rank: 5, trend: 'STABLE' }
    ].sort((a, b) => b.performance - a.performance).map((p, i) => ({ ...p, rank: i + 1 })),
    strategicRecommendations: [
      'Implement predictive maintenance program for Pune CNC fleet — projected ₹45L annual savings',
      'Standardize spare part inventory across all plants — estimated 18% cost reduction',
      'Deploy IIoT sensors on 15 oldest assets for continuous condition monitoring',
      'Establish center of excellence for reliability engineering at Chennai plant',
      'Negotiate enterprise-wide maintenance service agreement — potential 12% savings'
    ],
    costAnalysis: {
      totalSpend: Math.floor(Math.random() * 20000000) + 5000000,
      breakdown: [
        { category: 'Corrective Maintenance', amount: Math.floor(Math.random() * 6000000) + 1000000, percentage: 32 },
        { category: 'Preventive Maintenance', amount: Math.floor(Math.random() * 4000000) + 1000000, percentage: 25 },
        { category: 'Predictive Maintenance', amount: Math.floor(Math.random() * 2000000) + 500000, percentage: 12 },
        { category: 'Emergency Repairs', amount: Math.floor(Math.random() * 3000000) + 500000, percentage: 18 },
        { category: 'Spare Parts', amount: Math.floor(Math.random() * 2000000) + 500000, percentage: 13 }
      ],
      vsBudget: `${(Math.random() * 8 - 4).toFixed(1)}%`,
      savingsOpportunity: Math.floor(Math.random() * 3000000) + 500000
    }
  };
}

function getBriefing(type = 'daily') {
  switch (type) {
    case 'weekly': return generateWeeklySummary();
    case 'monthly': return generateMonthlySummary();
    default: return generateDailySummary();
  }
}

module.exports = {
  generateDailySummary,
  generateWeeklySummary,
  generateMonthlySummary,
  getBriefing
};

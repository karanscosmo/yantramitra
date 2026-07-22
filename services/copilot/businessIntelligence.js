function analyzeMaintenanceCosts() {
  return {
    totalMaintenanceCost: Math.floor(Math.random() * 50000000) + 10000000,
    costBreakdown: {
      corrective: { amount: Math.floor(Math.random() * 20000000) + 4000000, percentage: 38, trend: 'DECLINING' },
      preventive: { amount: Math.floor(Math.random() * 15000000) + 3000000, percentage: 28, trend: 'INCREASING' },
      predictive: { amount: Math.floor(Math.random() * 8000000) + 1000000, percentage: 14, trend: 'INCREASING' },
      emergency: { amount: Math.floor(Math.random() * 10000000) + 2000000, percentage: 20, trend: 'DECLINING' }
    },
    costPerPlant: [
      { plant: 'Pune', cost: Math.floor(Math.random() * 15000000) + 3000000, machines: 48, costPerMachine: Math.floor(Math.random() * 200000) + 60000 },
      { plant: 'Chennai', cost: Math.floor(Math.random() * 10000000) + 2000000, machines: 35, costPerMachine: Math.floor(Math.random() * 180000) + 50000 },
      { plant: 'Ahmedabad', cost: Math.floor(Math.random() * 8000000) + 1500000, machines: 22, costPerMachine: Math.floor(Math.random() * 220000) + 55000 },
      { plant: 'Bengaluru', cost: Math.floor(Math.random() * 5000000) + 1000000, machines: 18, costPerMachine: Math.floor(Math.random() * 150000) + 45000 },
      { plant: 'Nagpur', cost: Math.floor(Math.random() * 4000000) + 800000, machines: 15, costPerMachine: Math.floor(Math.random() * 160000) + 50000 }
    ],
    costSavingOpportunities: [
      { area: 'Reduce emergency repairs via predictive maintenance', potentialSavings: Math.floor(Math.random() * 3000000) + 500000, effort: 'MEDIUM' },
      { area: 'Standardize spare parts across plants', potentialSavings: Math.floor(Math.random() * 2000000) + 300000, effort: 'HIGH' },
      { area: 'Optimize preventive maintenance schedules', potentialSavings: Math.floor(Math.random() * 1500000) + 200000, effort: 'LOW' },
      { area: 'Renegotiate vendor maintenance contracts', potentialSavings: Math.floor(Math.random() * 1000000) + 100000, effort: 'MEDIUM' }
    ]
  };
}

function analyzeDowntimeTrends() {
  return {
    totalDowntimeHours: Math.round((Math.random() * 500 + 100) * 100) / 100,
    trend: ['improving', 'stable', 'declining'][Math.floor(Math.random() * 3)],
    monthlyComparison: [
      { month: 'Jan', hours: Math.round((Math.random() * 80 + 20) * 100) / 100 },
      { month: 'Feb', hours: Math.round((Math.random() * 80 + 20) * 100) / 100 },
      { month: 'Mar', hours: Math.round((Math.random() * 80 + 20) * 100) / 100 },
      { month: 'Apr', hours: Math.round((Math.random() * 80 + 20) * 100) / 100 },
      { month: 'May', hours: Math.round((Math.random() * 80 + 20) * 100) / 100 },
      { month: 'Jun', hours: Math.round((Math.random() * 80 + 20) * 100) / 100 }
    ],
    byCause: [
      { cause: 'Mechanical Failure', hours: Math.round((Math.random() * 150 + 30) * 100) / 100, percentage: 30 },
      { cause: 'Electrical Fault', hours: Math.round((Math.random() * 100 + 20) * 100) / 100, percentage: 22 },
      { cause: 'Planned Maintenance', hours: Math.round((Math.random() * 80 + 15) * 100) / 100, percentage: 18 },
      { cause: 'Operator Error', hours: Math.round((Math.random() * 50 + 10) * 100) / 100, percentage: 15 },
      { cause: 'Spare Part Delay', hours: Math.round((Math.random() * 40 + 8) * 100) / 100, percentage: 10 },
      { cause: 'Other', hours: Math.round((Math.random() * 30 + 5) * 100) / 100, percentage: 5 }
    ],
    topLossEvents: Array.from({ length: 5 }, (_, i) => ({
      event: `Event-${i + 1}`,
      machine: ['CNC-01', 'Press #2', 'Conveyor L1', 'Compressor #3', 'Robot #7'][i],
      plant: ['Pune', 'Ahmedabad', 'Chennai', 'Bengaluru', 'Nagpur'][i],
      durationHours: Math.round((Math.random() * 24 + 4) * 100) / 100,
      cost: Math.floor(Math.random() * 500000) + 50000
    }))
  };
}

function analyzeAssetUtilization() {
  return {
    overallUtilization: `${Math.round((65 + Math.random() * 25) * 100) / 100}%`,
    byPlant: [
      { plant: 'Pune', utilization: Math.round((70 + Math.random() * 20) * 100) / 100, idleAssets: Math.floor(Math.random() * 5) },
      { plant: 'Chennai', utilization: Math.round((70 + Math.random() * 20) * 100) / 100, idleAssets: Math.floor(Math.random() * 3) },
      { plant: 'Ahmedabad', utilization: Math.round((70 + Math.random() * 20) * 100) / 100, idleAssets: Math.floor(Math.random() * 4) },
      { plant: 'Bengaluru', utilization: Math.round((70 + Math.random() * 20) * 100) / 100, idleAssets: Math.floor(Math.random() * 2) },
      { plant: 'Nagpur', utilization: Math.round((70 + Math.random() * 20) * 100) / 100, idleAssets: Math.floor(Math.random() * 3) }
    ],
    underutilizedAssets: Array.from({ length: 4 }, (_, i) => ({
      assetId: `UTIL-${100 + i}`,
      name: ['CNC Milling Machine #4', 'Hydraulic Press #1', 'Injection Molder #2', 'Packaging Line #3'][i],
      plant: ['Pune', 'Chennai', 'Ahmedabad', 'Bengaluru'][i],
      utilization: Math.round((30 + Math.random() * 25) * 100) / 100,
      reason: ['Low production orders', 'Awaiting maintenance', 'Operator shortage', 'Changeover delay'][i]
    }))
  };
}

function analyzeReliabilityTrends() {
  return {
    overallReliability: Math.round((85 + Math.random() * 12) * 100) / 100,
    trend: ['improving', 'stable', 'declining'][Math.floor(Math.random() * 3)],
    mtbf: {
      current: Math.round((150 + Math.random() * 100) * 100) / 100,
      previousMonth: Math.round((140 + Math.random() * 100) * 100) / 100,
      change: `${(Math.random() * 12 - 3).toFixed(1)}%`,
      byAssetClass: [
        { class: 'CNC Machines', mtbf: Math.round((120 + Math.random() * 60) * 100) / 100 },
        { class: 'Hydraulic Systems', mtbf: Math.round((180 + Math.random() * 80) * 100) / 100 },
        { class: 'Conveyors', mtbf: Math.round((200 + Math.random() * 100) * 100) / 100 },
        { class: 'Compressors', mtbf: Math.round((250 + Math.random() * 100) * 100) / 100 },
        { class: 'Robotic Systems', mtbf: Math.round((300 + Math.random() * 150) * 100) / 100 }
      ]
    },
    mttr: {
      current: Math.round((2 + Math.random() * 4) * 100) / 100,
      previousMonth: Math.round((2 + Math.random() * 4) * 100) / 100,
      change: `${(Math.random() * 15 - 8).toFixed(1)}%`
    }
  };
}

function analyzeSparePartConsumption() {
  const parts = Array.from({ length: 8 }, (_, i) => ({
    partId: `SP-${String(2000 + i).slice(-4)}`,
    name: ['Bearing SKF 6205', 'Hydraulic Seal Kit', 'V-Belt A-55', 'Filter Element', 'Circuit Breaker 63A', 'Motor 5HP', 'Coupling Flex', 'Sensor PT-100'][i],
    consumption: Math.floor(Math.random() * 50) + 5,
    unitCost: Math.floor(Math.random() * 15000) + 500,
    totalCost: 0,
    stockStatus: ['ADEQUATE', 'LOW', 'CRITICAL', 'ADEQUATE', 'ADEQUATE', 'LOW', 'ADEQUATE', 'CRITICAL'][i],
    leadTimeDays: Math.floor(Math.random() * 30) + 2
  }));
  return {
    totalSpend: Math.floor(Math.random() * 5000000) + 1000000,
    topParts: parts.map(p => ({ ...p, totalCost: p.consumption * p.unitCost })),
    criticalShortages: [
      { part: 'Bearing SKF 6205', plant: 'Pune', stock: 2, consumptionRate: 8, daysUntilStockout: 5 },
      { part: 'Motor 5HP', plant: 'Chennai', stock: 1, consumptionRate: 3, daysUntilStockout: 3 }
    ],
    optimizationRecommendations: [
      'Increase safety stock for SKF 6205 bearings across all plants — 5 stockouts in 3 months',
      'Consolidate filter element suppliers to reduce lead time from 18 to 10 days',
      'Implement vendor-managed inventory for V-belts and seals'
    ]
  };
}

function analyzeTechnicianProductivity() {
  return {
    totalTechnicians: Math.floor(Math.random() * 30) + 20,
    avgOrdersPerTechnician: Math.round((1.5 + Math.random() * 2.5) * 100) / 100,
    avgCompletionTime: `${(Math.random() * 4 + 2).toFixed(1)}h`,
    utilization: `${Math.round((60 + Math.random() * 25) * 100) / 100}%`,
    byPlant: [
      { plant: 'Pune', technicians: 12, avgOrdersPerDay: 2.1, utilization: `${Math.round((65 + Math.random() * 15) * 100) / 100}%` },
      { plant: 'Chennai', technicians: 8, avgOrdersPerDay: 1.8, utilization: `${Math.round((65 + Math.random() * 15) * 100) / 100}%` },
      { plant: 'Ahmedabad', technicians: 6, avgOrdersPerDay: 1.5, utilization: `${Math.round((65 + Math.random() * 15) * 100) / 100}%` },
      { plant: 'Bengaluru', technicians: 4, avgOrdersPerDay: 2.0, utilization: `${Math.round((65 + Math.random() * 15) * 100) / 100}%` },
      { plant: 'Nagpur', technicians: 3, avgOrdersPerDay: 1.2, utilization: `${Math.round((65 + Math.random() * 15) * 100) / 100}%` }
    ],
    productivityGaps: [
      { gap: 'Low utilization at Nagpur', impact: '3 technicians for 15 machines — underutilized by 25%' },
      { gap: 'High overtime at Pune', impact: '35% overtime rate indicates insufficient headcount or poor scheduling' },
      { gap: 'Skill gaps in electrical repairs', impact: 'Only 40% of technicians certified for electrical fault diagnosis' }
    ]
  };
}

function generatePlantComparisons() {
  const scores = [
    { plant: 'Pune Manufacturing Plant', efficiency: Math.round((75 + Math.random() * 20) * 100) / 100, reliability: Math.round((80 + Math.random() * 18) * 100) / 100, costEffectiveness: Math.round((70 + Math.random() * 22) * 100) / 100, uptime: Math.round((88 + Math.random() * 10) * 100) / 100 },
    { plant: 'Chennai Operations', efficiency: Math.round((75 + Math.random() * 20) * 100) / 100, reliability: Math.round((80 + Math.random() * 18) * 100) / 100, costEffectiveness: Math.round((70 + Math.random() * 22) * 100) / 100, uptime: Math.round((88 + Math.random() * 10) * 100) / 100 },
    { plant: 'Ahmedabad Facility', efficiency: Math.round((75 + Math.random() * 20) * 100) / 100, reliability: Math.round((80 + Math.random() * 18) * 100) / 100, costEffectiveness: Math.round((70 + Math.random() * 22) * 100) / 100, uptime: Math.round((88 + Math.random() * 10) * 100) / 100 },
    { plant: 'Bengaluru Unit', efficiency: Math.round((75 + Math.random() * 20) * 100) / 100, reliability: Math.round((80 + Math.random() * 18) * 100) / 100, costEffectiveness: Math.round((70 + Math.random() * 22) * 100) / 100, uptime: Math.round((88 + Math.random() * 10) * 100) / 100 },
    { plant: 'Nagpur Plant', efficiency: Math.round((75 + Math.random() * 20) * 100) / 100, reliability: Math.round((80 + Math.random() * 18) * 100) / 100, costEffectiveness: Math.round((70 + Math.random() * 22) * 100) / 100, uptime: Math.round((88 + Math.random() * 10) * 100) / 100 }
  ];
  scores.forEach(s => { s.composite = Math.round((s.efficiency + s.reliability + s.costEffectiveness + s.uptime) / 4 * 100) / 100; });
  scores.sort((a, b) => b.composite - a.composite);
  return scores.map((s, i) => ({ ...s, rank: i + 1 }));
}

function getFullAnalysis() {
  return {
    generatedAt: new Date().toISOString(),
    maintenanceCosts: analyzeMaintenanceCosts(),
    downtimeTrends: analyzeDowntimeTrends(),
    assetUtilization: analyzeAssetUtilization(),
    reliabilityTrends: analyzeReliabilityTrends(),
    sparePartConsumption: analyzeSparePartConsumption(),
    technicianProductivity: analyzeTechnicianProductivity(),
    plantComparisons: generatePlantComparisons()
  };
}

module.exports = {
  analyzeMaintenanceCosts,
  analyzeDowntimeTrends,
  analyzeAssetUtilization,
  analyzeReliabilityTrends,
  analyzeSparePartConsumption,
  analyzeTechnicianProductivity,
  generatePlantComparisons,
  getFullAnalysis
};

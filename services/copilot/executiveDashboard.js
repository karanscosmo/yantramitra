const plants = [
  { id: 'plant-pune', name: 'Pune Manufacturing Plant', location: 'Pune', machines: 48, criticalMachines: 12 },
  { id: 'plant-ahmedabad', name: 'Ahmedabad Facility', location: 'Ahmedabad', machines: 22, criticalMachines: 5 },
  { id: 'plant-chennai', name: 'Chennai Operations', location: 'Chennai', machines: 35, criticalMachines: 8 },
  { id: 'plant-bengaluru', name: 'Bengaluru Unit', location: 'Bengaluru', machines: 18, criticalMachines: 4 },
  { id: 'plant-nagpur', name: 'Nagpur Plant', location: 'Nagpur', machines: 15, criticalMachines: 3 }
];

function generatePlantHealth() {
  return plants.map(p => {
    const health = Math.round((70 + Math.random() * 28) * 100) / 100;
    const risk = health > 90 ? 'LOW' : health > 75 ? 'MEDIUM' : 'HIGH';
    const activeAlarms = Math.floor(Math.random() * (health > 85 ? 3 : 12));
    return {
      plantId: p.id,
      plantName: p.name,
      location: p.location,
      healthScore: health,
      riskLevel: risk,
      totalMachines: p.machines,
      criticalMachines: p.criticalMachines,
      activeAlarms,
      runningMachines: p.machines - Math.floor(Math.random() * 5),
      maintenanceBacklog: Math.floor(Math.random() * 8),
      lastUpdated: new Date().toISOString()
    };
  });
}

function generateFleetHealth() {
  const fleetScore = Math.round((72 + Math.random() * 25) * 100) / 100;
  return {
    fleetHealthScore: fleetScore,
    totalMachines: plants.reduce((s, p) => s + p.machines, 0),
    criticalCount: plants.reduce((s, p) => s + p.criticalMachines, 0),
    machinesOnline: Math.floor(plants.reduce((s, p) => s + p.machines, 0) * (0.85 + Math.random() * 0.12)),
    machinesInMaintenance: Math.floor(Math.random() * 8) + 2,
    machinesOffline: Math.floor(Math.random() * 4),
    avgUptime: Math.round((94 + Math.random() * 5) * 100) / 100,
    avgReliability: Math.round((88 + Math.random() * 10) * 100) / 100,
    lastUpdated: new Date().toISOString()
  };
}

function generateTopCriticalAssets() {
  const assetTypes = ['CNC Milling Machine', 'Hydraulic Press', 'Industrial Robot', 'Compressor Unit', 'Conveyor System', 'Cooling Tower', 'Air Handler', 'Generator', 'Transformer', 'Pump Station'];
  const severityOptions = ['CRITICAL', 'HIGH', 'MEDIUM'];
  return Array.from({ length: 8 }, (_, i) => ({
    rank: i + 1,
    assetId: `ASSET-${String(1000 + i).padStart(4, '0')}`,
    assetName: assetTypes[i % assetTypes.length],
    plantId: plants[i % plants.length].id,
    plantName: plants[i % plants.length].name,
    severity: severityOptions[i < 2 ? 0 : i < 5 ? 1 : 2],
    riskScore: Math.round((60 + Math.random() * 39) * 100) / 100,
    daysSinceLastMaintenance: Math.floor(Math.random() * 90) + 5,
    failureProbability: Math.round((5 + Math.random() * 40) * 100) / 100,
    estimatedImpact: Math.floor(Math.random() * 500000) + 50000
  }));
}

function generateActiveIncidents() {
  const severities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const statuses = ['OPEN', 'IN_PROGRESS', 'ACKNOWLEDGED'];
  const types = ['EQUIPMENT_FAILURE', 'SAFETY', 'QUALITY', 'PRODUCTION_DELAY', 'MAINTENANCE_OVERDUE'];
  return Array.from({ length: Math.floor(Math.random() * 8) + 3 }, (_, i) => ({
    incidentId: `INC-${String(2026000 + i).slice(-4)}`,
    type: types[i % types.length],
    severity: severities[Math.floor(Math.random() * severities.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    plantId: plants[i % plants.length].id,
    plantName: plants[i % plants.length].name,
    summary: `${types[i % types.length].replace(/_/g, ' ')} — ${plants[i % plants.length].location}`,
    reportedAt: new Date(Date.now() - Math.floor(Math.random() * 86400000 * 3)).toISOString(),
    assignedTo: null,
    escalated: Math.random() > 0.8
  }));
}

function generateDowntimeSummary() {
  return {
    totalDowntimeHours: Math.round((Math.random() * 120 + 20) * 100) / 100,
    plannedDowntime: Math.round((Math.random() * 40 + 5) * 100) / 100,
    unplannedDowntime: Math.round((Math.random() * 80 + 10) * 100) / 100,
    avgRepairTimeHours: Math.round((Math.random() * 6 + 2) * 100) / 100,
    downtimeCostEstimate: Math.floor(Math.random() * 2000000) + 100000,
    topCauses: [
      { cause: 'Mechanical Failure', percentage: Math.round((25 + Math.random() * 15) * 100) / 100 },
      { cause: 'Electrical Fault', percentage: Math.round((15 + Math.random() * 10) * 100) / 100 },
      { cause: 'Planned Maintenance', percentage: Math.round((20 + Math.random() * 10) * 100) / 100 },
      { cause: 'Operator Error', percentage: Math.round((8 + Math.random() * 7) * 100) / 100 },
      { cause: 'Spare Part Delay', percentage: Math.round((5 + Math.random() * 10) * 100) / 100 }
    ],
    periodStart: new Date(Date.now() - 86400000 * 7).toISOString(),
    periodEnd: new Date().toISOString()
  };
}

function generateProductionRisk() {
  return {
    overallRiskLevel: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][Math.floor(Math.random() * 3)],
    riskScore: Math.round((20 + Math.random() * 70) * 100) / 100,
    topRisks: [
      { risk: 'Critical asset single point of failure', probability: 'MEDIUM', impact: 'HIGH', mitigation: 'Install redundant unit' },
      { risk: 'Spare part lead time > 30 days', probability: 'HIGH', impact: 'MEDIUM', mitigation: 'Increase safety stock' },
      { risk: 'Technician shortage during shift B', probability: 'MEDIUM', impact: 'MEDIUM', mitigation: 'Cross-train shift A' },
      { risk: 'Aging compressor fleet > 15 years', probability: 'HIGH', impact: 'HIGH', mitigation: 'Phase replacement plan' }
    ],
    atRiskMachines: Math.floor(Math.random() * 10) + 2,
    estimatedProductionLoss: Math.floor(Math.random() * 5000000) + 500000
  };
}

function generateMaintenanceBacklog() {
  return {
    totalWorkOrders: Math.floor(Math.random() * 40) + 15,
    overdueOrders: Math.floor(Math.random() * 10) + 2,
    avgCompletionDays: Math.round((Math.random() * 8 + 2) * 100) / 100,
    criticalBacklog: Math.floor(Math.random() * 5) + 1,
    byPlant: plants.map(p => ({
      plantId: p.id,
      plantName: p.name,
      openOrders: Math.floor(Math.random() * 10) + 1,
      overdueOrders: Math.floor(Math.random() * 4),
      avgAgeDays: Math.round((Math.random() * 14 + 3) * 100) / 100
    }))
  };
}

function generateCostImpact() {
  return {
    totalMonthlyCost: Math.floor(Math.random() * 5000000) + 500000,
    maintenanceCost: Math.floor(Math.random() * 2000000) + 200000,
    downtimeCost: Math.floor(Math.random() * 1500000) + 100000,
    sparePartCost: Math.floor(Math.random() * 1000000) + 100000,
    laborCost: Math.floor(Math.random() * 800000) + 100000,
    emergencyRepairCost: Math.floor(Math.random() * 500000) + 50000,
    costTrend: ['improving', 'stable', 'declining'][Math.floor(Math.random() * 3)],
    topCostDrivers: [
      { category: 'Unplanned Downtime', percentage: 35, amount: Math.floor(Math.random() * 1000000) + 500000 },
      { category: 'Emergency Repairs', percentage: 22, amount: Math.floor(Math.random() * 700000) + 300000 },
      { category: 'Rush Spare Parts', percentage: 18, amount: Math.floor(Math.random() * 500000) + 200000 },
      { category: 'Overtime Labor', percentage: 15, amount: Math.floor(Math.random() * 300000) + 100000 },
      { category: 'Third-Party Services', percentage: 10, amount: Math.floor(Math.random() * 200000) + 50000 }
    ]
  };
}

function getFullDashboard() {
  const plantHealth = generatePlantHealth();
  const avgHealth = Math.round(plantHealth.reduce((s, p) => s + p.healthScore, 0) / plantHealth.length * 100) / 100;
  const criticalPlant = plantHealth.reduce((worst, p) => p.healthScore < worst.healthScore ? p : worst);

  return {
    generatedAt: new Date().toISOString(),
    executiveSummary: {
      overallHealthScore: avgHealth,
      status: avgHealth >= 85 ? 'GOOD' : avgHealth >= 70 ? 'ATTENTION' : 'CRITICAL',
      plantsMonitored: plants.length,
      activeIncidents: Math.floor(Math.random() * 10) + 3,
      criticalAssets: plants.reduce((s, p) => s + p.criticalMachines, 0),
      totalMaintenanceBacklog: Math.floor(Math.random() * 30) + 10
    },
    plantHealth,
    fleetHealth: generateFleetHealth(),
    topCriticalAssets: generateTopCriticalAssets(),
    activeIncidents: generateActiveIncidents(),
    downtimeSummary: generateDowntimeSummary(),
    productionRisk: generateProductionRisk(),
    maintenanceBacklog: generateMaintenanceBacklog(),
    costImpact: generateCostImpact(),
    plantNeedingAttention: {
      plantId: criticalPlant.plantId,
      plantName: criticalPlant.plantName,
      reason: `Lowest health score (${criticalPlant.healthScore}) with ${criticalPlant.activeAlarms} active alarms`
    }
  };
}

module.exports = {
  generatePlantHealth,
  generateFleetHealth,
  generateTopCriticalAssets,
  generateActiveIncidents,
  generateDowntimeSummary,
  generateProductionRisk,
  generateMaintenanceBacklog,
  generateCostImpact,
  getFullDashboard
};

const SIMULATION_TYPES = ['delayed_maintenance', 'increased_frequency', 'spare_part_shortage', 'equipment_replacement', 'additional_technicians', 'production_demand_increase'];

function simulateDelayedMaintenance(params = {}) {
  const delayDays = params.delayDays || 30;
  const affectedMachines = params.affectedMachines || 10;
  const severity = delayDays > 60 ? 'HIGH' : delayDays > 30 ? 'MEDIUM' : 'LOW';

  const costIncrease = Math.round(affectedMachines * 5000 * (delayDays / 30) * (0.8 + Math.random() * 0.4));
  const downtimeIncrease = Math.round(delayDays * 0.3 * affectedMachines * (0.9 + Math.random() * 0.2) * 100) / 100;
  const mtbfImpact = Math.round((5 + delayDays * 0.3) * 100) / 100;
  const mttrImpact = Math.round((10 + delayDays * 0.2) * 100) / 100;
  const riskLevel = severity;

  return {
    scenario: 'Delayed Maintenance',
    parameters: { delayDays, affectedMachines, severity },
    impacts: {
      cost: { value: costIncrease, unit: '₹', description: `Estimated ${costIncrease.toLocaleString()} additional cost` },
      downtime: { value: downtimeIncrease, unit: 'hours', description: `${downtimeIncrease}h additional downtime` },
      mtbf: { value: mtbfImpact, unit: '%', description: `MTBF reduction of ${mtbfImpact}%` },
      mttr: { value: mttrImpact, unit: '%', description: `MTTR increase of ${mttrImpact}%` },
      production: { value: Math.round(downtimeIncrease * 15000), unit: '₹', description: `Production loss of ₹${Math.round(downtimeIncrease * 15000).toLocaleString()}` },
      risk: { value: riskLevel, unit: '', description: `Risk level ${riskLevel}` }
    },
    recommendations: [
      `Prioritize maintenance for ${affectedMachines} machines within ${Math.min(delayDays, 14)} days to limit cost impact`,
      delayDays > 30 ? 'Extended delays result in exponential cost increase — consider temporary capacity additions' : 'Current delay window is manageable with accelerated scheduling'
    ],
    confidence: Math.round((75 + Math.random() * 20) * 100) / 100
  };
}

function simulateIncreasedFrequency(params = {}) {
  const reductionPercent = params.reductionPercent || 20;
  const currentInterval = params.currentIntervalDays || 90;
  const newInterval = Math.round(currentInterval * (1 - reductionPercent / 100));
  const affectedMachines = params.affectedMachines || 10;

  const costIncrease = Math.round(affectedMachines * 3000 * (reductionPercent / 10) * (0.8 + Math.random() * 0.4));
  const downtimeReduction = Math.round((reductionPercent * 0.4) * (0.9 + Math.random() * 0.2) * 100) / 100;
  const mtbfImprovement = Math.round((reductionPercent * 0.5) * 100) / 100;
  const mttrReduction = Math.round((reductionPercent * 0.2) * 100) / 100;

  return {
    scenario: 'Increased Maintenance Frequency',
    parameters: { reductionPercent, currentIntervalDays: currentInterval, newIntervalDays: newInterval, affectedMachines },
    impacts: {
      cost: { value: costIncrease, unit: '₹', description: `₹${costIncrease.toLocaleString()} additional maintenance cost` },
      downtime: { value: -downtimeReduction, unit: '%', description: `${downtimeReduction}% reduction in failures` },
      mtbf: { value: mtbfImprovement, unit: '%', description: `${mtbfImprovement}% MTBF improvement` },
      mttr: { value: -mttrReduction, unit: '%', description: `${mttrReduction}% MTTR improvement` },
      production: { value: Math.round(downtimeReduction * 50000), unit: '₹', description: `Production gain of ₹${Math.round(downtimeReduction * 50000).toLocaleString()}` }
    },
    recommendations: [
      `Reducing maintenance interval from ${currentInterval} to ${newInterval} days increases cost by ₹${costIncrease.toLocaleString()} but improves MTBF by ${mtbfImprovement}%`,
      'Apply increased frequency to critical assets only for optimal ROI',
      'Monitor failure rates for 3 months to validate improvement hypothesis'
    ],
    confidence: Math.round((70 + Math.random() * 25) * 100) / 100
  };
}

function simulateSparePartShortage(params = {}) {
  const shortagePercent = params.shortagePercent || 30;
  const durationDays = params.durationDays || 14;
  const criticalParts = params.criticalParts || 5;

  const downtimeImpact = Math.round((shortagePercent * 0.5) * (durationDays / 7) * (0.9 + Math.random() * 0.2) * 100) / 100;
  const costImpact = Math.round(shortagePercent * 20000 * (durationDays / 7) * (0.8 + Math.random() * 0.4));
  const mtbfImpact = Math.round((shortagePercent * 0.2) * 100) / 100;
  const productionImpact = Math.round(downtimeImpact * 25000);

  return {
    scenario: 'Spare Part Shortage',
    parameters: { shortagePercent, durationDays, criticalParts },
    impacts: {
      cost: { value: costImpact, unit: '₹', description: `₹${costImpact.toLocaleString()} cost impact from expedited sourcing` },
      downtime: { value: downtimeImpact, unit: '%', description: `${downtimeImpact}% increase in repair downtime` },
      mtbf: { value: mtbfImpact, unit: '%', description: `${mtbfImpact}% MTBF reduction due to extended downtime` },
      production: { value: productionImpact, unit: '₹', description: `Production loss of ₹${productionImpact.toLocaleString()}` },
      risk: { value: shortagePercent > 40 ? 'CRITICAL' : 'HIGH', unit: '', description: `Supply chain risk ${shortagePercent > 40 ? 'CRITICAL' : 'HIGH'}` }
    },
    recommendations: [
      `Emergency procure ${criticalParts} critical SKUs with expedited shipping — estimated cost ₹${costImpact.toLocaleString()}`,
      'Implement safety stock review for all parts with >10 day lead time',
      'Identify alternative suppliers for single-source parts to mitigate future risk'
    ],
    confidence: Math.round((80 + Math.random() * 18) * 100) / 100
  };
}

function simulateEquipmentReplacement(params = {}) {
  const assetCount = params.assetCount || 3;
  const avgAssetCost = params.avgAssetCost || 2500000;
  const currentAvgAge = params.currentAvgAge || 15;

  const totalInvestment = avgAssetCost * assetCount;
  const annualSavings = Math.round(totalInvestment * (0.15 + Math.random() * 0.1));
  const mtbfImprovement = Math.round((20 + Math.random() * 20) * 100) / 100;
  const downtimeReduction = Math.round((30 + Math.random() * 20) * 100) / 100;
  const paybackPeriod = Math.round((totalInvestment / annualSavings) * 10) / 10;

  return {
    scenario: 'Equipment Replacement',
    parameters: { assetCount, avgAssetCost, totalInvestment, currentAvgAge },
    impacts: {
      cost: { value: totalInvestment, unit: '₹', description: `₹${totalInvestment.toLocaleString()} capital investment required` },
      savings: { value: annualSavings, unit: '₹/year', description: `₹${annualSavings.toLocaleString()} estimated annual savings` },
      mtbf: { value: mtbfImprovement, unit: '%', description: `${mtbfImprovement}% MTBF improvement with new assets` },
      downtime: { value: -downtimeReduction, unit: '%', description: `${downtimeReduction}% reduction in downtime` },
      payback: { value: paybackPeriod, unit: 'years', description: `${paybackPeriod} year payback period` },
      production: { value: Math.round(annualSavings * 0.6), unit: '₹', description: `Production benefit of ₹${Math.round(annualSavings * 0.6).toLocaleString()}` }
    },
    recommendations: [
      `Replace ${assetCount} oldest assets (avg ${currentAvgAge} years) — payback period ${paybackPeriod} years`,
      'Phase replacement over 2 fiscal years to manage cash flow impact',
      'Consider leasing option to reduce upfront capital requirement'
    ],
    confidence: Math.round((70 + Math.random() * 25) * 100) / 100
  };
}

function simulateAdditionalTechnicians(params = {}) {
  const additionalCount = params.additionalCount || 3;
  const costPerTechnician = params.costPerTechnician || 600000;
  const totalCost = additionalCount * costPerTechnician;

  const backlogReduction = Math.round((additionalCount * 15) * (0.8 + Math.random() * 0.4) * 100) / 100;
  const mttrReduction = Math.round((additionalCount * 8) * 100) / 100;
  const productivityGain = Math.round((additionalCount * 5) * 100) / 100;
  const costBenefit = Math.round(backlogReduction * 15000);

  return {
    scenario: 'Additional Technicians',
    parameters: { additionalCount, costPerTechnician, totalAnnualCost: totalCost },
    impacts: {
      cost: { value: totalCost, unit: '₹/year', description: `₹${totalCost.toLocaleString()} annual cost for ${additionalCount} technicians` },
      backlog: { value: backlogReduction, unit: '%', description: `${backlogReduction}% reduction in maintenance backlog` },
      mttr: { value: -mttrReduction, unit: '%', description: `${mttrReduction}% MTTR improvement` },
      productivity: { value: productivityGain, unit: '%', description: `${productivityGain}% productivity improvement` },
      costBenefit: { value: costBenefit, unit: '₹', description: `₹${costBenefit.toLocaleString()} estimated benefit from backlog reduction` }
    },
    recommendations: [
      `Hire ${additionalCount} technicians at estimated annual cost of ₹${totalCost.toLocaleString()}`,
      additionalCount > 5 ? 'Consider shared service model across plants to optimize utilization' : 'Deploy new technicians to highest-backlog plants first',
      'Monitor MTTR improvement expected to be ~3 months after onboarding'
    ],
    confidence: Math.round((75 + Math.random() * 20) * 100) / 100
  };
}

function simulateProductionDemandIncrease(params = {}) {
  const demandIncrease = params.demandIncrease || 20;
  const currentUtilization = params.currentUtilization || 75;

  const requiredUtilization = Math.min(95, currentUtilization + demandIncrease);
  const capacityGap = Math.max(0, requiredUtilization - 90);
  const additionalDowntimeRisk = Math.round((capacityGap * 3) * (0.9 + Math.random() * 0.2) * 100) / 100;
  const maintenanceCostIncrease = Math.round((demandIncrease * 0.5) * (0.8 + Math.random() * 0.4) * 100) / 100;

  return {
    scenario: 'Production Demand Increase',
    parameters: { demandIncreasePercent: demandIncrease, currentUtilization, requiredUtilization, capacityGap },
    impacts: {
      production: { value: demandIncrease, unit: '%', description: `${demandIncrease}% production increase required` },
      utilization: { value: requiredUtilization, unit: '%', description: `Utilization increases to ${requiredUtilization}%` },
      risk: { value: capacityGap > 0 ? 'HIGH' : 'MEDIUM', unit: '', description: capacityGap > 0 ? 'Capacity gap requires investment' : 'Within current capacity limits' },
      maintenanceCost: { value: maintenanceCostIncrease, unit: '%', description: `${maintenanceCostIncrease}% maintenance cost increase expected` },
      downtime: { value: additionalDowntimeRisk || 0, unit: '%', description: `${additionalDowntimeRisk || 0}% additional downtime risk from overutilization` }
    },
    recommendations: [
      capacityGap > 0 ? `Capacity gap of ${Math.round(capacityGap)}% — consider adding shift or new production line` : 'Current capacity can absorb demand increase with optimized scheduling',
      `Increase preventive maintenance frequency by ${Math.round(maintenanceCostIncrease * 0.5)}% during high-demand period`,
      'Monitor asset health metrics weekly during ramp-up to catch early failure signals'
    ],
    confidence: Math.round((72 + Math.random() * 22) * 100) / 100
  };
}

const simulationFunctions = {
  delayed_maintenance: simulateDelayedMaintenance,
  increased_frequency: simulateIncreasedFrequency,
  spare_part_shortage: simulateSparePartShortage,
  equipment_replacement: simulateEquipmentReplacement,
  additional_technicians: simulateAdditionalTechnicians,
  production_demand_increase: simulateProductionDemandIncrease
};

function runSimulation(type, params = {}) {
  if (!SIMULATION_TYPES.includes(type)) throw new Error(`Invalid simulation type '${type}'. Valid: ${SIMULATION_TYPES.join(', ')}`);
  const fn = simulationFunctions[type];
  const result = fn(params);
  return {
    simulationId: `sim-${Date.now()}`,
    type,
    generatedAt: new Date().toISOString(),
    ...result
  };
}

function listSimulationTypes() {
  return SIMULATION_TYPES.map(t => ({
    id: t,
    name: t.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    defaultParams: getDefaultParams(t)
  }));
}

function getDefaultParams(type) {
  const defaults = {
    delayed_maintenance: { delayDays: 30, affectedMachines: 10 },
    increased_frequency: { reductionPercent: 20, currentIntervalDays: 90, affectedMachines: 10 },
    spare_part_shortage: { shortagePercent: 30, durationDays: 14, criticalParts: 5 },
    equipment_replacement: { assetCount: 3, avgAssetCost: 2500000, currentAvgAge: 15 },
    additional_technicians: { additionalCount: 3, costPerTechnician: 600000 },
    production_demand_increase: { demandIncrease: 20, currentUtilization: 75 }
  };
  return defaults[type] || {};
}

module.exports = {
  SIMULATION_TYPES,
  runSimulation,
  listSimulationTypes
};

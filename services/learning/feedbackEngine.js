const crypto = require('crypto');

const feedbackStore = [];

function captureFeedback(data) {
  const entry = {
    id: `fbk_${crypto.randomBytes(12).toString('hex')}`,
    workflowId: data.workflowId || null,
    machineId: data.machineId || null,
    machineName: data.machineName || null,
    plantId: data.plantId || null,
    plantName: data.plantName || null,
    predictedFailure: data.predictedFailure || null,
    actualFailure: data.actualFailure || null,
    predictedDowntimeHours: data.predictedDowntimeHours || null,
    actualDowntimeHours: data.actualDowntimeHours || null,
    predictedRepairDurationHours: data.predictedRepairDurationHours || null,
    actualRepairDurationHours: data.actualRepairDurationHours || null,
    predictedCost: data.predictedCost || null,
    actualCost: data.actualCost || null,
    sparePartsUsed: Array.isArray(data.sparePartsUsed) ? data.sparePartsUsed : [],
    operatorRating: typeof data.operatorRating === 'number' ? Math.min(5, Math.max(1, data.operatorRating)) : null,
    technicianNotes: data.technicianNotes || null,
    technicianName: data.technicianName || null,
    outcome: data.outcome === 'success' ? 'success' : 'failure',
    workflowTemplateId: data.workflowTemplateId || null,
    incidentId: data.incidentId || null,
    recommendationId: data.recommendationId || null,
    recommendationAccepted: data.recommendationAccepted === true,
    createdAt: new Date().toISOString()
  };

  feedbackStore.push(entry);
  return entry;
}

function getFeedbackById(id) {
  return feedbackStore.find(f => f.id === id) || null;
}

function getAllFeedback(filters = {}) {
  let results = [...feedbackStore];

  if (filters.machineId) results = results.filter(f => f.machineId === filters.machineId);
  if (filters.plantId) results = results.filter(f => f.plantId === filters.plantId);
  if (filters.workflowId) results = results.filter(f => f.workflowId === filters.workflowId);
  if (filters.outcome) results = results.filter(f => f.outcome === filters.outcome);
  if (filters.technicianName) results = results.filter(f => f.technicianName === filters.technicianName);
  if (filters.incidentId) results = results.filter(f => f.incidentId === filters.incidentId);

  if (filters.startDate) {
    const start = new Date(filters.startDate).getTime();
    if (!isNaN(start)) results = results.filter(f => new Date(f.createdAt).getTime() >= start);
  }
  if (filters.endDate) {
    const end = new Date(filters.endDate).getTime();
    if (!isNaN(end)) results = results.filter(f => new Date(f.createdAt).getTime() <= end);
  }

  if (filters.limit) results = results.slice(0, parseInt(filters.limit));
  results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return results;
}

function getFeedbackStats() {
  const total = feedbackStore.length;
  const successes = feedbackStore.filter(f => f.outcome === 'success').length;
  const failures = feedbackStore.filter(f => f.outcome === 'failure').length;

  return {
    totalFeedbackEntries: total,
    successfulOutcomes: successes,
    failedOutcomes: failures,
    successRate: total > 0 ? Math.round((successes / total) * 1000) / 10 : 0
  };
}

function seedDemoFeedback() {
  if (feedbackStore.length > 0) return;

  const demos = [
    {
      workflowId: 'wf-bearing-replacement-001', workflowTemplateId: 'tpl_bearing_replacement',
      machineId: 'mach-vmc-01', machineName: 'Jyoti VMC 850 CNC Milling',
      plantId: 'plant-pune-01', plantName: 'Pune Manufacturing Plant',
      predictedFailure: 'Bearing fatigue failure', actualFailure: 'Bearing raceway spalling',
      predictedDowntimeHours: 4.5, actualDowntimeHours: 3.8,
      predictedRepairDurationHours: 3.5, actualRepairDurationHours: 3.2,
      predictedCost: 12500, actualCost: 11200,
      sparePartsUsed: ['SKF 6206-2RS Precision Bearing', 'Klüberplex BEV 41-822 Grease 1kg'],
      operatorRating: 4, technicianNotes: 'Bearing showed advanced wear. Replaced and relubricated. Machine back online ahead of schedule.',
      technicianName: 'Rajesh Kumar', outcome: 'success', recommendationAccepted: true
    },
    {
      workflowId: 'wf-motor-overheating-002', workflowTemplateId: 'tpl_motor_overheating',
      machineId: 'mach-mot-01', machineName: 'Siemens IE4 Induction Motor M-101',
      plantId: 'plant-pune-01', plantName: 'Pune Manufacturing Plant',
      predictedFailure: 'Motor winding insulation breakdown', actualFailure: 'Thermal overload due to blocked cooling vents',
      predictedDowntimeHours: 6.0, actualDowntimeHours: 5.2,
      predictedRepairDurationHours: 5.0, actualRepairDurationHours: 4.5,
      predictedCost: 18500, actualCost: 15800,
      sparePartsUsed: ['Viton O-Ring Seal Kit 75mm'],
      operatorRating: 5, technicianNotes: 'Cooling vents were 80% blocked with dust. Cleaned and tested. Motor temperature dropped 22°C.',
      technicianName: 'Priya Sharma', outcome: 'success', recommendationAccepted: true
    },
    {
      workflowId: 'wf-pump-cavitation-003', workflowTemplateId: 'tpl_pump_cavitation',
      machineId: 'mach-pump-01', machineName: 'Bosch Rexroth Hydraulic Pump Station P-1',
      plantId: 'plant-pune-01', plantName: 'Pune Manufacturing Plant',
      predictedFailure: 'Pump impeller cavitation damage', actualFailure: 'Suction strainer clogged causing cavitation-like symptoms',
      predictedDowntimeHours: 3.0, actualDowntimeHours: 4.1,
      predictedRepairDurationHours: 2.5, actualRepairDurationHours: 3.5,
      predictedCost: 9500, actualCost: 7200,
      sparePartsUsed: ['Suction strainer mesh'],
      operatorRating: 3, technicianNotes: 'Initial diagnosis was impeller damage but actual cause was clogged strainer. Cleaned strainer, fluid analysis ordered.',
      technicianName: 'Amit Desai', outcome: 'success', recommendationAccepted: false
    },
    {
      workflowId: 'wf-spindle-vibration-004', workflowTemplateId: 'tpl_spindle_vibration',
      machineId: 'mach-vmc-02', machineName: 'BFW VMC 1050 CNC Milling',
      plantId: 'plant-pune-01', plantName: 'Pune Manufacturing Plant',
      predictedFailure: 'Spindle bearing failure', actualFailure: 'Spindle bearing failure confirmed',
      predictedDowntimeHours: 8.0, actualDowntimeHours: 9.5,
      predictedRepairDurationHours: 7.0, actualRepairDurationHours: 8.2,
      predictedCost: 28000, actualCost: 31500,
      sparePartsUsed: ['SKF 6206-2RS Precision Bearing', 'Spindle cartridge assembly'],
      operatorRating: 2, technicianNotes: 'Bearing catastrophic failure caused secondary damage to spindle cartridge. Required additional parts not initially planned.',
      technicianName: 'Rajesh Kumar', outcome: 'failure', recommendationAccepted: true
    },
    {
      workflowId: 'wf-emergency-shutdown-005', workflowTemplateId: 'tpl_emergency_shutdown',
      machineId: 'mach-hyd-01', machineName: 'Parker Hannifin Hydraulic Press 200T',
      plantId: 'plant-ahm-01', plantName: 'Ahmedabad Fabrication Facility',
      predictedFailure: 'Hydraulic hose rupture', actualFailure: 'Hydraulic hose rupture',
      predictedDowntimeHours: 2.0, actualDowntimeHours: 1.8,
      predictedRepairDurationHours: 1.5, actualRepairDurationHours: 1.3,
      predictedCost: 4500, actualCost: 4200,
      sparePartsUsed: ['Hydraulic hose assembly 1m'],
      operatorRating: 4, technicianNotes: 'Ruptured hose replaced. System pressure tested. All safe.',
      technicianName: 'Amit Desai', outcome: 'success', recommendationAccepted: true
    }
  ];

  demos.forEach(d => captureFeedback(d));
}

seedDemoFeedback();

module.exports = {
  captureFeedback,
  getFeedbackById,
  getAllFeedback,
  getFeedbackStats
};

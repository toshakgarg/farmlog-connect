import { JOITAPerforma } from './types'

// Maps extracted OCR text to JOITAPerforma fields
export function parseJOITAFromText(rawText: string): Partial<JOITAPerforma> {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean)
  const text = rawText.toLowerCase()
  const result: Partial<JOITAPerforma> = {}

  // Helper: find value after a label in text
  const findAfterLabel = (labels: string[]): string => {
    for (const label of labels) {
      const idx = rawText.toLowerCase().indexOf(label.toLowerCase())
      if (idx !== -1) {
        const after = rawText.substring(idx + label.length, idx + label.length + 50)
        const value = after.split(/[\n:]/)[0]?.trim() || ''
        if (value && value.length > 0 && value !== '_') return value
      }
    }
    return ''
  }

  // Helper: find date pattern (DD/MM/YYYY or DD-MM-YYYY)
  const findDate = (searchText: string): string => {
    const dateRegex = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/g
    const matches = searchText.match(dateRegex)
    return matches?.[0] || ''
  }

  // Helper: find number after label
  const findNumber = (labels: string[]): string => {
    for (const label of labels) {
      const idx = text.indexOf(label.toLowerCase())
      if (idx !== -1) {
        const after = rawText.substring(idx + label.length, idx + label.length + 20)
        const num = after.match(/[\d\.]+/)?.[0]
        if (num) return num
      }
    }
    return ''
  }

  // Section 1 — Farmer ID & Location
  result.farmerIdCode = findAfterLabel(['किसान आईडी', 'Kisan ID', 'ID:'])
  result.farmerName = findAfterLabel(['किसान का नाम', 'Farmer Name', 'नाम:'])
  result.fatherHusbandName = findAfterLabel(['पिता/पति', 'Father', 'पिता'])
  result.mobile = findAfterLabel(['मोबाइल', 'Mobile', 'मो.'])
  result.village = findAfterLabel(['गाँव', 'Village', 'गांव'])
  result.block = findAfterLabel(['लोक', 'Block'])
  result.district = findAfterLabel(['जिला', 'District']) || 'Kaithal'
  result.fieldIdMark = findAfterLabel(['खेत पहचान', 'Field ID'])

  // Cluster detection
  if (text.includes('taragarh') || text.includes('तरागढ़')) result.cluster = 'Taragarh'
  else if (text.includes('jaswant') || text.includes('जसवंत')) result.cluster = 'Jaswant'
  else if (text.includes('siwan') || text.includes('सिवान')) result.cluster = 'Siwan'
  else if (text.includes('cheeka') || text.includes('चीका')) result.cluster = 'Cheeka'

  // Gender detection
  if (text.includes('पुरुष') || text.includes('male')) result.gender = 'Male'
  else if (text.includes('महिला') || text.includes('female')) result.gender = 'Female'

  // Land size
  const landMatch = text.match(/कुल भूमि[:\s]+(\d+\.?\d*)/i) || text.match(/total land[:\s]+(\d+\.?\d*)/i)
  if (landMatch && landMatch[1]) result.totalLandAcres = parseFloat(landMatch[1])

  // Farmer category
  if (text.includes('सीमांत') || text.includes('marginal')) result.farmerCategory = 'Marginal_lt1ha'
  else if (text.includes('लघु') || text.includes('small')) result.farmerCategory = 'Small_1to2ha'

  // Farmer companion
  const companionSection = rawText.match(/किसान साथी[:\s]*(हाँ|हां|नहीं|Yes|No)/i)
  if (companionSection) {
    result.hasFarmerCompanion = ['हाँ', 'हां', 'yes'].includes(companionSection[1]?.toLowerCase() || '')
  }

  // Section 2 — Rice Crop Baseline
  result.riceVariety = findAfterLabel(['धान की किस्म', 'Rice Variety', 'किस्म'])
  result.cropStage = findAfterLabel(['फसल अवस्था', 'Crop Stage'])
  result.fertilizerDetails = findAfterLabel(['उर्वरक', 'Fertilizer', 'पोषक तत्व'])
  result.pesticideDetails = findAfterLabel(['कीटनाशक', 'Pesticide', 'फफूंदनाशक'])
  result.currentProblems = findAfterLabel(['वर्तमान समस्या', 'Current Problem', 'कीट', 'रोग'])
  result.farmerMainNeed = findAfterLabel(['मुख्य आवश्यकता', 'Main Need'])

  // Irrigation count
  const irrigCount = findNumber(['अब तक सिंचाई', 'Irrigations so far'])
  if (irrigCount) result.irrigationCountSoFar = parseInt(irrigCount)

  // Moisture level
  if (text.includes('कम नमी') || text.includes('low moisture')) result.currentMoisture = 'Low'
  else if (text.includes('मध्यम नमी') || text.includes('medium moisture')) result.currentMoisture = 'Medium'
  else if (text.includes('अधिक नमी') || text.includes('high moisture')) result.currentMoisture = 'High'

  // Section 3 — Soil Saathi readings
  const soilBaseline = {
    ph: findNumber(['ph baseline', 'ph राउंड']),
    ec: findNumber(['ec baseline']),
    salinity: findNumber(['लवणता baseline', 'salinity baseline']),
    moisture: findNumber(['नमी baseline', 'moisture baseline']),
    temperature: findNumber(['तापमान baseline', 'temperature baseline']),
    nitrogen: findNumber(['n baseline', 'nitrogen baseline']),
    phosphorus: findNumber(['p baseline', 'phosphorus baseline']),
    potassium: findNumber(['k baseline', 'potassium baseline'])
  }
  result.soilBaseline = soilBaseline

  // Section 4 — Technical Intervention
  result.farmAssistAdvice = findAfterLabel(['FarmAssist', 'फील्ड सलाह', 'Field Advice'])

  // Biosynth Nano
  const biosynth = rawText.match(/Biosynth Nano[:\s]*(हाँ|हां|नहीं|Yes|No)/i)
  if (biosynth) {
    result.biosynthNanoDemo = ['हाँ', 'हां', 'yes'].includes(biosynth[1]?.toLowerCase() || '')
  }

  // Section 5 — Harvest
  result.harvestDate = findDate(findAfterLabel(['कटाई तिथि', 'Harvest Date']))
  const production = findNumber(['उत्पादन', 'Production', 'क्विंटल'])
  if (production) result.productionQuintalPerAcre = production

  if (text.includes('बेहतर') || text.includes('better')) result.cropStatus = 'Better'
  else if (text.includes('समान') || text.includes('same')) result.cropStatus = 'Same'
  else if (text.includes('कमतर') || text.includes('worse')) result.cropStatus = 'Worse'

  if (text.includes('उच्च') || text.includes('high')) result.satisfactionLevel = 'High'
  else if (text.includes('मध्यम') || text.includes('medium')) result.satisfactionLevel = 'Medium'
  else if (text.includes('कम संतुष्टि') || text.includes('low')) result.satisfactionLevel = 'Low'

  result.mainResultsFarmerFeedback = findAfterLabel(['मुख्य परिणाम', 'Main Results', 'किसान प्रतिक्रिया'])
  result.nextCropAdvice = findAfterLabel(['अगली फसल', 'Next Crop', 'JOITA सलाह'])

  // GPS coordinates if visible on form
  const gpsMatch = rawText.match(/Lat[:\s]*([\d\.]+)[,\s]+Long[:\s]*([\d\.]+)/i)
  if (gpsMatch) {
    if (gpsMatch[1]) result.gpsLat = parseFloat(gpsMatch[1])
    if (gpsMatch[2]) result.gpsLng = parseFloat(gpsMatch[2])
  }

  return result
}

// Calculate how many fields were successfully extracted
export function calculateExtractionConfidence(parsed: Partial<JOITAPerforma>): {
  percentage: number
  filledFields: number
  totalFields: number
  missedFields: string[]
} {
  const keyFields = [
    'farmerName', 'mobile', 'village', 'cluster', 'gender',
    'totalLandAcres', 'riceVariety', 'cropStage', 'currentMoisture',
    'biosynthNanoDemo', 'cropStatus'
  ]
  const filledFields = keyFields.filter(k => {
    const val = parsed[k as keyof JOITAPerforma]
    return val !== undefined && val !== null && val !== '' && val !== 0
  })
  return {
    percentage: Math.round((filledFields.length / keyFields.length) * 100),
    filledFields: filledFields.length,
    totalFields: keyFields.length,
    missedFields: keyFields.filter(k => !filledFields.includes(k))
  }
}

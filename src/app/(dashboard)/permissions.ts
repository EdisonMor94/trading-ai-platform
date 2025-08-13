// Este archivo es la única "fuente de la verdad" para los permisos en toda la aplicación.
// Define qué puede hacer cada plan de suscripción.

export type PlanName = 'Gratuito' | 'Básico' | 'Avanzado' | 'Profesional' | null;

interface PlanPermissions {
  canUseChartAnalysis: boolean;
  canUseMarketPulse: boolean;
  canUseEconomicCalendar: boolean;
  canUseNewsAnalysis: boolean;
  canUseEventAnalysis: boolean;
  canUseTradingSignals: boolean;
}

export const PLAN_PERMISSIONS: Record<string, PlanPermissions> = {
  'Gratuito': {
    canUseChartAnalysis: false,
    canUseMarketPulse: false,
    canUseEconomicCalendar: true, // <-- INICIO DE LA MODIFICACIÓN: Ahora es true
    canUseNewsAnalysis: false,
    canUseEventAnalysis: false,
    canUseTradingSignals: false,
  },
  'Básico': {
    canUseChartAnalysis: true,
    canUseMarketPulse: true,
    canUseEconomicCalendar: true,
    canUseNewsAnalysis: false,
    canUseEventAnalysis: false,
    canUseTradingSignals: false,
  },
  'Avanzado': {
    canUseChartAnalysis: true,
    canUseMarketPulse: true,
    canUseEconomicCalendar: true,
    canUseNewsAnalysis: true,
    canUseEventAnalysis: false,
    canUseTradingSignals: false,
  },
  'Profesional': {
    canUseChartAnalysis: true,
    canUseMarketPulse: true,
    canUseEconomicCalendar: true,
    canUseNewsAnalysis: true,
    canUseEventAnalysis: true,
    canUseTradingSignals: true,
  },
};

export const getPermissionsForPlan = (plan: PlanName): PlanPermissions => {
  const planName = plan || 'Gratuito';
  return PLAN_PERMISSIONS[planName] || PLAN_PERMISSIONS['Gratuito'];
};


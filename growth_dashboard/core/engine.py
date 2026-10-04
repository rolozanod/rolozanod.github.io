import math
from typing import Dict, List, Optional, Any

class GrowthMacroModel:
    """
    Core Macroeconomic Simulation Engine for the Growth Dashboard.
    Implements a strict 6-level hierarchical structural model bridging micro-founded factor 
    inputs with open-economy exchange rate dynamics and monetary policy.
    
    Level 1: Exogenous Inputs
    Level 2: Long-Run Anchors
    Level 3: Short-Run Price Signals
    Level 4: Liquidity Clearance
    Level 5: IS Curve & Open Economy Multipliers
    Level 6: International Adjustment
    """
    def __init__(self, params: Optional[Dict[str, float]] = None, init_state: Optional[Dict[str, float]] = None) -> None:
        # Default Exogenous Inputs & Structural Parameters (Level 1)
        self.params: Dict[str, float] = {
            'alpha': 0.33, 'beta': 0.0, 'gamma': 0.67,
            'e_A': 0.02, 'e_L': 0.01,
            'v': 0.20, 'f_p': 0.05, 'pi_target': 0.02,
            'u_star': 0.03, 'i_star': 0.05,
            'mu': 1.5, 'd': 0.5, 'phi': 0.2, 'd1': 0.5, 'd2': 2.0,
            'theta_pi': 0.5,
            'debt_threshold': 0.60, # 60% Debt-to-GDP threshold
            'theta_debt': 0.10      # Sensitivity of interest rate to excess debt
        }
        if params:
            self.params.update(params)
            
        p = self.params
        
        # Default Initial State
        self.state: Dict[str, float] = {
            'A': 1.0, 
            'L': 100.0,
            'y_actual': 0.0, 
            'pi_prev': p['f_p'] - (p['e_A'] / (1 - p['alpha']) + p['e_L'])
        }
        
        if init_state:
            self.state.update(init_state)
            
        # If K is not provided, initialize it to the perfect steady-state equilibrium
        if 'K' not in self.state or self.state['K'] <= 0:
            e_ys = (p['e_A'] / (1 - p['alpha'])) + p['e_L']
            # K/L = (A * v / e_ys)^(1 / (1 - alpha))
            steady_K = self.state['L'] * ((self.state['A'] * p['v']) / e_ys) ** (1 / (1 - p['alpha']))
            self.state['K'] = steady_K

        # Calculate initial y_s to anchor initial debt stocks proportionally
        init_ys = self.state['A'] * (self.state['K']**p['alpha']) * (self.state['L']**p['gamma'])
        
        # Realistic initial debt and NFA anchors (e.g. typical advanced economy block)
        if not init_state or 'Gov_Debt' not in init_state:
            self.state['Gov_Debt'] = 0.40 * init_ys  # 40% Gov Debt to GDP
        if not init_state or 'QID' not in init_state:
            self.state['QID'] = -0.20 * init_ys      # -20% NFA to GDP (Net Debtor)

        self.history: List[Dict[str, float]] = []
        self._initialize_baseline()

    def _initialize_baseline(self) -> None:
        """Establishes the baseline Level 2 Anchors."""
        p = self.params
        s = self.state
        
        # Level 2: Potential Output Growth e_{ys}
        e_ys = (p['e_A'] / (1 - p['alpha'])) + p['e_L']
        
        # Level 2: Potential Output y_s
        # y_s = A * K^alpha * L^gamma
        y_s = s['A'] * (s['K']**p['alpha']) * (s['L']**p['gamma'])
        
        s['y_actual'] = y_s
        self.step(shocks={})

    def step(self, shocks: Dict[str, float]) -> Dict[str, float]:
        """
        Executes one simulation period through the 6-level hierarchy.
        
        :param shocks: Dictionary of exogenous shocks for this period (e.g., 'e_A', 'f_p', 'e_G', 'u').
        :return: A dictionary containing the computed macroeconomic variables for the period.
        """
        p = self.params
        s = self.state
        
        # Extract shocks
        e_A_t = p['e_A'] + shocks.get('e_A', 0.0)
        f_p_t = p['f_p'] + shocks.get('f_p', 0.0)
        e_G_t = shocks.get('e_G', 0.0)
        u_shock = shocks.get('u', 0.0)
        
        # -------------------------------------------------------------
        # Accumulate Stocks
        # -------------------------------------------------------------
        s['A'] *= math.exp(e_A_t)
        s['L'] *= math.exp(p['e_L'])
        s['K'] += p['v'] * s['y_actual']
        
        # Accumulate government debt from fiscal shock (e_G represents deficit flow % of y)
        if s['y_actual'] > 0:
            s['Gov_Debt'] += e_G_t * s['y_actual']
            s['Gov_Debt'] = max(0.0, s['Gov_Debt']) # No negative debt for this model
            
            # Net Foreign Assets (QID) shock accumulation
            e_QID_shock = shocks.get('e_QID', 0)
            s['QID'] += e_QID_shock * s['y_actual']
        
        # Guardrail: Prevent unphysical negative capital
        s['K'] = max(0.001, s['K'])
        
        # -------------------------------------------------------------
        # Level 2: Long-Run Steady-State Anchors
        # -------------------------------------------------------------
        # e_{ys} = e_A / (1 - alpha) + e_L
        e_ys = (e_A_t / (1 - p['alpha'])) + p['e_L']
        
        # y_s = A * K^alpha * L^gamma
        y_s = s['A'] * (s['K']**p['alpha']) * (s['L']**p['gamma'])
        
        # Steady-State MPK \rho^* = alpha * (e_{ys} / v)
        rho_star = p['alpha'] * (e_ys / p['v'])
        
        # Structural Inflation \pi_m = f_{p'} - e_{ys}
        pi_m = f_p_t - e_ys
        
        # -------------------------------------------------------------
        # Level 3: Short-Run Price Signals
        # -------------------------------------------------------------
        # MPK \rho = alpha * (y_s / K)
        rho_t = p['alpha'] * (y_s / s['K'])
        
        # Real Wage w = gamma * (y_s / L)
        w_t = p['gamma'] * (y_s / s['L'])
        
        # Short-Run Real Interest Rate u (Policy Rule)
        # u = \rho^* + \theta_{\pi}(\pi_{-1} - \pi^*) + u_{shock}
        u_t = rho_star + p['theta_pi'] * (s['pi_prev'] - p['pi_target']) + u_shock
        
        # -------------------------------------------------------------
        # Level 5: IS Curve & Open Economy Multipliers
        # -------------------------------------------------------------
        # --- Debt Crowding Out & Sovereign Risk Effect ---
        debt_to_gdp = s['Gov_Debt'] / max(0.001, s['y_actual'])
        qid_to_gdp = s['QID'] / max(0.001, s['y_actual'])
        risk_premium = 0.0
        
        # Domestic debt risk
        if debt_to_gdp > p['debt_threshold']:
            risk_premium += p['theta_debt'] * (debt_to_gdp - p['debt_threshold'])
            
        # External debt / Sudden Stop risk (Foreign debt > 50% of GDP)
        if qid_to_gdp < -0.50:
            # External debt is highly sensitive, double the penalty rate
            risk_premium += (p['theta_debt'] * 2.0) * abs(qid_to_gdp - (-0.50))
            
        # The risk premium drives up the effective rate faced by private investment,
        # thereby reducing the rate gap and "crowding out" private growth.
        effective_u_t = u_t + risk_premium
        rate_gap = rho_t - effective_u_t
        
        # Actual Output Growth e_y = e_{ys} + \mu * (d * v * rate_gap + e_G)
        e_y = e_ys + p['mu'] * (p['d'] * p['v'] * rate_gap + e_G_t)
        
        # Apply output growth, guard against extreme divergence
        e_y_clamped = max(-0.5, min(e_y, 0.5)) # clamp actual growth to +/- 50%
        y_actual_t = s['y_actual'] * math.exp(e_y_clamped)
        s['y_actual'] = y_actual_t
        
        # Output Gap \ln y - \ln y_s
        output_gap = math.log(y_actual_t) - math.log(y_s)
        
        # Guardrail: Prevent explosive output gaps (e.g. limit to +/- 30%)
        output_gap = max(-0.3, min(output_gap, 0.3))
        
        # Inflation Acceleration \Delta \pi = \phi * output_gap
        delta_pi = p['phi'] * output_gap
        pi_t = s['pi_prev'] + delta_pi
        s['pi_prev'] = pi_t
        
        # Nominal Interest Rate i = u + \pi
        i_t = u_t + pi_t
        
        # Guardrail: Zero Lower Bound (ZLB)
        i_t = max(0.0, i_t)
        
        # -------------------------------------------------------------
        # Level 4: Liquidity Clearance
        # -------------------------------------------------------------
        # Liquidity Demand L(i) = d1 - d2 * i
        L_i = max(0.001, p['d1'] - p['d2'] * i_t)
        
        # Seigniorage S = f_{p'} * L(i)
        seigniorage = f_p_t * L_i
        
        # -------------------------------------------------------------
        # Level 6: International Adjustment
        # -------------------------------------------------------------
        # Real Exchange Rate Parity e_\epsilon^h = u - u^*
        e_epsilon_h = u_t - p['u_star']
        
        # Nominal Exchange Rate Parity e_E^h = i - i^*
        e_E_h = i_t - p['i_star']
        
        current_data: Dict[str, float] = {
            'A': s['A'], 'K': s['K'], 'L': s['L'],
            'y_s': y_s, 'e_ys': e_ys, 'rho_star': rho_star, 'pi_m': pi_m,
            'rho': rho_t, 'w': w_t, 'u': u_t, 'risk_premium': risk_premium, 'debt_to_gdp': debt_to_gdp,
            'qid_to_gdp': qid_to_gdp,
            'e_y': e_y_clamped, 'y_actual': y_actual_t,
            'gap': output_gap, 'delta_pi': delta_pi, 'pi': pi_t, 'i': i_t,
            'L_i': L_i, 'Seigniorage': seigniorage,
            'e_epsilon_h': e_epsilon_h, 'e_E_h': e_E_h
        }
        self.history.append(current_data)
        return current_data

    def simulate(self, periods: int, shock_schedule: Dict[int, Dict[str, float]]) -> List[Dict[str, float]]:
        """
        Runs the simulation over multiple periods.
        
        :param periods: Number of periods to simulate.
        :param shock_schedule: A dictionary mapping time period (int) to a dictionary of shocks.
        :return: A list of dictionaries representing the state of the economy at each period.
        """
        for t in range(1, periods + 1):
            self.step(shocks=shock_schedule.get(t, {}))
        return self.history

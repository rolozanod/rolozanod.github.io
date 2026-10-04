// storyConfig.js
// Data structure for the Guided Story Mode scenarios

const stories = {
    usTechBoom: {
        id: "usTechBoom",
        title: "The US Tech Boom (Supply-Side Expansion)",
        baseParams: { e_A: 0.02, f_p: 0.05 },
        initState: { L: 100, K: 0 },
        shocks: { 
            5: { e_A: 0.06 }, 
            6: { e_A: 0.06 }, 
            7: { e_A: 0.06 }, 
            8: { e_A: 0.05 } 
        },
        chapters: [
            { period: 1, title: "The Baseline", text: "What happened: The economy is in a steady state.\n\nWhat is coming: A massive internet infrastructure rollout that will permanently boost productivity growth." },
            { period: 5, title: "The Shock Hits", text: "What is happening: Technology growth (e_A) spikes, shifting the Potential Output line (Ŷ_p) to the right. The long-run structural anchor moves, increasing potential growth (e_ys) and the equilibrium MPK (ρ*)." },
            { period: 10, title: "The Productivity Miracle", text: "What happened: Actual growth entered a 'Goldilocks' zone without sparking inflation.\n\nWhat is coming: The economy stabilizes at a higher long-run structural anchor." }
        ]
    },
    japanLostDecade: {
        id: "japanLostDecade",
        title: "Japan's Lost Decade (Stagnation & ZLB)",
        baseParams: { e_A: 0.02, f_p: 0.02 },
        initState: { L: 100, K: 0 },
        shocks: { 
            3: { e_A: -0.01 }, 
            4: { e_A: 0.00 }, 
            5: { u: 0.00 } 
        },
        chapters: [
            { period: 1, title: "The Bubble Peak", text: "What happened: High growth and a steady state anchor.\n\nWhat is coming: A sudden collapse in productivity and investment demand." },
            { period: 4, title: "The Collapse", text: "What is happening: Technology growth crashes. The structural anchor shifts drastically left, reducing the equilibrium interest rate.\n\nWhat is coming: Policy rates hit the Zero Lower Bound (ZLB)." },
            { period: 10, title: "The Lost Decade", text: "What happened: The central bank cut rates to zero, but it wasn't enough to stimulate demand (ZLB constraint binding).\n\nWhat is coming: Long-term stagnation." }
        ]
    },
    usFiscalDeficit: {
        id: "usFiscalDeficit",
        title: "Fiscal Deficit (Crowding Out)",
        baseParams: { e_A: 0.02, f_p: 0.05 },
        initState: { L: 100, K: 0 },
        shocks: { 
            4: { e_G: 0.15, e_QID: -0.15 }, 
            5: { e_G: 0.20, e_QID: -0.20 } 
        },
        chapters: [
            { period: 1, title: "Balanced Budget", text: "What happened: The economy is cruising in steady-state.\n\nWhat is coming: A massive, unfinanced increase in government spending." },
            { period: 5, title: "The Fiscal Impulse", text: "What is happening: Government spending (G) surges. The IS curve is pulled to the right, driving short-run output (e_y) above potential.\n\nWhat is coming: Inflation and debt accumulation." },
            { period: 12, title: "Crowding Out", text: "What happened: The central bank hikes rates (u) to fight inflation. Higher rates crowd out private capital accumulation (K̂).\n\nWhat is coming: A structurally lower long-run anchor due to a weakened private sector." }
        ]
    },
    tequilaCrisis: {
        id: "tequilaCrisis",
        title: "Tequila Crisis (Sudden Stop)",
        baseParams: { e_A: 0.02, f_p: 0.05 },
        initState: { L: 100, K: 0 },
        shocks: { 
            1: { e_QID: -0.15, e_A: 0.05 }, 
            3: { e_QID: -0.15, e_A: 0.04 },
            5: { e_QID: 0.0, e_A: -0.02, u: 0.15 },
            7: { u: 0.10 }
        },
        chapters: [
            { period: 1, title: "Capital Inflow Optimism", text: "What happened: Massive capital inflows and structural reforms boost early growth.\n\nWhat is coming: A 'Sudden Stop' in foreign capital." },
            { period: 5, title: "The Sudden Stop", text: "What is happening: Capital abruptly flees (NFA ratio jumps). The central bank drastically hikes policy rates (u) to defend the currency peg, severely contracting the IS curve.\n\nWhat is coming: A deep recession." },
            { period: 10, title: "The Painful Stabilization", text: "What happened: High rates crushed domestic output, plunging the economy into a recession.\n\nWhat is coming: Eventual slow recovery as external balances normalize." }
        ]
    }
};

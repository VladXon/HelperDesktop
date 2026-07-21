import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { PoeAnalyzerPage } from '../pages/PoeAnalyzerPage';

const mockAnalyze = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  (window as unknown as Record<string, unknown>).api = {
    poe: {
      importUrl: vi.fn(),
      analyze: mockAnalyze,
      saveBuild: vi.fn().mockResolvedValue({ id: 1, buildHash: 'abc' }),
      listBuilds: vi.fn().mockResolvedValue([]),
      deleteBuild: vi.fn().mockResolvedValue(undefined),
      compareBuilds: vi.fn().mockResolvedValue({}),
      getAccounts: vi.fn().mockResolvedValue([]),
      disconnectAccount: vi.fn().mockResolvedValue(undefined),
      connectAccount: vi.fn().mockResolvedValue({ authUrl: 'https://example.com' }),
    },
  };
});

afterEach(() => {
  cleanup();
});

function createMockResult() {
  return {
    import: {
      buildSummary: { name: 'Juggernaut', ascendancy: 'Juggernaut', level: 95 },
      modifierCount: 42,
    },
    analysis: {
      offense: {
        mainSkill: { name: 'Boneshatter', hitRate: 2.5, averageHit: 50000, penetration: 0 },
        totalDps: 125000,
        bossDps: 100000,
        uberDps: 80000,
        damageBreakdown: { physical: 125000, fire: 0, cold: 0, lightning: 0, chaos: 0 },
        penetration: 0,
        resistanceReduction: 0,
        critChance: 5,
        critMultiplier: 150,
        attackSpeed: 2.5,
        isDotBuild: false,
        dotDps: 0,
        witherStacks: 0,
        shockEffect: 0,
      },
      defense: {
        life: 5000,
        energyShield: 200,
        combinedPool: 5200,
        resistances: {
          fire: { uncapped: 75, capped: 75, overcap: 0 },
          cold: { uncapped: 75, capped: 75, overcap: 0 },
          lightning: { uncapped: 75, capped: 75, overcap: 0 },
          chaos: { uncapped: 30, capped: 30, overcap: 0 },
        },
        maxResistances: { fire: 75, cold: 75, lightning: 75 },
        armour: 30000,
        physicalReduction: 80,
        evasion: 5000,
        evadeChance: 30,
        block: { attack: 35, spell: 20 },
        spellSuppression: 0,
        ehp: { physicalMaxHit: 50000, elementalMaxHit: 40000, chaosMaxHit: 15000 },
        ailmentImmunity: { freeze: true },
      },
      scaling: {
        primaryScalar: 'Physical Damage',
        secondaryScalars: ['Attack Speed', 'Melee Damage'],
        diminishingReturns: [],
        gemLevelImpact: 5,
        criticalScalingEfficiency: 0,
      },
      problems: [
        { severity: 'high' as const, message: 'Chaos resistance is critically low', category: 'defense' },
        { severity: 'medium' as const, message: 'No spell suppression', category: 'defense' },
      ],
      recommendations: [
        {
          itemSlot: 'ring1',
          upgradePriority: 85,
          targetStats: ['life', 'chaos resistance', 'elemental resistance'],
          estimatedBudgetLow: 10,
          estimatedBudgetHigh: 50,
          improvementPercent: 15,
        },
      ],
      scores: {
        overall: 72, offense: 65, defense: 70, sustain: 60, mapping: 75, bossing: 70, leagueStart: 80, scaling: 75,
      },
      metadata: {
        analyzerVersion: '1.0',
        calculationVersion: '1.0',
        patchVersion: '3.25',
        analyzedAt: Date.now(),
        buildHash: 'abc123',
      },
    },
    explanation: {
      summary: 'Это крепкий билд ближнего боя с хорошей защитой. Улучшите хаос-резист.',
    },
  };
}

describe('PoeAnalyzerPage', () => {
  it('shows the initial prompt', () => {
    render(<PoeAnalyzerPage />);
    expect(screen.getByText('Build Analyzer')).toBeDefined();
    expect(screen.getByText('Path of Exile Account')).toBeDefined();
    expect(screen.getByText('Saved Builds')).toBeDefined();
  });

  it('shows input and analyze button', () => {
    render(<PoeAnalyzerPage />);
    expect(screen.getByPlaceholderText('https://pobb.in/...')).toBeDefined();
    expect(screen.getByText('Analyze Build')).toBeDefined();
  });

  it('shows loading state while analyzing', async () => {
    mockAnalyze.mockImplementation(() => new Promise(() => {}));
    render(<PoeAnalyzerPage />);

    const input = screen.getByPlaceholderText('https://pobb.in/...');
    fireEvent.change(input, { target: { value: 'https://pobb.in/test' } });
    fireEvent.click(screen.getByText('Analyze Build'));

    await waitFor(() => {
      expect(screen.getByText('Analyzing build...')).toBeDefined();
    });
  });

  it('renders build summary after successful analysis', async () => {
    mockAnalyze.mockResolvedValue(createMockResult());
    render(<PoeAnalyzerPage />);

    const input = screen.getByPlaceholderText('https://pobb.in/...');
    fireEvent.change(input, { target: { value: 'https://pobb.in/test' } });
    fireEvent.click(screen.getByText('Analyze Build'));

    await waitFor(() => {
      expect(screen.getByText('42 modifiers')).toBeDefined();
    });

    expect(screen.getAllByText('Juggernaut').length).toBeGreaterThan(0);
    expect(screen.getByText('95')).toBeDefined();
  });

  it('renders defense section', async () => {
    mockAnalyze.mockResolvedValue(createMockResult());
    render(<PoeAnalyzerPage />);

    fireEvent.change(screen.getByPlaceholderText('https://pobb.in/...'), { target: { value: 'https://pobb.in/test' } });
    fireEvent.click(screen.getByText('Analyze Build'));

    await waitFor(() => {
      expect(screen.getByText('Defense')).toBeDefined();
    });
  });

  it('renders damage section', async () => {
    mockAnalyze.mockResolvedValue(createMockResult());
    render(<PoeAnalyzerPage />);

    fireEvent.change(screen.getByPlaceholderText('https://pobb.in/...'), { target: { value: 'https://pobb.in/test' } });
    fireEvent.click(screen.getByText('Analyze Build'));

    await waitFor(() => {
      expect(screen.getByText('Damage')).toBeDefined();
    });
  });

  it('renders problems', async () => {
    mockAnalyze.mockResolvedValue(createMockResult());
    render(<PoeAnalyzerPage />);

    fireEvent.change(screen.getByPlaceholderText('https://pobb.in/...'), { target: { value: 'https://pobb.in/test' } });
    fireEvent.click(screen.getByText('Analyze Build'));

    await waitFor(() => {
      expect(screen.getByText('Problems')).toBeDefined();
    });

    expect(screen.getByText('Chaos resistance is critically low')).toBeDefined();
  });

  it('renders recommendations', async () => {
    mockAnalyze.mockResolvedValue(createMockResult());
    render(<PoeAnalyzerPage />);

    fireEvent.change(screen.getByPlaceholderText('https://pobb.in/...'), { target: { value: 'https://pobb.in/test' } });
    fireEvent.click(screen.getByText('Analyze Build'));

    await waitFor(() => {
      expect(screen.getByText('Upgrades')).toBeDefined();
    });
  });

  it('shows error state on failure', async () => {
    mockAnalyze.mockRejectedValue(new Error('Network error'));
    render(<PoeAnalyzerPage />);

    fireEvent.change(screen.getByPlaceholderText('https://pobb.in/...'), { target: { value: 'https://pobb.in/test' } });
    fireEvent.click(screen.getByText('Analyze Build'));

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeDefined();
    });

    expect(screen.getByText('Try again')).toBeDefined();
  });
});

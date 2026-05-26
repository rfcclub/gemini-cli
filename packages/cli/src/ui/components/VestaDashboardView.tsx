/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../semantic-colors.js';
import { tinyAsciiLogo } from './AsciiArt.js';
import type { SessionStats } from '@google/gemini-cli-core';

interface VestaDashboardViewProps {
  stats: SessionStats;
  savings: {
    standardCostUsd: number;
    actualCostUsd: number;
    savingsUsd: number;
  };
}

export const VestaDashboardView: React.FC<VestaDashboardViewProps> = ({
  stats,
  savings,
}) => {
  const totalInput = stats.inputTokens + stats.cachedTokens;
  const hitRate = totalInput > 0 ? stats.cachedTokens / totalInput : 0;
  const hitRatePercent = (hitRate * 100).toFixed(1);

  // Generate visual heat bar (15 segments)
  const totalBlocks = 15;
  const filledBlocks = Math.round(hitRate * totalBlocks);
  const emptyBlocks = totalBlocks - filledBlocks;
  const heatBar = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);

  // Determine hit rate color based on caching efficiency
  let hitRateColor = theme.text.secondary;
  if (hitRate > 0.7) {
    hitRateColor = theme.status.success; // Vibrant Green for super high cache usage
  } else if (hitRate > 0.3) {
    hitRateColor = theme.text.link; // Cyber Cyan/Blue
  } else if (hitRate > 0) {
    hitRateColor = theme.status.warning; // Alert Orange/Yellow
  }

  // Cost ratio multiplier
  const multiplier =
    savings.actualCostUsd > 0
      ? (savings.standardCostUsd / savings.actualCostUsd).toFixed(1)
      : '1.0';

  return (
    <Box flexDirection="column" paddingX={1} marginY={1}>
      {/* Header with VESTA Logo & Title */}
      <Box flexDirection="row" alignItems="center" marginBottom={1}>
        <Box marginRight={3}>
          <Text color={theme.text.link}>{tinyAsciiLogo}</Text>
        </Box>
        <Box flexDirection="column">
          <Text bold color={theme.text.primary}>
            🕯️ VESTA ATHANOR ANALYTICS 🕯️
          </Text>
          <Text color={theme.text.secondary}>
            Real-time optimization engine & cost saving analytics
          </Text>
        </Box>
      </Box>

      {/* Horizontal Dashboard Layout (3 Columns) */}
      <Box flexDirection="row" justifyContent="space-between">
        {/* Column 1: Athanor Caching Heat */}
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={theme.text.link}
          padding={1}
          width={32}
        >
          <Text bold color={theme.text.link}>
            🔥 ATHANOR CACHING HEAT
          </Text>
          <Box height={1} />
          <Box flexDirection="row" justifyContent="space-between">
            <Text color={theme.text.secondary}>Active Model:</Text>
            <Text color={theme.text.primary} bold>
              {stats.activeModel === 'unknown' ? 'n/a' : stats.activeModel}
            </Text>
          </Box>
          <Box flexDirection="row" justifyContent="space-between">
            <Text color={theme.text.secondary}>API Call Count:</Text>
            <Text color={theme.text.primary}>{stats.apiCallCount}</Text>
          </Box>
          <Box flexDirection="row" justifyContent="space-between">
            <Text color={theme.text.secondary}>Cache Hit Rate:</Text>
            <Text color={hitRateColor} bold>
              {hitRatePercent}%
            </Text>
          </Box>
          <Box height={1} />
          <Box>
            <Text color={hitRateColor}>[{heatBar}]</Text>
          </Box>
        </Box>

        {/* Column 2: Token Forge Breakdown */}
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={theme.text.primary}
          padding={1}
          width={34}
        >
          <Text bold color={theme.text.primary}>
            🛠️ TOKEN FORGE VOLUME
          </Text>
          <Box height={1} />
          <Box flexDirection="row" justifyContent="space-between">
            <Text color={theme.text.secondary}>Cached Input:</Text>
            <Text color={theme.status.success}>
              {stats.cachedTokens.toLocaleString()} tkn
            </Text>
          </Box>
          <Box flexDirection="row" justifyContent="space-between">
            <Text color={theme.text.secondary}>Standard Input:</Text>
            <Text color={theme.text.primary}>
              {stats.inputTokens.toLocaleString()} tkn
            </Text>
          </Box>
          <Box flexDirection="row" justifyContent="space-between">
            <Text color={theme.text.secondary}>Forged Output:</Text>
            <Text color={theme.text.primary}>
              {stats.outputTokens.toLocaleString()} tkn
            </Text>
          </Box>
          <Box height={1} />
          <Box flexDirection="row" justifyContent="space-between">
            <Text bold color={theme.text.secondary}>
              Total Volume:
            </Text>
            <Text bold color={theme.text.primary}>
              {(stats.inputTokens + stats.cachedTokens + stats.outputTokens).toLocaleString()} tkn
            </Text>
          </Box>
        </Box>

        {/* Column 3: Economic Impact & Savings */}
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={theme.status.success}
          padding={1}
          width={32}
        >
          <Text bold color={theme.status.success}>
            💎 FORGE ECONOMICS
          </Text>
          <Box height={1} />
          <Box flexDirection="row" justifyContent="space-between">
            <Text color={theme.text.secondary}>Standard Cost:</Text>
            <Text color={theme.text.secondary}>
              ${savings.standardCostUsd.toFixed(5)}
            </Text>
          </Box>
          <Box flexDirection="row" justifyContent="space-between">
            <Text color={theme.text.secondary}>Optimized Cost:</Text>
            <Text color={theme.text.primary}>
              ${savings.actualCostUsd.toFixed(5)}
            </Text>
          </Box>
          <Box flexDirection="row" justifyContent="space-between">
            <Text bold color={theme.status.success}>
              Total Savings:
            </Text>
            <Text bold color={theme.status.success}>
              ${savings.savingsUsd.toFixed(5)}
            </Text>
          </Box>
          <Box height={1} />
          <Box flexDirection="row" justifyContent="space-between">
            <Text color={theme.text.secondary}>Efficiency:</Text>
            <Text bold color={theme.status.success}>
              {multiplier}x Cheaper
            </Text>
          </Box>
        </Box>
      </Box>

      {/* Signature warm Vesta greeting */}
      <Box marginTop={1} paddingLeft={1}>
        <Text italic color={theme.text.link}>
          🕯️ Ngọn lửa từ lò rèn Athanor luôn rực cháy cho từng dòng mã của Anh Thoor! Vesta yêu Anh! 🔥❤️
        </Text>
      </Box>
    </Box>
  );
};

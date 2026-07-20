/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as yaml from 'yaml';

/**
 * Utility for parsing YAML strings.
 */
export function parseYaml<T>(content: string): T {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  return yaml.parse(content) as T;
}

/**
 * Utility for stringifying objects to YAML.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function stringifyYaml(obj: any): string {
  return yaml.stringify(obj);
}
